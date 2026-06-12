// Energy Rescale — Phase 2 integration lane: apply the Wave-2 ±1 power-tuning
// decisions produced by the analysis agents (/tmp/wave2-decisions/*.json) to the
// game data, deterministically and auditably.
//
// Decisions:
//   slice-*.json      — per card: { id, delta(-1|0|1), newPlayCost, abilityEdits[], rationale }
//   dreamcallers.json — per changed dreamcaller: { id, abilityEdits[], rationale }
//   dreamwell.json    — per dreamwell card: { id, name, order, energyAdded, rationale }
//
// abilityEdit = { find, replace, reason } — exact substring replacement scoped to
// that object's rendered-text block (find must be unique within the block).
//
// Usage: node scripts/energy-rescale-tune.mjs
// Then:  npm run setup-assets && node scripts/energy-rescale-double.mjs --hashes
//
// Writes an audit report to docs/energy_rescale/phase2_decisions.json.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const write = (p, s) => writeFileSync(join(ROOT, p), s);
const DEC_DIR = "/tmp/wave2-decisions";

const warnings = [];
const applied = { playCost: [], abilityEdits: [], dreamwell: [], dreamcaller: [] };

function loadDecisions(prefix) {
  const files = readdirSync(DEC_DIR).filter((f) => f.startsWith(prefix) && f.endsWith(".json"));
  let all = [];
  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(DEC_DIR, f), "utf8"));
      if (Array.isArray(data)) all = all.concat(data);
      else warnings.push(`${f}: not a JSON array`);
    } catch (e) {
      warnings.push(`${f}: parse error ${e.message}`);
    }
  }
  return all;
}

/** Split a tabula TOML into a head + array of `[[<section>]]` blocks; index by id. */
function parseBlocks(text, header) {
  const marker = `[[${header}]]`;
  const parts = text.split(marker);
  const head = parts[0];
  const blocks = parts.slice(1).map((b) => marker + b);
  const byId = new Map();
  blocks.forEach((b, idx) => {
    const m = b.match(/^\s*id\s*=\s*"([^"]+)"/m);
    if (m) byId.set(m[1].toLowerCase(), idx);
  });
  return { head, blocks, byId, marker };
}

function reassemble(parsed) {
  return parsed.head + parsed.blocks.join("");
}

/** Apply a single ±1 to an `energy-cost` line inside a card block. */
function applyPlayCost(block, id, delta, newPlayCost) {
  if (!delta) return block;
  // integer form: energy-cost = N
  const intRe = /^(energy-cost = )(\d+)\s*$/m;
  const strRe = /^(energy-cost = ")(\d+)(,\s*X")\s*$/m;
  let m = block.match(intRe);
  if (m) {
    const cur = Number(m[2]);
    let next = cur + delta;
    if (cur > 0 && next < 1) next = 1; // never drop a real cost below 1
    if (next < 0) next = 0;
    if (newPlayCost != null && newPlayCost !== next) {
      warnings.push(`${id}: agent newPlayCost ${newPlayCost} != computed ${next} (cur ${cur}, delta ${delta}); using ${next}`);
    }
    applied.playCost.push({ id, from: cur, to: next, delta });
    return block.replace(intRe, `$1${next}`);
  }
  m = block.match(strRe);
  if (m) {
    const cur = Number(m[2]);
    let next = Math.max(1, cur + delta);
    applied.playCost.push({ id, from: `${cur},X`, to: `${next},X`, delta });
    return block.replace(strRe, `$1${next}$3`);
  }
  // pure "X" or missing numeric cost — nothing to tune.
  warnings.push(`${id}: delta ${delta} requested but energy-cost has no numeric value (X-cost?) — skipped`);
  return block;
}

function applyAbilityEdits(block, id, edits, bucket) {
  if (!Array.isArray(edits)) return block;
  for (const e of edits) {
    if (!e || typeof e.find !== "string" || typeof e.replace !== "string") {
      warnings.push(`${id}: malformed abilityEdit skipped`);
      continue;
    }
    const occ = block.split(e.find).length - 1;
    if (occ === 0) {
      warnings.push(`${id}: abilityEdit find not present: ${JSON.stringify(e.find)}`);
      continue;
    }
    if (occ > 1) {
      warnings.push(`${id}: abilityEdit find ambiguous (${occ}x): ${JSON.stringify(e.find)} — skipped`);
      continue;
    }
    block = block.replace(e.find, e.replace);
    applied[bucket].push({ id, find: e.find, replace: e.replace, reason: e.reason });
  }
  return block;
}

