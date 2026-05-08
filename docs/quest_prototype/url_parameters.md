# URL Parameters

The quest prototype reads query-string parameters from `window.location.search`
once at page load via `parseRuntimeConfig` in `src/runtime/runtime-config.ts`.
Parameters are not reactive: changing them requires a page reload.

## `battle`

Selects how battles resolve.

- `battle=playable` — battles are played interactively.
- Any other value (including absent, `battle=auto`, or unknown strings) — battles
  resolve automatically.

If `battle` is repeated in the query string (e.g. `?battle=playable&battle=auto`),
the value is treated as `auto`. A single `battle=playable` is the only form that
enables playable mode.

The `seed` and `startInBattle` parameters are honored only when `battle=playable`.

## `seed`

Overrides the battle RNG seed when in playable battle mode. The value must be a
non-negative integer literal (digits only). Examples of accepted values: `0`,
`42`, `12345`.

Rejected (treated as no override):

- Missing or empty (`seed=`)
- Non-integer (`seed=foo`, `seed=1.5`, `seed=1e3`)
- Negative (`seed=-5`)
- Present without `battle=playable`

## `startInBattle`

When set to exactly `1`, the prototype boots directly into a battle instead of
the normal Dreamcaller selection flow. Any other value (including `0`, `true`,
empty, or absent) leaves the normal start flow in place.

Honored only when `battle=playable`.

## Examples

```
http://localhost:5173/                                  # default: auto battles
http://localhost:5173/?battle=playable                  # playable battles
http://localhost:5173/?battle=playable&seed=42          # playable, fixed seed
http://localhost:5173/?battle=playable&startInBattle=1  # boot straight into battle
http://localhost:5173/?battle=playable&seed=7&startInBattle=1
```
