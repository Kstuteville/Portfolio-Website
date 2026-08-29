#!/usr/bin/env python3
"""Local dev server that tells the browser never to cache.

Without this, edits to dr-theme.css / js don't show up until a hard refresh.

Usage:
    python3 serve.py            # port 8000
    python3 serve.py 8001       # pick a port
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    try:
        server = ThreadingHTTPServer(("", port), NoCacheHandler)
    except OSError as err:
        if err.errno == 48:  # address already in use
            print(f"Port {port} is already being used by something else.\n")
            print("Either that's a server you already have running — just open")
            print(f"  http://localhost:{port}/about.html\n")
            print("or free the port and try again:")
            print(f"  lsof -ti tcp:{port} | xargs kill\n")
            print(f"or use a different port:\n  python3 serve.py {port + 1}")
            sys.exit(1)
        raise

    print(f"Serving http://localhost:{port}  (no-cache)")
    print(f"  About page:  http://localhost:{port}/about.html")
    print(f"  Pixel town:  http://localhost:{port}/game.html")
    print("Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
