#!/usr/bin/env python3
"""xdg-open emitter for JupyterLab terminals.

Instead of opening a browser (there is none on a headless JupyterLab server),
this prints an invisible OSC escape sequence carrying the URL. The extension's
frontend listens to the terminal output stream, catches the sequence, and
launches a JupyterLab notification (via jupyterlab_notifications_extension)
with an "Open" button that opens the URL in the user's real browser tab.

Installed as two console scripts: ``jlab-xdg-open`` (explicit) and ``xdg-open``
(a PATH shadow, so any tool that spawns ``xdg-open`` - claude, gh, git, OAuth
device flows - is transparently intercepted). The sequence is written to the
controlling terminal (``/dev/tty``) so it reaches the JupyterLab terminal even
when the caller spawns ``xdg-open`` with its stdout discarded; it falls back to
stdout when there is no controlling terminal.

    jlab-xdg-open https://example.com

For OAuth logins on a headless host, ``--callback`` replays a loopback callback
URL to the host's own localhost, delivering the code to the login tool's
short-lived callback server (no service of our own is started):

    jlab-xdg-open --callback 'http://localhost:45923/callback?code=...&state=...'
"""

import sys

# OSC code carrying the URL. Must match OSC_CODE in src/index.ts.
# Format: ESC ] 6789 ; <url> BEL
OSC_CODE = 6789


def emit(url: str) -> None:
    """Write the invisible OSC escape sequence carrying the URL.

    Control characters would break the escape sequence, so a URL containing
    ESC or BEL is rejected rather than emitted malformed.

    The sequence goes to the controlling terminal (/dev/tty) so it lands on the
    JupyterLab terminal even when the caller (e.g. a browser opener) spawns
    xdg-open with its stdout redirected to /dev/null. When there is no
    controlling terminal, it falls back to stdout.
    """
    if any(ord(ch) < 0x20 or ord(ch) == 0x7F for ch in url):
        print(f"jlab-xdg-open: refusing to emit URL with control characters: {url!r}",
              file=sys.stderr)
        return
    seq = f"\x1b]{OSC_CODE};{url}\x07"
    try:
        with open("/dev/tty", "w") as tty:
            tty.write(seq)
            tty.flush()
    except OSError:
        sys.stdout.write(seq)
        sys.stdout.flush()


def replay_callback(url: str) -> int:
    """Replay an OAuth loopback callback URL to the host's own localhost.

    A login tool (claude, gh, codex) starts a short-lived callback server on the
    host's localhost:PORT and opens the auth URL in the browser. On a headless
    host the browser's redirect to localhost:PORT lands on the user's own
    machine, not the host, so the code never arrives. Copy that callback URL
    from the browser and replay it here: this runs inside the container/host, so
    localhost:PORT is the tool's own waiting server. No service is started.

    Restricted to loopback hosts so it cannot GET an arbitrary URL, and
    redirects are not followed (the tool's server answers a caught code with a
    302 to an external success page - we only need to deliver the code).
    """
    import urllib.error
    import urllib.request
    from urllib.parse import urlparse

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or parsed.hostname not in (
        "localhost",
        "127.0.0.1",
        "::1",
    ):
        print(
            "jlab-xdg-open: --callback only replays loopback URLs "
            f"(localhost/127.0.0.1); refusing: {url!r}",
            file=sys.stderr,
        )
        return 1

    class _NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None

    opener = urllib.request.build_opener(_NoRedirect)
    try:
        with opener.open(url, timeout=8) as resp:
            status = resp.status
    except urllib.error.HTTPError as exc:
        # A 3xx/4xx still means the local login server received the code.
        status = exc.code
    except OSError as exc:
        print(
            f"jlab-xdg-open: could not reach {url} - is the login still "
            f"waiting? ({exc})",
            file=sys.stderr,
        )
        return 1
    print(f"jlab-xdg-open: replayed callback to loopback -> HTTP {status}")
    return 0


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] == "--callback":
        if len(args) != 2:
            print("usage: jlab-xdg-open --callback <loopback-callback-url>",
                  file=sys.stderr)
            return 1
        return replay_callback(args[1])
    if not args:
        print("usage: jlab-xdg-open <url> [<url> ...]\n"
              "       jlab-xdg-open --callback <loopback-callback-url>",
              file=sys.stderr)
        return 1
    for url in args:
        emit(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
