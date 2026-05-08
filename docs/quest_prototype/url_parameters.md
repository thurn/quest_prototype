# URL Parameters

The quest prototype reads query-string parameters from `window.location.search`
once at page load via `parseRuntimeConfig` in `src/runtime/runtime-config.ts`.
Parameters are not reactive: changing them requires a page reload.

## `seed`

Overrides the battle RNG seed. The value must be a non-negative integer literal
(digits only). Examples of accepted values: `0`, `42`, `12345`.

Rejected (treated as no override):

- Missing or empty (`seed=`)
- Non-integer (`seed=foo`, `seed=1.5`, `seed=1e3`)
- Negative (`seed=-5`)

## `startInBattle`

When set to exactly `1`, the prototype boots directly into a battle instead of
the normal Dreamcaller selection flow. Any other value (including `0`, `true`,
empty, or absent) leaves the normal start flow in place.

## Examples

```
http://localhost:5173/                        # default
http://localhost:5173/?seed=42                # fixed seed
http://localhost:5173/?startInBattle=1        # boot straight into battle
http://localhost:5173/?seed=7&startInBattle=1
```
