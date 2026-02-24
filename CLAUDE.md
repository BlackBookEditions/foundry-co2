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

## Modifier System

### Modifier DataModel (`models/schemas/modifier.mjs`)

Each modifier has these fields:

| Field | Role | Values |
|-------|------|--------|
| `source` | UUID of the originating item | |
| `type` | Source item type | `equipment`, `capacity`, `feature`, `profile`, `attack` |
| `subtype` | Category of affected stat | `ability`, `combat`, `attribute`, `resource`, `skill`, `bonusDice`, `malusDice`, `state` |
| `target` | Specific stat | `for`, `agi`, `con`, `per`, `cha`, `int`, `vol`, `melee`, `ranged`, `magic`, `init`, `def`, `crit`, `damMelee`, `damRanged`, `damMagic`, `dr`, `hp`, `mov`, `fp`, `mp`, `rp`, `darkvision`, immunities, `all` |
| `apply` | Beneficiary | `self`, `others`, `both` |
| `value` | Formula string | `"+2"`, `"1 * @rank"`, `"@nivmod[10, 2]"`, `"d4°"` |

Constants defined in `config/modifier.mjs`. Formula evaluation via `Utils.evaluateCoModifier()` (`helpers/utils.mjs`).

**Formula variables:** `@rank`/`@rang` (capacity rank in path), `@arme.dmg`/`@arme.skill` (equipped weapon), `d4°` (evolving die by level), `@nivmod[niv, mod]` (level threshold), and all actor roll data (`@for`, `@niv`, `@atc`, etc.).

### Where Modifiers Are Stored

**Features and Profiles** have `system.modifiers[]` directly — always active (passive bonuses).

**Equipment and Capacities** store modifiers inside **Actions** (`system.actions[].modifiers[]`). Activation depends on the action state.

### Actions: `activable` and `temporary` Properties (`models/schemas/action.mjs`)

Each Action has `properties` controlling its behavior:

| Use Case | `activable` | `temporary` | `enabled` | Behavior |
|----------|-------------|-------------|-----------|----------|
| Permanent buff | `false` | `false` | `true` | Always on, no button. Modifiers always apply. |
| Duration spell | `true` | `true` | toggled | On/off button on sheet. `enabled` flips, modifiers apply while active. |
| Instant spell | `true` | `false` | unchanged | Button fires once. Modifiers delivered to targets via `CustomEffect`, not persisted on item. |
| Simple attack | `true` | `false` | unchanged | Like instant: one-shot execution. |

### Modifier Filtering (`documents/item.mjs`)

`COItem.modifiers` getter routes by item type:
- **Feature/Profile** → returns `system.modifiers` (always active)
- **Equipment/Capacity** → calls `getModifiersFromActions()`:
  - If action has **conditions** (`isEquipped`, `isLearned`, `isOwned`, `isLinkedActionActivated`) → `RulesEngine.evaluate()` (`helpers/rules-engine.mjs`)
  - Otherwise → checks `action.properties.enabled`

### Modifier Aggregation (`models/actor.mjs`)

`ActorData._getModifiers(subtype)` collects modifiers from all actor items (features, profiles, capacities, equipments) filtered by `subtype` and `apply === "self" | "both"`. Also includes modifiers from `currentEffects` (received from other actors) with `apply === "others" | "both"`.

Typed accessors: `abilityModifiers`, `combatModifiers`, `attributeModifiers`, `resourceModifiers`, `skillModifiers`, `stateModifiers`, `bonusDiceModifiers`, `malusDiceModifiers`.

### Application During `prepareDerivedData` (`models/character.mjs`)

| Stat | Modifier subtype/target | Application |
|------|------------------------|-------------|
| Ability scores | `ability` / `for`, `agi`, etc. | `ability.value = base + bonuses + abilityModifiers.total` |
| Attack (melee/ranged/magic) | `combat` / `melee`, `ranged`, `magic` | Added to attack skill value |
| Defense | `combat` / `def` | Added to defense value |
| Critical threshold | `combat` / `crit` | `crit.value = max(16, 20 - critModifiers.total)` |
| Damage reduction | `combat` / `dr` | Added to DR value |
| HP max | `attribute` / `hp` | Added to max HP |
| Movement | `attribute` / `mov` | Added to movement value |
| Resources (FP/MP/RP) | `resource` / `fp`, `mp`, `rp` | Added to resource max |
| Bonus/malus dice | `bonusDice`/`malusDice` | Sets `ability.superior = true` → 2d20kh (or 2d20kl) |
| States | `state` / `darkvision`, immunities | Boolean presence check (blocks status application) |

### During Skill Rolls (`documents/actor.mjs` `rollSkill()`)

1. Ability value **already includes** `abilityModifiers` from `prepareDerivedData`
2. `bonusDice`/`malusDice` modifiers determine 2d20kh or 2d20kl
3. `skillModifiers` are presented as **optional checkboxes** in the roll dialog — player selects which to apply
4. Selected skill bonuses are summed and appended to the roll formula

### During Attack Rolls (`documents/actor.mjs` `rollAttack()`)

1. Attack bonus **already includes** `combatModifiers` from `prepareDerivedData`
2. `bonusDice`/`malusDice` checked via `hasBonusDiceForAttack(attackType)`
3. Damage modifiers (`damMelee`/`damRanged`/`damMagic`) appended to damage formula (supports dice formulas like `1d6`)
4. Critical threshold from `combat.crit.value` (already modified by `crit` modifiers)

### CustomEffects — Temporary Modifiers on Other Actors (`models/schemas/custom-effect.mjs`)

When an instant action targets another actor, modifiers are packaged into a `CustomEffectData` with duration info and stored in `system.currentEffects` on the target. These are collected by `_getModifiers()` alongside item modifiers, filtered by `apply === "others" | "both"`.

`CustomEffectData` fields: `name`, `source`, `statuses`, `unit` (round/second/unlimited/instant/combat), `duration`, `remainingTurn`, `modifiers[]`, `formula`, `formulaType` (damage/heal), `slug`.

### Activation Flow (`documents/actor.mjs` `activateAction()`)

- **Duration action** (`temporary = true`): On activate → resolvers execute, `enabled` set to `true`, modifiers apply via `prepareDerivedData`. On deactivate → `enabled` set to `false`.
- **Instant action** (`temporary = false`): Resolvers execute, effects delivered via `CustomEffectData` to targets, `enabled` unchanged on item.
- **Non-activable actions**: `enabled` tracks parent item state (equipped/learned) via `_toggleItemFieldAndActions()`.
