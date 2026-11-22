import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const jsFiles = [
  "js/levels.js",
  "js/audio.js",
  "js/engine.js",
  "js/renderer.js",
  "js/ui.js"
];

for (const rel of jsFiles) {
  const source = read(rel);
  assert.doesNotThrow(() => new vm.Script(source, { filename: rel }), `${rel} must parse`);
}

const html = read("index.html");
assert.match(html, /css\/styles\.css/, "base stylesheet must remain linked");
assert.match(html, /css\/overhaul\.css/, "overhaul stylesheet must be linked");
assert.ok(!html.includes("styles.css>\\n<link"), "stylesheet tags must not contain a literal newline escape");
assert.match(html, /id="gameCanvas"/, "game canvas must exist");
assert.match(html, /id="hudTopBar"/, "game HUD must exist");
assert.match(html, /id="hudBottomDock"/, "booster dock must exist");

const serviceWorker = read("sw.js");
assert.match(serviceWorker, /css\/overhaul\.css/, "offline cache must include the overhaul stylesheet");
assert.match(serviceWorker, /transit-krama-experience-v4/, "offline cache version must be bumped for the overhaul");

for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = match[1];
  if (ref.startsWith("data:") || ref.startsWith("http") || ref.startsWith("#")) continue;
  const clean = ref.split(/[?#]/)[0];
  if (!clean || clean === "manifest.json" || clean.startsWith("icons/")) continue;
  assert.ok(fs.existsSync(path.join(root, clean)), `referenced asset must exist: ${clean}`);
}

const context = vm.createContext({
  console,
  performance: { now: () => 0 },
  setTimeout: () => 0,
  clearTimeout: () => {},
  Math,
  Date
});

vm.runInContext(
  read("js/levels.js") +
  "\n;globalThis.__tkLevels = RAW_LEVELS; globalThis.__tkDecodeLevel = decodeLevel;",
  context,
  { filename: "js/levels.js" }
);

assert.equal(context.__tkLevels.length, 100, "campaign must still contain exactly 100 levels");

for (let levelId = 1; levelId <= 100; levelId++) {
  const state = context.__tkDecodeLevel(levelId);
  assert.equal(state.levelId, levelId);
  assert.equal(state.waitingBays.length, 8, `level ${levelId} must retain 8 waiting bays`);
  assert.ok(state.gridWidth > 0 && state.gridHeight > 0, `level ${levelId} grid must be valid`);
  assert.ok(Object.keys(state.vehicles).length > 0, `level ${levelId} must contain vehicles`);
  assert.ok(state.passengerQueue.length > 0, `level ${levelId} must contain passengers`);
  assert.ok(Array.isArray(state.verifiedSolutionTrace), `level ${levelId} must retain its verified trace`);

  const allVehicleIds = new Set(Object.keys(state.vehicles));
  for (const tunnel of state.tunnels) {
    for (const vehicle of tunnel.spawnQueue) {
      assert.ok(!allVehicleIds.has(vehicle.id), `level ${levelId} duplicate vehicle id ${vehicle.id}`);
      allVehicleIds.add(vehicle.id);
    }
  }
}

vm.runInContext(read("js/audio.js"), context, { filename: "js/audio.js" });
vm.runInContext(
  read("js/engine.js") +
  "\n;globalThis.__tkCheckRaycast = checkRaycast; globalThis.__tkLevelState = levelState;",
  context,
  { filename: "js/engine.js" }
);

const firstState = context.__tkLevelState;
for (const vehicle of Object.values(firstState.vehicles)) {
  if (vehicle.state !== "PARKED") continue;
  const ray = context.__tkCheckRaycast(firstState, vehicle.id);
  assert.equal(typeof ray.isClear, "boolean");
  assert.ok(Number.isFinite(ray.exitDistance), `raycast exit distance must be finite for ${vehicle.id}`);
  if (ray.firstBlocker) assert.equal(typeof ray.firstBlocker.id, "string");
}

vm.runInContext(
  read("js/renderer.js") +
  "\n;globalThis.__tkMotion = { MOTION_TUNING, getMotionStep, approachScalar };",
  context,
  { filename: "js/renderer.js" }
);

const { MOTION_TUNING, getMotionStep } = context.__tkMotion;
assert.ok(MOTION_TUNING.cruiseSpeed < 15.5, "overhaul must reduce the old instant cruise speed");
assert.ok(MOTION_TUNING.turnRate < 980, "overhaul must reduce the old snap turn rate");

const anim = { speed: 0 };
let previousSpeed = 0;
for (let i = 0; i < 20; i++) {
  const step = getMotionStep(anim, 8, 1 / 60, "PERIMETER_HIGHWAY");
  assert.ok(step > 0, "moving vehicle must advance");
  assert.ok(anim.speed >= previousSpeed - 1e-9, "vehicle should accelerate smoothly on a clear long segment");
  assert.ok(anim.speed <= MOTION_TUNING.cruiseSpeed + 1e-9, "vehicle must respect cruise cap");
  previousSpeed = anim.speed;
}

anim.speed = MOTION_TUNING.cruiseSpeed;
const nearStep = getMotionStep(anim, 0.12, 1 / 60, "PARK_IN_BAY");
assert.ok(nearStep <= 0.12 + 1e-9, "motion step must never overshoot its waypoint");
assert.ok(anim.speed < MOTION_TUNING.cruiseSpeed, "vehicle should brake near a parking waypoint");

console.log("Transit Krama smoke tests: PASS");
console.log("  - JavaScript parse gate");
console.log("  - HTML/local asset integrity");
console.log("  - 100 campaign levels decode");
console.log("  - raycast contract across level 1");
console.log("  - acceleration/braking motion invariants");
