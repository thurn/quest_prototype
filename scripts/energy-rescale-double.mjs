// Energy Rescale — Phase 1 codemod: deterministically DOUBLE every energy value
// in the game (costs and production), leaving non-energy numbers (spark ✦, score
// ⍟, counters ⧗, deck-size band counts, the manual +1 max-energy debug stepper,
// and the cost<=0 / cost>0 scale-invariant guards) untouched.
//
// The energy glyph is always `●`, so every energy amount in rules text is anchored
// to it. Structured fields are `energy-cost` (cards) and `energy-added` (dreamwell).
//
// Usage:
//   node scripts/energy-rescale-double.mjs          # text transforms (run once)
//   node scripts/energy-rescale-double.mjs --hashes  # rewrite automation textHashes
//                                                     # AFTER `npm run setup-assets`
//
// NOT idempotent — running the text pass twice quadruples values. Run exactly once.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const write = (p, s) => writeFileSync(join(ROOT, p), s);

/** FNV-1a 32-bit hex (mirrors src/battle/automation/rules-text-hash.ts). */
function fnv1aHex(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

let opCount = 0;
const doubleStr = (n) => String(Number(n) * 2);

/** Apply `re` to `content`, doubling the digits captured by group `g`. Logs count. */
function dbl(content, re, label, g = 1) {
  let n = 0;
  const out = content.replace(re, (...args) => {
    n++;
    const groups = args.slice(0, -2); // drop offset + whole string
    const m = groups[0];
    const digits = groups[g];
    return m.replace(digits, doubleStr(digits));
  });
  console.log(`  ${label}: ${n}`);
  opCount += n;
  return out;
}

/** Exact single-occurrence replacement; throws if `find` is not present exactly once. */
function once(content, find, replace, label) {
  const parts = content.split(find);
  if (parts.length !== 2) {
    throw new Error(`once(${label}): expected exactly 1 match of ${JSON.stringify(find)}, found ${parts.length - 1}`);
  }
  console.log(`  ${label}: 1`);
  opCount += 1;
  return parts.join(replace);
}

// ---------------------------------------------------------------------------
// TOML energy data (the bulk). cards_v2 = energy-cost; dreamwell = energy-added;
// all four carry `N●` / `N maximum ●` energy in rendered-text.
// ---------------------------------------------------------------------------
const TOML_FILES = [
  "data/tabula/cards_v2.toml",
  "data/tabula/dreamcallers_v2.toml",
  "data/tabula/dreamwell.toml",
  "data/tabula/dreamsigns.toml",
];

function transformToml(path) {
  console.log(`\n[TOML] ${path}`);
  let c = read(path);
  // Structured integer fields.
  c = dbl(c, /^(\s*energy-cost\s*=\s*)(\d+)(\s*)$/gm, "energy-cost int", 2);
  // String costs "N,X" — double the numeric prefix; pure "X" is left untouched.
  c = dbl(c, /^(\s*energy-cost\s*=\s*")(\d+)(,\s*X"\s*)$/gm, "energy-cost \"N,X\"", 2);
  c = dbl(c, /^(\s*energy-added\s*=\s*)(\d+)(\s*)$/gm, "energy-added int", 2);
  // Rules-text energy: `N maximum ●` first (number not adjacent to ●), then `N●`.
  c = dbl(c, /(\d+)( maximum ●)/g, "N maximum ●", 1);
  c = dbl(c, /(\d+)(●)/g, "N●", 1);
  write(path, c);
}

// ---------------------------------------------------------------------------
// Automation tables: doc-comment / label ● amounts + the hardcoded edit amounts
// that must track the doubled card text.
// ---------------------------------------------------------------------------
function transformAutomationTable(path) {
  console.log(`\n[AUTOMATION] ${path}`);
  let c = read(path);
  // ● amounts in comments and string labels ("Gain 2●", "≤2● cost", "Reclaim 3●").
  c = dbl(c, /(\d+)( maximum ●)/g, "N maximum ●", 1);
  c = dbl(c, /(\d+)(●)/g, "N●", 1);
  // gainEnergyEdits(<side>, N) — current-energy gains.
  c = dbl(c, /(gainEnergyEdits\(\s*[A-Za-z_$][\w.$]*\s*,\s*)(\d+)(\s*\))/g, "gainEnergyEdits amount", 2);
  // ADJUST_MAX_ENERGY edit amount (e.g. The Brimming Well: opponent gains N max ●).
  c = dbl(c, /(kind:\s*"ADJUST_MAX_ENERGY"[^}]*?amount:\s*)(\d+)/g, "ADJUST_MAX_ENERGY amount", 2);
  // charactersInVoid(state, side, maxCost) — the ≤N● void-cost filter (3-arg form).
  c = dbl(c, /(charactersInVoid\([^)]*,\s*)(\d+)(\s*\))/g, "charactersInVoid maxCost", 2);
  write(path, c);
}

// ---------------------------------------------------------------------------
// Energy engine constants + ramp schedule.
// ---------------------------------------------------------------------------
function transformEnergyTs() {
  console.log(`\n[ENGINE] src/battle/engine/energy.ts`);
  let c = read("src/battle/engine/energy.ts");
  c = once(c, "export const OPENING_ENERGY = 2;", "export const OPENING_ENERGY = 4;", "OPENING_ENERGY 2->4");
  c = once(
    c,
    "return Math.min(OPENING_ENERGY + (turnNumber - 1), maxEnergyCap);",
    "return Math.min(OPENING_ENERGY + (turnNumber - 1) * 2, maxEnergyCap);",
    "ramp +1->+2 per turn",
  );
  write("src/battle/engine/energy.ts", c);
}