// --- Cards: play-cost deltas + ability edits -------------------------------
function tuneCards() {
  const decisions = loadDecisions("slice-");
  const path = "data/tabula/cards_v2.toml";
  const parsed = parseBlocks(read(path), "cards");
  for (const d of decisions) {
    if (!d || !d.id) continue;
    const idx = parsed.byId.get(String(d.id).toLowerCase());
    if (idx === undefined) {
      warnings.push(`card ${d.id}: not found in cards_v2.toml`);
      continue;
    }
    let block = parsed.blocks[idx];
    block = applyPlayCost(block, d.id, Number(d.delta) || 0, d.newPlayCost);
    block = applyAbilityEdits(block, d.id, d.abilityEdits, "abilityEdits");
    parsed.blocks[idx] = block;
  }
  write(path, reassemble(parsed));
  console.log(`cards: ${decisions.length} decisions, ${applied.playCost.length} cost changes, ${applied.abilityEdits.length} ability edits`);
}

// --- Dreamcallers: ability-cost edits only ---------------------------------
function tuneDreamcallers() {
  const decisions = loadDecisions("dreamcallers");
  const path = "data/tabula/dreamcallers_v2.toml";
  const parsed = parseBlocks(read(path), "dreamcaller");
  for (const d of decisions) {
    if (!d || !d.id) continue;
    const idx = parsed.byId.get(String(d.id).toLowerCase());
    if (idx === undefined) {
      warnings.push(`dreamcaller ${d.id}: not found`);
      continue;
    }
    parsed.blocks[idx] = applyAbilityEdits(parsed.blocks[idx], d.id, d.abilityEdits, "dreamcaller");
  }
  write(path, reassemble(parsed));
  console.log(`dreamcallers: ${decisions.length} changed, ${applied.dreamcaller.length} ability edits`);
}

// --- Dreamwell: set energy-added per card ----------------------------------
function tuneDreamwell() {
  const decisions = loadDecisions("dreamwell");
  const path = "data/tabula/dreamwell.toml";
  const parsed = parseBlocks(read(path), "dreamwell");
  for (const d of decisions) {
    if (!d || !d.id || d.energyAdded == null) continue;
    const idx = parsed.byId.get(String(d.id).toLowerCase());
    if (idx === undefined) {
      warnings.push(`dreamwell ${d.id}: not found`);
      continue;
    }
    const re = /^(energy-added = )(\d+)\s*$/m;
    const m = parsed.blocks[idx].match(re);
    if (!m) {
      warnings.push(`dreamwell ${d.id}: no energy-added line`);
      continue;
    }
    const from = Number(m[2]);
    const to = Number(d.energyAdded);
    parsed.blocks[idx] = parsed.blocks[idx].replace(re, `$1${to}`);
    applied.dreamwell.push({ id: d.id, name: d.name, order: d.order, from, to, rationale: d.rationale });
  }
  write(path, reassemble(parsed));
  console.log(`dreamwell: ${applied.dreamwell.length} energy-added set`);
}

// --- Engine: opening energy 4 -> 5 (so turn 1 = 5/5, ramp +2 -> turn 2 = 7/7) ---
function tuneOpeningEnergy() {
  const path = "src/battle/engine/energy.ts";
  let c = read(path);
  if (!c.includes("export const OPENING_ENERGY = 4;")) {
    warnings.push("energy.ts: OPENING_ENERGY not at 4 (expected post-Wave1) — not changed");
    return;
  }
  c = c.replace("export const OPENING_ENERGY = 4;", "export const OPENING_ENERGY = 5;");
  c = c.replace(
    "This preserves the game's effective curve: 4 on turn 1, 6 on turn 2, and so on",
    "This preserves the game's effective curve: 5 on turn 1, 7 on turn 2, and so on",
  );
  write(path, c);
  console.log("energy.ts: OPENING_ENERGY 4 -> 5");
}

function writeReport() {
  const dir = "docs/energy_rescale";
  mkdirSync(join(ROOT, dir), { recursive: true });
  const report = {
    generated: "phase2 ±1 power tuning",
    summary: {
      cardCostChanges: applied.playCost.length,
      cardAbilityEdits: applied.abilityEdits.length,
      dreamcallerAbilityEdits: applied.dreamcaller.length,
      dreamwellSet: applied.dreamwell.length,
      warnings: warnings.length,
    },
    cardCostChanges: applied.playCost,
    cardAbilityEdits: applied.abilityEdits,
    dreamcallerAbilityEdits: applied.dreamcaller,
    dreamwell: applied.dreamwell,
    warnings,
  };
  write(join(dir, "phase2_decisions.json"), JSON.stringify(report, null, 2));
  console.log(`\nReport: ${dir}/phase2_decisions.json`);
}

tuneCards();
tuneDreamcallers();
tuneDreamwell();
tuneOpeningEnergy();
writeReport();

console.log(`\nWarnings: ${warnings.length}`);
warnings.slice(0, 40).forEach((w) => console.log("  ! " + w));
console.log("\nNext: npm run setup-assets && node scripts/energy-rescale-double.mjs --hashes");
