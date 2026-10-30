# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

<!-- <END NEW CHANGELOG ENTRY> -->

## [0.1.8] - 2026-10-30

### Added

- A terminal `jlab-xdg-open <url>` becomes a JupyterLab notification with an **Open** button that opens the URL in a browser tab
- The wheel installs an `xdg-open` command ahead of the system one on `PATH`, so tools that spawn `xdg-open` trigger the notification; uninstalling the package removes it
- `jlab-xdg-open --callback <url>` replays an OAuth callback to the waiting loopback server on a headless host

### Changed

- The npm name is `@stellarshenson/jupyterlab-xdg-open-url-extension` and the labextension installs under that scoped path; the Python distribution name stays `jupyterlab_xdg_open_url_extension`
- Requires JupyterLab >= 4.6 and `jupyterlab_notifications_extension` >= 1.2, < 2
- Moved to extension template v4.6.5 and Makefile 1.46

### Fixed

- `package.json` holds the GitHub repository address, so the published project URLs are no longer empty
