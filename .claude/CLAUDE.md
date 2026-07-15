<!-- Project overlay. References (does NOT copy) two upstream layers: -->
<!-- User-level (global, every project on this machine): /home/lab/.claude/CLAUDE.md -->
<!-- Workspace-level (everything under /home/lab/workspace):   /home/lab/workspace/.claude/CLAUDE.md -->

# Project-Specific Configuration

This file is a thin overlay. It imports both upstream layers by reference and adds
project-specific rules below. All rules from both files apply; the rules here strengthen or
extend them.

- **Global**: `/home/lab/.claude/CLAUDE.md`
- **Workspace**: `/home/lab/workspace/.claude/CLAUDE.md`

The workspace `.claude/` directory and skills carry the full standards (markdown, mermaid,
journal, git, notebook, documentation). Consult the workspace CLAUDE.md and its skills to
discover all applicable standards; nothing from them is duplicated here.

## Mandatory Bans (Reinforced)

The following workspace rules are STRICTLY ENFORCED for this project:

- **No automatic git tags** - only create tags when user explicitly requests
- **No automatic version changes** - only modify version in package.json/pyproject.toml/etc. when user explicitly requests
- **No automatic publishing** - never run `make publish`, `npm publish`, `twine upload`, or similar without explicit user request
- **No manual package installs if Makefile exists** - use `make install` or equivalent Makefile targets, not direct `pip install`/`uv install`/`npm install`
- **No automatic git commits or pushes** - only when user explicitly requests

## Project Context

`jupyterlab_xdg_open_url_extension` turns a terminal `xdg-open` into a JupyterLab
notification. On a headless JupyterLab server there is no browser, so a terminal
`xdg-open <url>` fails; this extension surfaces it as a notification with an **Open** button
that opens the URL in the user's real browser tab.

- **Architecture** - frontend + emitter only. No server extension. Display is delegated to
  `jupyterlab_notifications_extension` (a runtime dependency)
- **Emitter** - console script `jlab-xdg-open` (`jupyterlab_xdg_open_url_extension/shim.py`)
  prints an invisible OSC escape `ESC ] 6789 ; <url> BEL`. Transparent `xdg-open` interception
  is opt-in via `alias xdg-open=jlab-xdg-open`
- **Frontend** (`src/index.ts`) - listens to every terminal's output via `ITerminalTracker` +
  `session.messageReceived`, catches the OSC marker (`src/osc.ts`, streaming-safe reassembly),
  and POSTs to the notifications ingest with `immediate: true` (the `--now` flag) and an
  `Open` action whose `commandId` runs the plugin's `jlab-xdg-open:open` → `window.open`
- **OSC code 6789** is shared by contract between `shim.py` and `src/osc.ts` - keep both in sync
- **Stack** - TypeScript (JupyterLab 4 / Lumino), Python (hatchling, jupyter-builder), jest,
  Playwright/Galata UI tests, jupyter-releaser CI

## Mandatory Project Rules

- **Install via `make install`** - never run `pip`/`jlpm`/`yarn`/`npm install` by hand; use the
  Makefile targets (`make install`, `make build`, `make test`)
- **Commit the manifest and its lockfile together** - `package.json` and its lockfile
  (`yarn.lock` for this jlpm project) must never drift apart in a commit; stage them together
- **Keep the Makefile current** - the local `Makefile` tracks
  `/home/lab/workspace/private/jupyterlab/@utils/jupyterlab-extensions/Makefile`. Diff against
  it and update the local copy as soon as a newer version exists (both are v1.34 as of project
  creation)
- **Acceptance criteria for every feature** - maintain `docs/acc-crit-*.md` via the
  `/acceptance-criteria` skill
- **Defect tracking** - log and track every defect in `docs/defects.md` via the
  `/defects-tracking` skill

## Required Workspace Skills

Workspace skills live at `/home/lab/workspace/.claude/skills/`. These MUST be used for this
project:

- **jupyterlab-extension** - extension development guidelines, CI/CD, jupyter-releaser, caveats
- **playwright** - browser automation for screenshots and live UI verification

## Journal Rules (Project-Specific)

- **APPEND ONLY**: New journal entries MUST be appended at the end of the file, never inserted between existing entries
- Entries maintain strict chronological order by position - the last entry in the file is always the most recent work
- Never reorder, move, or insert entries out of sequence
- The Stellars **journal plugin** is the canonical tool for this file: create via `/journal:create`, append via `/journal:update`, archive via `/journal:archive`. The `journal:journal` skill auto-triggers on any mention of "journal" and runs `journal-tools check` after every write
- Direct edits to `JOURNAL.md` are a last resort - prefer the plugin so modus secundis format, continuous numbering and append-only order are enforced automatically

## Strengthened Rules

- **Simplicity first** - this extension is deliberately two small parts (a frontend listener
  and an emitter). Do not reintroduce a server extension, extra endpoints, or configuration
  that was intentionally removed
- **OSC contract** - any change to the OSC code or sequence format must be applied to both
  `shim.py` and `src/osc.ts` in the same change, with the jest OSC test updated
