/* Shared behavior for game-UI themed pages: scroll reveals, expandable cards,
   and typewriter text. Page-agnostic — it only looks for dr-* hooks, so any
   converted page picks it up by linking this file. */

(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- Scroll reveal ---- */
    function initReveals() {
        const targets = document.querySelectorAll('.dr-reveal');
        if (!targets.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            targets.forEach(el => el.classList.add('dr-in'));
            return;
        }

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const delay = parseInt(el.dataset.drDelay || '0', 10);
                setTimeout(() => el.classList.add('dr-in'), delay);
                io.unobserve(el);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        targets.forEach(el => io.observe(el));
    }

    /* ---- Expandable cards ---- */
    function initCards() {
        document.querySelectorAll('.dr-card-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!open));
            });
        });
    }

    /* ---- Typewriter ----
       Each character becomes a span that still holds the real character, so
       textContent, text selection, find-in-page and screen readers all behave
       exactly as they did before. Injecting characters into an empty node
       would break all four. */
    const CHARS_PER_SEC = 380;

    function splitIntoChars(el) {
        const frag = document.createDocumentFragment();
        for (const ch of el.textContent) {
            const span = document.createElement('span');
            span.className = 'dr-ch';
            span.textContent = ch;
            frag.appendChild(span);
        }
        el.textContent = '';
        el.appendChild(frag);
    }

    function initTypewriter() {
        const boxes = document.querySelectorAll('.dr-typewriter');
        if (!boxes.length) return;

        boxes.forEach(box => {
            const skip = box.querySelector('.dr-skip');
            const lines = box.querySelectorAll('.dr-text');
            if (!lines.length || reduceMotion) return;

            lines.forEach(splitIntoChars);
            const chars = box.querySelectorAll('.dr-ch');
            box.classList.add('dr-tw-active');

            let running = false;
            let done = false;

            const finish = () => {
                done = true;
                running = false;
                box.classList.remove('dr-tw-active');
                if (skip) skip.hidden = true;
            };

            const run = () => {
                if (running || done) return;
                running = true;
                if (skip) skip.hidden = false;

                const start = performance.now();
                let shown = 0;

                const tick = (now) => {
                    if (!running) return;
                    const target = Math.min(
                        Math.floor(((now - start) / 1000) * CHARS_PER_SEC),
                        chars.length
                    );
                    for (; shown < target; shown++) chars[shown].classList.add('dr-on');
                    if (shown < chars.length) requestAnimationFrame(tick);
                    else finish();
                };
                requestAnimationFrame(tick);
            };

            if (skip) skip.addEventListener('click', finish);

            if ('IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (!entry.isIntersecting) return;
                        io.unobserve(entry.target);
                        run();
                    });
                }, { threshold: 0.2 });
                io.observe(box);
            } else {
                run();
            }
        });
    }


    /* ---- Page transition ----
       Intercept same-site navigations so the cover animation can play before
       the browser leaves. Anything we can't animate cleanly (new tab, download,
       mailto/tel, external host, in-page anchor, modifier-click) is left alone
       so normal browser behavior wins. */
    const LEAVE_MS = 330;

    function shouldIntercept(link, event) {
        if (event.defaultPrevented) return false;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        if (link.target && link.target !== '_self') return false;
        if (link.hasAttribute('download')) return false;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return false;

        const url = new URL(link.href, location.href);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        if (url.origin !== location.origin) return false;
        // Same page, different hash only — let the browser scroll.
        if (url.pathname === location.pathname && url.hash) return false;

        return true;
    }

    function initTransitions() {
        if (reduceMotion) return;
        if (!document.querySelector('.dr-transition')) return;

        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (!link || !shouldIntercept(link, event)) return;

            event.preventDefault();
            const dest = link.href;
            document.body.classList.add('dr-leaving');

            let done = false;
            const go = () => {
                if (done) return;
                done = true;
                window.location.href = dest;
            };
            // Prefer the animation actually finishing, but never hang on it.
            const bars = document.querySelectorAll('.dr-transition span');
            if (bars.length) {
                bars[bars.length - 1].addEventListener('animationend', go, { once: true });
            }
            setTimeout(go, LEAVE_MS + 220);
        });

        // Coming back via the browser's back button can restore a cached page
        // still wearing the leaving class, which would leave it covered.
        window.addEventListener('pageshow', () => {
            document.body.classList.remove('dr-leaving');
        });
    }


    /* ---- Scroll-reveal for long project sections ----
       The deep half of each long project expands on its own once you reach
       that section, instead of needing a "Read more" click.

       Progressive enhancement on purpose: the CSS leaves these open by
       default and this collapses them at init, so if the script never runs
       the text is simply visible rather than sealed shut with no way in.

       Uses a rAF-throttled scroll check rather than IntersectionObserver.
       Both are valid, but this one is directly observable in automated tests,
       and with a handful of blocks the cost is negligible. */
    function initProjectReveal() {
        const blocks = Array.from(document.querySelectorAll('.project-more'));
        if (!blocks.length) return;

        if (reduceMotion) return;          // leave everything expanded

        blocks.forEach(b => b.classList.add('dr-collapsed'));

        let pending = blocks.slice();

        const check = () => {
            const trigger = window.innerHeight * 0.88;
            pending = pending.filter(b => {
                if (b.getBoundingClientRect().top > trigger) return true;
                b.classList.remove('dr-collapsed');    // once open, stays open
                return false;
            });
            if (!pending.length) {
                window.removeEventListener('scroll', onScroll);
                window.removeEventListener('resize', onScroll);
            }
        };

        // Run directly rather than deferring to rAF: the pending list only
        // shrinks, and the listener detaches once every block is open, so the
        // work is bounded and tiny.
        const onScroll = check;

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        check();                            // anything already on screen
    }




    /* ---- Pointer parallax (About page) ----
       Mirrors the homepage feel: far layers slide a lot, near ones barely move.

       Two constraints shape this. JS cannot style pseudo-elements at all, and
       the aurora and slash layers already animate `transform` — so the index
       approach of writing el.style.transform is unavailable and would clobber
       those animations anyway. Instead JS writes two custom properties, and the
       CSS applies them via the standalone `translate` property, which composes
       with `transform` rather than replacing it. Smoothing is a CSS transition,
       so no per-frame JS runs. */
    // index.html is deliberately absent: it runs its own artwork parallax from
    // js/app.js and doesn't load dr-polish.css at all.
    const PARALLAX_PAGES = ['about', 'experience', 'projects',
                            'prototypes', 'process', 'contacts'];

    function initPointerParallax() {
        if (!PARALLAX_PAGES.includes(document.body.dataset.page)) return;
        if (reduceMotion) return;
        if (window.matchMedia('(pointer: coarse)').matches) return;   // no hover to track

        const root = document.documentElement;

        const setOffset = (nx, ny) => {
            root.style.setProperty('--dr-px', nx.toFixed(4));
            root.style.setProperty('--dr-py', ny.toFixed(4));
        };

        window.addEventListener('mousemove', (e) => {
            // -1 .. 1 relative to viewport centre
            setOffset(
                (e.clientX / window.innerWidth) * 2 - 1,
                (e.clientY / window.innerHeight) * 2 - 1
            );
        }, { passive: true });

        // settle back to centre when the cursor leaves the window
        document.addEventListener('mouseleave', () => setOffset(0, 0));
    }


    /* Autoplay attributes alone aren't always honoured - Safari in particular
       can hold a clip until it's on screen, and a paused video looks like a
       broken image. This nudges them and retries once on first interaction. */
    function initLoopingClips() {
        const clips = document.querySelectorAll('video[autoplay]');
        if (!clips.length) return;

        const kick = () => clips.forEach(v => {
            v.muted = true;              // muted is what makes autoplay allowed
            const p = v.play();
            if (p && p.catch) p.catch(() => {});
        });

        kick();
        clips.forEach(v => v.addEventListener('canplay', kick, { once: true }));
        document.addEventListener('touchstart', kick, { once: true, passive: true });
        document.addEventListener('click', kick, { once: true });
    }

    /* If any of these throw, the reveal animations never run and every
       .dr-reveal would sit at opacity 0 - a blank page. Dropping the dr-js
       class disables the hiding rule in dr-theme.css so the content shows
       unstyled-but-readable instead. */
    function failSafe(err) {
        document.documentElement.classList.remove('dr-js');
        console.error('dr-ui: falling back to static content -', err);
    }

    window.addEventListener('error', function (e) {
        if (e.filename && e.filename.indexOf('dr-ui.js') > -1) failSafe(e.message);
    });

    function init() {
        try {
            initLoopingClips();
            initPointerParallax();
            initTransitions();
            initProjectReveal();
            initReveals();
            initCards();
            initTypewriter();
            window.__drUiReady = true;   // watched by the guard in each page's <head>
        } catch (err) {
            failSafe(err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
