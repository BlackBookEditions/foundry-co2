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

## Release Notes

`release-notes.md` (system root) feeds the in-game release notes window (`module/applications/release-notes.mjs`), shown to the GM on load after an update. One `# <version>` heading per release, newest first. A blockquote (`> …`) renders as a highlighted "important message" block. Player-facing companion to `CHANGELOG.md`, which stays exhaustive and technical.

Display is driven by the file's own headings, never compared against `game.system.version` — the file ships inside the system package, so it cannot advertise a version the user has not installed. Consequence: do not leave an entry for an unreleased version in the file, it would be shown. New root files must be added to the `zip` list in `.github/workflows/main.yml`, otherwise they are missing from published releases.

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

## Target System (Resolvers)

### Key Files

| File | Role |
|------|------|
| `module/models/schemas/resolver.mjs` | Resolver class: `attack()`, `auto()`, `heal()`, `save()`, `buffDebuff()`, guards, `_manageAdditionalEffect()` |
| `module/documents/actor.mjs` | `acquireTargets()`, `_getTargets()`, `rollAttack()`, `rollHeal()`, `rollAskSave()` |
| `module/config/action.mjs` | Constants `RESOLVER_TARGET`, `RESOLVER_SCOPE` |
| `templates/dialogs/attack-roll-dialog.hbs` | Target display in attack dialog (`.invalid-scope` class) |
| `styles/applications/dialogs/attack-roll-dialog.less` | `.invalid-scope` style (red border, opacity 0.5) |

### Target Configuration

Each resolver has a `target` schema with three fields:

| Field | Values | Role |
|-------|--------|------|
| `type` | `none`, `self`, `single`, `multiple` | Who can be targeted |
| `scope` | `all`, `allies`, `enemies` | Token disposition filter |
| `number` | Formula string (default `"0"`) | Max target count (evaluated via `getEvaluatedTargetNumber()`) |

**Target types** (`RESOLVER_TARGET` — `config/action.mjs`):

| UI Label | id | Description |
|----------|-----|-------------|
| Aucune | `none` | No target needed — standard weapon config |
| Soi-même | `self` | The caster only |
| Unique | `single` | One target (optional or mandatory depending on `number`) |
| Multiple | `multiple` | Several targets |

**Scope** (`RESOLVER_SCOPE` — `config/action.mjs`):

| UI Label | id | Passes tokens with disposition |
|----------|-----|------|
| Tous | `all` | Any |
| Alliés | `allies` | `FRIENDLY`, `NEUTRAL`, `SECRET` |
| Ennemis | `enemies` | `HOSTILE`, `NEUTRAL`, `SECRET` |

NEUTRAL and SECRET tokens pass both `allies` and `enemies` scopes. Only FRIENDLY is exclusive to `allies`, and only HOSTILE is exclusive to `enemies`.

**`number` field semantics:**

| type | number | Effect |
|------|--------|--------|
| single | `"0"` or empty | Target is optional (`hasOptionalTargets = true`) |
| single | `"1"` or more | Target is mandatory |
| multiple | `"0"` | Unlimited targets |
| multiple | N | Maximum N targets |

### Call Chain

```
resolver.method()
  → shouldBlockMissingTargets(targets)            // guard: mandatory targets missing?
  → "rejected targets" guard                       // guard: optional targets were selected but all rejected?
  → getResolverTargets(actor, actionName, options)
    → getEvaluatedTargetNumber(actor, item)        // evaluates target.number formula
    → actor.acquireTargets(type, scope, number)    // dispatches by type
      → actor._getTargets(actionName, scope, number, single)  // reads game.user.targets, filters scope, validates count
```

### Target Acquisition (`actor.mjs`)

**`acquireTargets(targetType, targetScope, targetNumber, actionName)`:**

| targetType | Behavior |
|------------|----------|
| `"none"` | Returns `[]` — ignores canvas targets |
| `"self"` | Returns `[]` — downstream functions handle self-targeting |
| `"single"` | `_getTargets(name, scope, 1, true)` |
| `"multiple"` | `_getTargets(name, scope, number, false)` |

**`_getTargets(actionName, scope, number, single)`:**

1. Reads `game.user.targets` (tokens selected on canvas)
2. If no tokens selected → returns `[]`
3. **Filters by scope** — only keeps tokens matching the scope disposition
4. **Validates count** (after scope filtering) — if `expectedNumber > 0` and `targets.length > expectedNumber` → warns + returns `[]`
5. Returns filtered targets array

Scope filtering happens BEFORE count validation: selecting 1 ally + 1 enemy with scope=`allies` and type=`single` → enemy filtered out → 1 valid target → OK (no "too many targets" warning).

### hasOptionalTargets()

Returns `true` when:
- `target.type === "none"` — action doesn't need targets at all
- `target.type === "single"` AND `target.number === "0"` or empty — target is welcome but not required

When `true`, resolvers use a dynamic `effectiveTargetType`: `"single"` if targets were acquired, `"none"` if not. This determines fallback behavior (e.g., heal self vs. heal target).

### Guards Against Missing/Invalid Targets (`resolver.mjs`)

Multiple levels of protection prevent actions from executing with incorrect targets:

**1. `shouldBlockMissingTargets(targets)` — mandatory targets missing**

