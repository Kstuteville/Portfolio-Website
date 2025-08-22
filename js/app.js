const parallax_el = document.querySelectorAll(".parallax");

let xValue = 0, yValue = 0;


let rotateDegree = 0;


function update(cursorPosition) {
    

    
    

      parallax_el.forEach((el) => {

        let speedx = el.dataset.speedx;
        let speedy = el.dataset.speedy;
        let speedz = el.dataset.speedz;
        let rotateSpeed = el.dataset.rotation;


        let isInLeft = 
            parseFloat(getComputedStyle(el).left) < window.innerWidth / 2 ? 1 : -1;


        let zValue = (cursorPosition - parseFloat(getComputedStyle(el).left)) * isInLeft * 0.1;
        
        
        el.style.transform = ` perspective(5000px) translateZ(${zValue * speedz}px) rotateY(${rotateDegree * rotateSpeed}deg) translateX(calc(-50% + ${-xValue * speedx}px)) translateY(calc(-50% + ${yValue * speedy}px))`;

    });


}
update(0);



window.addEventListener("mousemove", (e) => {
    xValue = e.clientX - window.innerWidth / 2;
    yValue = e.clientY - window.innerHeight / 2;


    const maxDistance = 300; // how far you're allowed to "pan"
    xValue = Math.max(-maxDistance, Math.min(xValue, maxDistance));
    yValue = Math.max(-maxDistance, Math.min(yValue, maxDistance));

    rotateDegree = (xValue / (window.innerWidth / 2)) * 20; // adjust the divisor for sensitivity
    update(e.clientX);



  
})

//gsap animation

let timeline = gsap.timeline();

timeline.from("body", {
  y: "100%",   // start the whole body shifted down
  duration: 1,
  ease: "power3.out"
});


timeline.from(".text h2", {
    y: window.innerHeight / 1.5,   // start below
    opacity: 0,                     // optional fade-in
    duration: 2,
    ease: "power3.out"
}, "1");  // start 2.5s after previous animation



// Continuous subtle wiggle
gsap.to("#screen", {
  x: () => gsap.utils.random(-50, 50),
  y: () => gsap.utils.random(-50, 50),
  rotation: () => gsap.utils.random(-0.5, 0.5),
  duration: 2,
  repeat: -1,
  yoyo: true,
  ease: "none",
  repeatRefresh: true
});
gsap.ticker.add(() => {
  const x = gsap.getProperty("#screen", "x");
  const y = gsap.getProperty("#screen", "y");
  const now = performance.now();
  // simple velocity estimate
  window.__last = window.__last || { x, y, t: now };
  const dx = x - window.__last.x;
  const dy = y - window.__last.y;
  const dt = Math.max((now - window.__last.t) / 1000, 1/240);
  const speed = Math.sqrt(dx*dx + dy*dy) / dt;
  const blur = Math.min(speed / 220, 4); // cap at ~4px
  document.querySelector("#screen").style.filter = `blur(${blur.toFixed(2)}px)`;
  window.__last = { x, y, t: now };
});
gsap.to("#screen", {
  x: () => gsap.utils.random(-50, 50),
  y: () => gsap.utils.random(-50, 50),
  rotation: () => gsap.utils.random(-0.5, 0.5),
  duration: 2,
  repeat: -1,
  yoyo: true,
  ease: "none",
  repeatRefresh: true
});



const canvas = document.getElementById('snow-canvas');
const ctx = canvas.getContext('2d');

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];

// Create particles
ctx.filter = "blur(1px)";
for (let i = 0; i < 80; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 1.5 + 0.5,
    speedY: Math.random() * 1 + 0.5,
    speedX: Math.random() * 0.8 + 0.2,  // small horizontal movement
  });
}
ctx.fillStyle = "white";
ctx.globalAlpha = 0.02;   // 0 = fully transparent, 1 = solid

function updateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x > canvas.width) p.x = 0;
    if (p.y > canvas.height) p.y = 0;

    ctx.beginPath();
    ctx.globalAlpha = 0.3;   // 👈 makes each flake slightly transparent
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  requestAnimationFrame(updateParticles);
}


updateParticles();



document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();   // stop immediate navigation
    const href = link.getAttribute('href');

    gsap.to("body", { opacity: 0, duration: 0.5, onComplete: () => {
        window.location.href = href;
    }});
  });
});