# Acceptance Criteria - xdg-open-url

Terminal `xdg-open` becomes a JupyterLab notification. The `jlab-xdg-open` emitter (also installed as an `xdg-open` PATH shadow) writes an invisible OSC `ESC ] 6789 ; <url> BEL` to the controlling terminal; the frontend listens to terminal output, catches the marker, and dispatches to `jupyterlab_notifications_extension` with `immediate: true`, adding an Open button that runs the built-in `help:open` to open the URL in a real browser tab.

## Contents

- [Emitter (jlab-xdg-open)](#emitter-jlab-xdg-open)
- [xdg-open PATH shadow](#xdg-open-path-shadow)
- [OAuth callback replay](#oauth-callback-replay)
- [OSC parser (src/osc.ts)](#osc-parser-srcoscts)
- [Terminal listener (src/index.ts)](#terminal-listener-srcindexts)
- [Notification dispatch](#notification-dispatch)
- [Open action](#open-action)
- [Architecture](#architecture)
- [Contract](#contract)

## Emitter (jlab-xdg-open)

- [x] **Console script** - `jlab-xdg-open` registered via `pyproject.toml` `[project.scripts]` -> `jupyterlab_xdg_open_url_extension.shim:main`
  - log: 2026-07-15 implemented; verified installed
- [x] **Emits OSC** - `jlab-xdg-open <url>` writes `ESC ] 6789 ; <url> BEL`, no trailing newline
  - log: 2026-07-15 implemented; verified via `xdg-open <url> | cat -v`
- [x] **Controlling-terminal delivery** - writes the sequence to `/dev/tty` so it reaches the JupyterLab PTY even when the caller discards the child's stdout; falls back to stdout when there is no controlling terminal
  - log: 2026-07-15 added for spawned-opener interception; stdout fallback verified when piped
- [x] **Multiple args** - each argv URL is emitted as its own OSC sequence
  - log: 2026-07-15 implemented
- [x] **Edge: no arg** - prints usage to stderr and exits non-zero
  - log: 2026-07-15 implemented; verified
- [x] **Edge: control chars in URL** - a URL containing a control character (ESC/BEL/other) is refused with a stderr message, not emitted malformed
  - log: 2026-07-15 implemented; verified
- [x] **OSC code shared** - `OSC_CODE` in `shim.py` matches `OSC_CODE` in `src/osc.ts`
  - log: 2026-07-15 implemented (contract kept in both files)

## xdg-open PATH shadow

- [x] **Auto-installed** - a second `[project.scripts]` entry `xdg-open` -> `shim:main` installs an `xdg-open` into the env bin dir on `pip install`; removed on uninstall
  - log: 2026-07-15 implemented; verified `/opt/conda/bin/xdg-open` present after `make install`
- [x] **Shadows system xdg-open** - the installed `xdg-open` resolves ahead of `/usr/bin/xdg-open` when the env bin dir precedes `/usr/bin` on PATH, so tools that spawn `xdg-open` hit the emitter
  - log: 2026-07-15 verified `/opt/conda/bin/xdg-open` first on PATH
- [ ] **Live: spawned opener intercepted** - a tool that spawns `xdg-open` (e.g. claude login) triggers the notification
  - log: 2026-07-15 pending live verification; depends on the caller not fully detaching the child (setsid + discarded stdio)

## OAuth callback replay

- [x] **Replays loopback** - `jlab-xdg-open --callback <url>` makes a single GET to the loopback callback URL, delivering the code to the login tool's own short-lived server; starts no service
  - log: 2026-07-15 implemented; verified delivery to a local 302 server (`/callback?code=...` received)
- [x] **Loopback only** - refuses any non-loopback host (only `localhost`/`127.0.0.1`/`::1`), exits non-zero
  - log: 2026-07-15 implemented; verified refusal of an external URL
- [x] **No redirect follow** - a 3xx from the tool's server is reported, not followed to the external success page
  - log: 2026-07-15 implemented; verified 302 reported without following to the external host
- [x] **Edge: unreachable** - a closed/absent loopback port yields a clear stderr error and non-zero exit
  - log: 2026-07-15 implemented; verified
- [x] **Edge: missing arg** - `--callback` with no URL prints usage and exits non-zero
  - log: 2026-07-15 implemented

## OSC parser (src/osc.ts)

- [x] **BEL terminator** - `scanOscUrls` extracts the URL from a BEL-terminated marker
  - log: 2026-07-15 implemented; jest covers (7/7 green)
- [x] **ST terminator** - accepts an ST (`ESC \`) terminated marker
  - log: 2026-07-15 implemented; jest covers
- [x] **Query strings** - URL payload with `?a=1&b=2;c=3` is captured intact (semicolons/ampersands preserved)
  - log: 2026-07-15 implemented; jest covers
- [x] **Multiple markers** - all complete markers in one buffer are returned in order
  - log: 2026-07-15 implemented; jest covers
- [x] **Split across chunks** - a marker split over two chunks is reassembled via the carried `rest`
  - log: 2026-07-15 implemented; jest covers
- [x] **Edge: plain output** - text with no marker yields no URLs and keeps no buffer
  - log: 2026-07-15 implemented; jest covers
- [x] **Edge: empty payload** - `ESC ] 6789 ; BEL` yields no URL
  - log: 2026-07-15 implemented; jest covers
- [x] **Edge: buffer bound** - carried `rest` never exceeds `MAX_BUFFER`; a lone ESC with no terminator cannot grow unbounded
  - log: 2026-07-15 implemented

## Terminal listener (src/index.ts)

- [x] **Existing terminals** - `tracker.forEach` attaches a listener to every terminal open at activation
  - log: 2026-07-15 implemented; verified (live notification fired from a terminal)
- [x] **New terminals** - `tracker.widgetAdded` attaches to terminals opened later
  - log: 2026-07-15 implemented; verified live
- [x] **stdout only** - only `messageReceived` messages of type `stdout` with non-empty content are scanned
  - log: 2026-07-15 implemented
- [x] **Per-session buffer** - each terminal keeps its own reassembly buffer
  - log: 2026-07-15 implemented
- [x] **Edge: dispose** - on terminal `disposed`, the listener disconnects and the buffer is cleared
  - log: 2026-07-15 implemented
- [x] **Edge: no session** - a widget with no `content.session` is skipped without error
  - log: 2026-07-15 implemented

## Notification dispatch

- [x] **Ingest POST** - on a caught URL, POST `jupyterlab-notifications-extension/ingest` with `message`, `type: info`, `autoClose: false`, `immediate: true`
  - log: 2026-07-15 implemented; verified (notification appeared)
- [x] **Open action** - payload carries one action `{label: Open, caption: url, displayType: accent, commandId: help:open, args: {url, text, newBrowserTab: true}}`
  - log: 2026-07-15 implemented; changed commandId from custom `jlab-xdg-open:open` (window.open was popup-blocked) to built-in `help:open` with `newBrowserTab`
- [x] **Immediate (now)** - `immediate: true` uses the notifications extension WebSocket push for instant display
  - log: 2026-07-15 implemented; verified instant display
- [x] **Edge: ingest failure** - a failed POST is logged to console, does not throw into the message handler
  - log: 2026-07-15 implemented
- [x] **Live: instant notification** - `jlab-xdg-open <url>` shows a notification within ~1s in an open tab
  - log: 2026-07-15 verified by user

## Open action

- [x] **Built-in command** - the Open action uses the built-in `help:open`; no custom command is registered by this extension
  - log: 2026-07-15 replaced the custom `jlab-xdg-open:open` + `window.open(url, '_blank', 'noopener,noreferrer')` (browser popup-blocked the feature-string form)
- [x] **Opens real browser tab** - `newBrowserTab: true` makes `help:open` open the URL in a new browser tab via a bare `window.open`
  - log: 2026-07-15 verified by user
- [x] **Live: button opens URL** - clicking Open in the notification opens the URL in a new browser tab
  - log: 2026-07-15 verified by user

## Architecture

- [x] **No server extension** - `routes.py`, `jupyter-config/server-config`, and the `_jupyter_server_extension_*` hooks are removed; `jupyter server extension list` does not list this extension
  - log: 2026-07-15 implemented; verified (only `jupyterlab_notifications_extension` is a server extension)
- [x] **Frontend present** - `jupyter labextension list` shows the frontend extension enabled
  - log: 2026-07-15 verified `jupyterlab_xdg_open_url_extension v0.1.5 enabled OK`
- [x] **Runtime dependency** - `jupyterlab_notifications_extension` declared in `pyproject.toml` dependencies (provides the ingest endpoint + display)
  - log: 2026-07-15 implemented

## Contract

- OSC marker (terminal -> frontend): `ESC ] 6789 ; <url> BEL` (or `ESC \` ST terminator)
- Notification (frontend -> notifications ext): `POST /jupyterlab-notifications-extension/ingest` body `{message, type: "info", autoClose: false, immediate: true, actions: [{label: "Open", caption: url, displayType: "accent", commandId: "help:open", args: {url, text, newBrowserTab: true}}]}`
- Callback replay (headless login): `jlab-xdg-open --callback <loopback-url>` -> single GET to `localhost`/`127.0.0.1`, no redirect follow, no service started