// ---------------------------------------------------------------------------
// maxEnergyCap 10 -> 20 across source + fixtures.
// ---------------------------------------------------------------------------
function transformCaps() {
  console.log(`\n[CAPS] maxEnergyCap 10->20`);
  for (const path of [
    "src/battle/integration/create-battle-init.ts",
    "src/battle/automation/basic-automation.test.ts",
    "src/battle/engine/handoff.test.ts",
    "src/multiplayer/battle-service.test.ts",
  ]) {
    let c = read(path);
    c = dbl(c, /(maxEnergyCap:\s*)(10)(\b)/g, `  ${path} maxEnergyCap:10`, 2);
    write(path, c);
  }
  let ai = read("src/battle/ai/use-battle-ai.ts");
  ai = once(ai, "const DEFAULT_MAX_ENERGY_CAP = 10;", "const DEFAULT_MAX_ENERGY_CAP = 20;", "DEFAULT_MAX_ENERGY_CAP 10->20");
  write("src/battle/ai/use-battle-ai.ts", ai);
  let initTest = read("src/battle/integration/create-battle-init.test.ts");
  initTest = once(initTest, "expect(first.maxEnergyCap).toBe(10);", "expect(first.maxEnergyCap).toBe(20);", "create-battle-init.test cap assertion");
  write("src/battle/integration/create-battle-init.test.ts", initTest);
}

// ---------------------------------------------------------------------------
// Merchant / journey cost-band classifiers — cost thresholds tied to the cost
// scale. Double them so a card keeps its band after costs double:
//   cheap <=1 -> <=2,  mid 2..3 -> 4..6,  big >=4 -> >=8.
// ---------------------------------------------------------------------------
function transformCostBands() {
  console.log(`\n[COST-BANDS]`);
  for (const path of ["src/journey_v2/trace/deckSnapshot.ts", "src/journey_v2/archetypes/categories.ts"]) {
    let c = read(path);
    c = once(c, 'if (cost <= 1) return "cheap";', 'if (cost <= 2) return "cheap";', `${path} cheap`);
    c = once(c, 'if (cost <= 3) return "mid";', 'if (cost <= 6) return "mid";', `${path} mid`);
    write(path, c);
  }
  let dm = read("src/journey_v2/signals/dreamsignMatch.ts");
  dm = once(dm, 'if (band === "cheap") return cost <= 1;', 'if (band === "cheap") return cost <= 2;', "dreamsignMatch cheap");
  dm = once(dm, 'if (band === "mid") return cost >= 2 && cost <= 3;', 'if (band === "mid") return cost >= 4 && cost <= 6;', "dreamsignMatch mid");
  dm = once(dm, "  return cost >= 4;", "  return cost >= 8;", "dreamsignMatch big");
  write("src/journey_v2/signals/dreamsignMatch.ts", dm);
}

// ---------------------------------------------------------------------------
// Test expectations that assert the doubled automation output.
// dawn-triggers.test asserts ADJUST_CURRENT_ENERGY amounts (the Dawn gainEnergy).
// ---------------------------------------------------------------------------
function transformTests() {
  console.log(`\n[TESTS]`);
  let c = read("src/battle/automation/dawn-triggers.test.ts");
  c = dbl(c, /(kind:\s*"ADJUST_CURRENT_ENERGY"[^}]*?amount:\s*)(\d+)/g, "dawn-triggers ADJUST_CURRENT_ENERGY amount", 2);
  write("src/battle/automation/dawn-triggers.test.ts", c);
}

// ---------------------------------------------------------------------------
// Hash pass — recompute textHash for every registered automation entry from the
// regenerated runtime catalog. Run AFTER `npm run setup-assets`.
// ---------------------------------------------------------------------------
function rewriteHashes() {
  console.log(`\n[HASHES] recomputing battle-card automation textHashes`);
  const json = JSON.parse(read("public/cards_v2-data.json"));
  const byId = new Map(json.map((c) => [c.id, c.renderedText]));
  const path = "src/battle/automation/battle-card-effects-table.ts";
  const lines = read(path).split("\n");
  let curId = null;
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const idm = lines[i].match(/^\s*id:\s*"([0-9a-fA-F-]{36})"/);
    if (idm) curId = idm[1];
    const thm = lines[i].match(/^(\s*textHash:\s*")([0-9a-f]{8})("[,\s]*)$/);
    if (thm && curId) {
      const text = byId.get(curId);
      if (text === undefined) {
        console.warn(`  WARN no runtime text for ${curId}`);
        continue;
      }
      const h = fnv1aHex(text);
      if (h !== thm[2]) {
        lines[i] = thm[1] + h + thm[3];
        n++;
      }
    }
  }
  write(path, lines.join("\n"));
  console.log(`  textHashes rewritten: ${n}`);
}

// ---------------------------------------------------------------------------
function main() {
  if (process.argv.includes("--hashes")) {
    rewriteHashes();
    return;
  }
  TOML_FILES.forEach(transformToml);
  transformAutomationTable("src/battle/automation/battle-card-effects-table.ts");
  transformAutomationTable("src/battle/automation/dreamwell-effects-table.ts");
  transformEnergyTs();
  transformCaps();
  transformCostBands();
  transformTests();
  console.log(`\nDONE. Total operations: ${opCount}`);
  console.log("Next: `npm run setup-assets` then `node scripts/energy-rescale-double.mjs --hashes`");
}

main();
