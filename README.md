# jupyterlab_xdg_open_url_extension

[![GitHub Actions](https://github.com/stellarshenson/jupyterlab_xdg_open_url_extension/actions/workflows/build.yml/badge.svg)](https://github.com/stellarshenson/jupyterlab_xdg_open_url_extension/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/jupyterlab_xdg_open_url_extension.svg)](https://www.npmjs.com/package/jupyterlab_xdg_open_url_extension)
[![PyPI version](https://img.shields.io/pypi/v/jupyterlab-xdg-open-url-extension.svg)](https://pypi.org/project/jupyterlab-xdg-open-url-extension/)
[![Total PyPI downloads](https://static.pepy.tech/badge/jupyterlab-xdg-open-url-extension)](https://pepy.tech/project/jupyterlab-xdg-open-url-extension)
[![JupyterLab 4](https://img.shields.io/badge/JupyterLab-4-orange.svg)](https://jupyterlab.readthedocs.io/en/stable/)
[![Brought To You By KOLOMOLO](https://img.shields.io/badge/Brought%20To%20You%20By-KOLOMOLO-00ffff?style=flat)](https://kolomolo.com)
[![Donate PayPal](https://img.shields.io/badge/Donate-PayPal-blue?style=flat)](https://www.paypal.com/donate/?hosted_button_id=B4KPBJDLLXTSA)

Open a URL from a JupyterLab terminal. On a headless JupyterLab server there is no browser, so a terminal `xdg-open <url>` just fails. This extension catches that emission and turns it into a JupyterLab notification with an **Open** button that opens the URL in your real browser tab - instantly.

It does one thing, quietly. Run `jlab-xdg-open <url>` in a terminal (or let any tool that calls `xdg-open` do it for you), and the link comes to you.

## Features

- **Terminal-native** - any URL emitted with `jlab-xdg-open` in a terminal becomes a notification, no copy-paste out of the terminal
- **Invisible marker** - the emitter prints a hidden OSC escape sequence; nothing clutters your terminal output
- **Instant delivery** - uses `jupyterlab_notifications_extension` with the `--now` flag (immediate WebSocket push), so the notification appears the moment the link is emitted, on every open tab
- **One-click open** - the notification's **Open** button opens the URL in a new browser tab
- **Frontend + emitter only** - no server extension, no endpoints, no configuration to manage

## Requirements

- JupyterLab >= 4.0.0
- `jupyterlab_notifications_extension` (installed automatically as a dependency)

## Install

```bash
pip install jupyterlab_xdg_open_url_extension
```

## Usage

Emit a URL from any JupyterLab terminal:

```bash
jlab-xdg-open https://example.com
```

A notification appears instantly with an **Open** button that opens the URL in a new browser tab.

Installing the extension also puts an `xdg-open` on your `PATH` ahead of the system one, so any tool that spawns `xdg-open` - `claude`, `gh`, `git`, OAuth device flows - triggers the notification automatically, no alias needed. On a headless server the system `xdg-open` cannot open a browser anyway; this shadow is removed when you uninstall the package.

## Completing an OAuth login on a headless host

Opening the browser is only half of an OAuth login. Tools like `claude`, `gh`, and `codex` also start a short-lived callback server on the host's `localhost:PORT` and expect the browser to redirect the authorization code back to it. On a headless host the browser runs on your machine, so that redirect lands on _your_ `localhost`, not the host - the code never arrives. Three practical ways close that gap.

- **Token or API key (simplest, no callback)** - authenticate once elsewhere and carry the token in; for `claude`, run `claude setup-token` and set it in the host env, or set `ANTHROPIC_API_KEY` - best for containers and CI
- **Paste the code (Claude Code v2.1+)** - authenticate in the browser this extension opened, then paste the code the success page shows straight into the `claude` terminal, no reachable callback needed
- **Replay the callback** - copy the `http://localhost:PORT/callback?code=...` URL from the browser (the page fails to load, but the URL is in the address bar) and replay it inside the container:

```bash
jlab-xdg-open --callback 'http://localhost:45923/callback?code=...&state=...'
```

`--callback` makes a single loopback request to the tool's own waiting server - it starts no service, only replays `localhost`/`127.0.0.1` URLs, and does not follow redirects.

## Uninstall

```bash
pip uninstall jupyterlab_xdg_open_url_extension
```
