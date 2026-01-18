# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foundry Virtual Tabletop game system for "Chroniques Oubliées 2e édition" (CO2), a French fantasy tabletop RPG by Black Book Editions. Requires Foundry VTT v13.

## Build Commands

```bash
npm run watch      # Compile LESS and watch for changes (default dev workflow)
npm run compile    # One-time LESS compilation only
npm run build      # Same as watch
```

Build process: `styles/co.less` → `css/co.css`

## Code Style

- **No semicolons** - Prettier enforces this
- **180 character line width**
- **ES6+ modules** - Use `import`/`export`, arrow functions, `async`/`await`
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes
- **JSDoc** required for public exports
- **No jQuery** for simple DOM manipulation
- **CSS**: LESS with CSS Modules methodology, mobile-first responsive design

## Architecture

**Entry Point:** `co.mjs` - Initializes the system via Foundry hooks (init, i18nInit, ready)

**Module Structure:**

| Directory | Purpose |
|-----------|---------|
| `config/` | System constants exported via `SYSTEM` object |
| `models/` | Foundry DataModel classes for actors, items, and chat messages |
| `documents/` | Extended Foundry Document classes (COActor, COItem, COChatMessage, CombatCO, CORoll) |
| `applications/sheets/` | Actor and item sheet UI classes |
| `helpers/` | Utilities, Handlebars helpers, settings, rules engine |
| `hooks/` | Foundry hook handlers (actor, chat, combat, macros) |
| `elements/` | Custom HTML web components (toggle switches, checkboxes) |
| `dialogs/` | Modal dialog forms |

**Document Types:**
- **Actors:** character, encounter
- **Items:** equipment, feature, profile, capacity, attack, path
- **ChatMessages:** action, skill, item, heal, save

**Templates:** Handlebars templates in `templates/` directory matching the sheet structure.

**Styles:** LESS source in `styles/`, compiled to `css/co.css`.

## Global API

The system exposes `game.system.api` with access to applications, models, documents, and helpers.