Blocks when `targets = []`, `!hasOptionalTargets`, and `type = single|multiple`. Warns `warningNoTargetOrTooManyTargets` if `game.user.targets.size === 0` (user didn't select anything). Warns `warningNoValidTarget` if `size > 0` (user selected targets but all were filtered out by scope).

**2. Single target count guard (attack resolver only)**

Blocks with `warningIncorrectTargets` when `this.target.type === "single"` but `targets.length > 1`. Needed because `getResolverTargets` can override type to `"multiple"` for `@oppose`/`@cible` difficulty resolution, bypassing the single-target constraint in `_getTargets`.

**3. Partial scope rejection guard (heal resolver only)**

Blocks with `warningInvalidScopeTargets` when `targets.length > 0` but `game.user.targets.size > targets.length` and scope is not `"all"`. Catches the case where SOME (but not all) selected targets were filtered by scope — prevents silent partial application.

**4. "Rejected targets" guard — optional targets were selected but all rejected**

```js
if (target.type !== "none" && hasOptionalTargets && targets.length === 0
    && canvas.ready && game.user.targets.size > 0)
```

Catches the case where `single + n=0` has optional targets, the user DID select tokens, but they were all rejected (scope mismatch or too many). Warns with `CO.notif.warningNoValidTarget` and blocks. Without this guard, the resolver would silently fall back (e.g., heal self instead of heal target).

The `target.type !== "none"` exclusion is critical: type `"none"` always returns `[]` from `acquireTargets` by design — the user's canvas targets are irrelevant (except for `@cible`/`@oppose` difficulty resolution).

**5. `_manageAdditionalEffect()` guard — buffDebuff with no targets**

In the non-self branch, blocks with warning when `targets.length === 0`. Prevents silent no-op when buffDebuff has no valid targets.

### Target Resolution by Resolver

**`effectiveTargetType` computation** (attack, auto, heal):
```
hasOptionalTargets ? (targets.length > 0 ? "single" : "none") : this.target.type
```

This means the downstream function receives `"single"` or `"none"` dynamically based on whether targets were found, instead of the raw config value.

**What each downstream function does with targetType:**

| Function | `"none"` | `"self"` | `"single"` / `"multiple"` |
|----------|----------|----------|---------------------------|
| `rollAttack` | No auto-apply DM (chat buttons for manual apply) | Targets used for difficulty resolution only | DM auto-applied to targets |
| `rollHeal` | Heals caster | Heals caster | Heals target(s) |
| `rollAskSave` | Save asked to caster | Save asked to caster | Save asked to target(s) |
| `_manageAdditionalEffect` | Converted to `"single"`, acquires 1 target | Effect applied to caster | Effect applied to target(s) |

### Resolver-Specific Target Handling

**attack / auto:** Standard flow. Type `"none"` is the default weapon config — proceeds without targets, DM applied manually via chat buttons. Exception: if difficulty formula contains `@cible` or `@oppose`, forces `acquireTargets("multiple", "all", allTokens)` to resolve the formula even with `hasOptionalTargets`.

**heal:** Standard flow. Fallback to self-heal when `effectiveTargetType = "none"`.

**save:** Overrides optional targets — always forces `effectiveTargetType = "single"` when `hasOptionalTargets`. A save always needs a recipient. Acquires targets independently (doesn't use `getResolverTargets`).

**buffDebuff:** Delegates entirely to `_manageAdditionalEffect()`. No resolver-level target acquisition — targets are acquired inside `_manageAdditionalEffect`. Type `"none"` is converted to `"single"` (expects 1 target from canvas).

### Complete Target Resolution Matrix

| Config cible | attack | auto | heal | save | buffDebuff |
|-------------|--------|------|------|------|-----------|
| **Aucune** | Roll, pas d'auto-apply DM | Roll, DM affichés | Soigne le lanceur | Force 1 cible | Attend 1 cible |
| **Soi-même** | Roll, targets pour difficulté | Roll | Soigne le lanceur | Save sur le lanceur | Effet sur le lanceur |
| **Unique, n=0, 0 cibles** | Roll sans cible | Roll sans cible | Soigne le lanceur | Bloque (force 1) | Bloque + warning |
| **Unique, n=0, 1 cible valide** | Roll avec cible | Roll avec cible | Soigne la cible | Save sur la cible | Effet sur la cible |
| **Unique, n=0, cibles rejetées** | Bloque + warning | Bloque + warning | Bloque + warning | Bloque + warning | Bloque + warning |
| **Unique, n=1+** | 1 cible obligatoire | 1 cible obligatoire | 1 cible obligatoire | 1 cible obligatoire | Via effet, attend cible |
| **Multiple, n=0** | Illimité, ≥1 obligatoire | Illimité, ≥1 obligatoire | Illimité, ≥1 obligatoire | Illimité, ≥1 obligatoire | Illimité |
| **Multiple, n=X** | 1 à X, obligatoire | 1 à X, obligatoire | 1 à X, obligatoire | 1 à X, obligatoire | 1 à X |

"Cibles rejetées" = l'utilisateur a ciblé des tokens mais ils ont tous été filtrés (mauvais scope ou trop nombreux).

### Scope Display in Attack Dialog

When `targetScope` is not `"all"`, the dialog shows:
- **Valid targets** normally (passed scope filter)
- **Invalid-scope targets** with CSS class `.invalid-scope` (opacity 0.5, red border) — the user sees which of their selected tokens won't be affected

This is built in `rollAttack()`: each token's disposition is checked directly against `targetScope` (FRIENDLY for allies, HOSTILE for enemies). Tokens in `dialogTargets` whose disposition doesn't match the scope are marked `invalidScope: true`. Any remaining `game.user.targets` tokens not already in `dialogTargets` are also added with `invalidScope: true`. This approach works even when `getResolverTargets` overrides the scope to `"all"` for `@oppose`/`@cible` difficulty resolution.
