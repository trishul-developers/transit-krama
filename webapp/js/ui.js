// ============================================================================
// 10. POINTER & TOUCH INPUT (WITH DIRECT BAY UNLOCK TAP!)
// ============================================================================
function findHitLockedBay(gx, gy) {
  for (const bay of levelState.waitingBays) {
    if (bay.isUnlocked) continue;
    const bayC = getBayCenter(bay.index, TOTAL_BAY_SLOTS, islandBounds);
    if (Math.abs(gx - bayC.x) <= 0.85 && Math.abs(gy - bayC.y) <= 1.25) {
      return bay;
    }
  }
  return null;
}

function findHitVehicle(gx, gy) {
  const candidates = [];
  const margin = 0.36;
  Object.values(levelState.vehicles).forEach(v => {
    if (v.state !== "PARKED" || movingVehicles.has(v.id)) return;
    const dx = gx - v.anchorX;
    const dy = gy - v.anchorY;
    const localFwd = Math.abs(dx * v.direction.dx + dy * v.direction.dy);
    const localLat = Math.abs(dx * v.direction.ndx + dy * v.direction.ndy);
    if (localFwd <= v.length / 2 + margin && localLat <= v.width / 2 + margin) {
      candidates.push({ v, dist: Math.hypot(dx, dy), clear: checkRaycast(levelState, v.id).isClear });
    }
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.clear !== b.clear) return a.clear ? -1 : 1;
    return a.dist - b.dist;
  });
  return candidates[0].v;
}

let pointerDownPos = null;
let pressedVehicleId = null;
let pressedLockedBayIndex = null;

if (gameCanvas) {
  gameCanvas.addEventListener("pointerdown", e => {
    const rect = gameCanvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * dpr;
    const sy = (e.clientY - rect.top) * dpr;
    pointerDownPos = { x: e.clientX, y: e.clientY };
    const { gx, gy } = toWorld(sx, sy);
    const hitBay = findHitLockedBay(gx, gy);
    if (hitBay) {
      pressedLockedBayIndex = hitBay.index;
      return;
    }
    const hit = findHitVehicle(gx, gy);
    if (hit) {
      pressedVehicleId = hit.id;
      inspectedVehicleId = hit.id;
      inspectRaycast = checkRaycast(levelState, hit.id);
    }
  });

  gameCanvas.addEventListener("pointermove", e => {
    const rect = gameCanvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * dpr;
    const sy = (e.clientY - rect.top) * dpr;
    const { gx, gy } = toWorld(sx, sy);
    const hit = findHitVehicle(gx, gy);
    if (hit) {
      inspectedVehicleId = hit.id;
      inspectRaycast = checkRaycast(levelState, hit.id);
    } else if (!pressedVehicleId) {
      inspectedVehicleId = null;
      inspectRaycast = null;
    }
  });

  gameCanvas.addEventListener("pointerup", e => {
    const hitId = pressedVehicleId;
    const hitBayIdx = pressedLockedBayIndex;
    pressedVehicleId = null;
    pressedLockedBayIndex = null;
    inspectedVehicleId = null;
    inspectRaycast = null;

    if (pointerDownPos) {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist <= 40) {
        if (hitBayIdx !== null) {
          doPowerUpVipBay(hitBayIdx);
        } else if (hitId) {
          onVehicleTap(hitId);
        }
      }
    }
    pointerDownPos = null;
  });
}

// ============================================================================
// 11. UI SYNCHRONIZATION & EVENT LISTENERS
// ============================================================================
function computeLeadRun(queue) {
  if (!queue || queue.length === 0) return 0;
  const firstCol = queue[0].color;
  let c = 0;
  for (const p of queue) {
    if (p.color === firstCol) c++;
    else break;
  }
  return c;
}

function renderHomeScreen() {
  if (typeof document === "undefined") return;
  document.getElementById("homeGoldText").textContent = `${profile.gold}`;
  document.getElementById("homeStreakText").textContent = `${profile.winStreak}x Krama`;

  const saved = profile.savedMidLevelState;
  const btnResume = document.getElementById("btnResumeGame");
  if (saved && saved.levelId) {
    btnResume.classList.remove("hidden");
    document.getElementById("resumeBtnText").textContent = `RESUME LEVEL ${saved.levelId}`;
  } else {
    btnResume.classList.add("hidden");
  }

  const curLvl = profile.currentLevel;
  const tierKey = curLvl % 10 === 0 ? "BOSS" : (curLvl % 5 === 0 ? "HARD" : "NORMAL");
  document.getElementById("playBtnText").textContent = `PLAY LEVEL ${curLvl}`;
  document.getElementById("playBtnTierBadge").textContent = TIER_INFO[tierKey].name;
  document.getElementById("unlockedCountText").textContent = `${Math.min(100, profile.maxUnlockedLevel)} / 100 Unlocked`;

  const grid = document.getElementById("levelGridContainer");
  grid.innerHTML = "";
  for (let lvl = 1; lvl <= 100; lvl++) {
    const isUnlocked = lvl <= profile.maxUnlockedLevel;
    const isCurrent = lvl === profile.currentLevel;
    const isCompleted = lvl < profile.maxUnlockedLevel;
    const isBoss = lvl % 10 === 0;
    const isHard = lvl % 5 === 0 && !isBoss;

    let bgClass = "bg-slate-800/70 border-slate-700/60 text-slate-500";
    if (isCurrent) {
      bgClass = "bg-sky-600 border-sky-300 text-white shadow-md ring-2 ring-sky-400/50";
    } else if (isCompleted) {
      bgClass = isBoss ? "bg-purple-900/90 border-emerald-400 text-white"
              : (isHard ? "bg-orange-900/90 border-emerald-400 text-white" : "bg-emerald-900/80 border-emerald-400/80 text-white");
    } else if (isUnlocked) {
      bgClass = isBoss ? "bg-purple-800/85 border-purple-400 text-white"
              : (isHard ? "bg-orange-800/85 border-orange-400 text-white" : "bg-slate-800 border-slate-600 text-white");
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.disabled = !isUnlocked;
    btn.className = `btn-3d h-12 rounded-xl border flex flex-col items-center justify-center transition ${bgClass}`;
    btn.innerHTML = isUnlocked
      ? `<span class="text-xs font-black leading-none">${lvl}</span>
         <span class="text-[9px] mt-0.5 leading-none">${isCompleted ? "✅" : (isBoss ? "👑" : (isHard ? "⭐" : "•"))}</span>`
      : `<span class="text-[10px] opacity-60">🔒</span>`;
    btn.addEventListener("click", () => {
      if (isUnlocked) startLevel(lvl);
    });
    grid.appendChild(btn);
  }
}

function updateGameHud() {
  if (typeof document === "undefined") return;
  const tier = TIER_INFO[levelState.difficultyTier] || TIER_INFO.NORMAL;
  const isBoss = levelState.difficultyTier === "BOSS";
  const isHard = levelState.difficultyTier === "HARD";
  const tierPrefix = isBoss ? "👑 " : (isHard ? "⭐ " : "");
  document.getElementById("hudLevelText").textContent = `Level ${levelState.levelId}`;
  document.getElementById("hudTierText").textContent = `${tierPrefix}${tier.name.toUpperCase()}`;
  // Keep shared Royal Blue main HUD badge style across all levels so the header never clashes with the orange streak badge!
  document.getElementById("hudLevelFace").style.backgroundColor = "#1D7DFA";
  document.getElementById("hudLevelLip").style.backgroundColor = "#0D4DA6";

  const streakBox = document.getElementById("hudStreakBox");
  if (profile.winStreak > 0) {
    streakBox.classList.remove("hidden");
    document.getElementById("hudStreakText").textContent = `${profile.winStreak}x`;
  } else {
    streakBox.classList.add("hidden");
  }

  const queue = levelState.passengerQueue;
  const qLen = queue.length * CROWD_MULT + activeBoarders.length;
  const leadRun = computeLeadRun(queue) * CROWD_MULT;
  const leadColorKey = queue.length > 0 ? queue[0].color : "BLUE";
  const leadHex = LIVERY_PALETTE[leadColorKey].bodyTop;

  document.getElementById("hudQueueCountText").textContent = `${qLen} Left`;
  document.getElementById("hudQueueDot").style.backgroundColor = leadHex;
  const runBadge = document.getElementById("hudLeadRunBadge");
  if (leadRun > 0) {
    runBadge.classList.remove("hidden");
    runBadge.textContent = `x${leadRun}`;
    runBadge.style.backgroundColor = leadHex;
  } else {
    runBadge.classList.add("hidden");
  }

  const totalInit = levelState.initialQueueSize * CROWD_MULT;
  const progPct = totalInit > 0
    ? Math.max(0, Math.min(100, (qLen / totalInit) * 100))
    : 0;
  const progBar = document.getElementById("hudQueueProgressBar");
  progBar.style.width = `${progPct}%`;
  progBar.style.backgroundColor = leadHex;

  document.getElementById("hudGoldText").textContent = `${profile.gold}`;
  document.getElementById("priceUndo").textContent = `${POWER_COSTS.UNDO}$`;
  document.getElementById("priceVip").textContent = `${POWER_COSTS.VIP}$`;
  document.getElementById("priceMagnet").textContent = `${POWER_COSTS.MAGNET}$`;
  document.getElementById("priceShuffle").textContent = `${POWER_COSTS.SHUFFLE}$`;
  document.getElementById("priceAirlift").textContent = `${POWER_COSTS.AIRLIFT}$`;

  const hasVip = levelState.waitingBays.some(b => !b.isUnlocked);
  const hasInBay = Object.values(levelState.vehicles).some(v => v.state === "IN_BAY");
  const hasParked = Object.values(levelState.vehicles).some(v => v.state === "PARKED");

  document.getElementById("btnPowerUndo").disabled = !(historyStack.length > 0 && profile.gold >= POWER_COSTS.UNDO);
  document.getElementById("btnPowerVip").disabled = !(hasVip && profile.gold >= POWER_COSTS.VIP);
  document.getElementById("btnPowerMagnet").disabled = !(hasInBay && profile.gold >= POWER_COSTS.MAGNET);
  document.getElementById("btnPowerShuffle").disabled = !(hasParked && profile.gold >= POWER_COSTS.SHUFFLE);
  document.getElementById("btnPowerAirlift").disabled = !(hasParked && profile.gold >= POWER_COSTS.AIRLIFT);

  const speedFace = document.getElementById("speedBtnFace");
  const speedBadge = document.getElementById("speedBtnBadge");
  const speedTitle = document.getElementById("speedBtnTitle");
  if (isFastForward) {
    speedFace.className = "bg-emerald-500 border border-emerald-300 rounded-[9px] h-[52px] flex flex-col items-center justify-between py-1 px-1";
    speedTitle.className = "text-[9px] font-extrabold text-white leading-none";
    speedBadge.className = "px-1.5 py-[1px] rounded bg-emerald-800 text-[8.5px] font-black text-white";
    speedBadge.textContent = "3x";
  } else {
    speedFace.className = "bg-slate-50 border border-slate-200 rounded-[9px] h-[52px] flex flex-col items-center justify-between py-1 px-1";
    speedTitle.className = "text-[9px] font-extrabold text-slate-800 leading-none";
    speedBadge.className = "px-1.5 py-[1px] rounded bg-sky-100 text-[8.5px] font-black text-sky-700";
    speedBadge.textContent = "1x";
  }
}

function openForecastModal() {
  if (typeof document === "undefined") return;
  const queue = levelState.passengerQueue;
  const totalPassengers = queue.length * CROWD_MULT;
  const inRoundaboutPassengers = queue.filter(p => p.zone === "ROUNDABOUT").length * CROWD_MULT;
  const inChutePassengers = queue.filter(p => p.zone === "FEEDER").length * CROWD_MULT;

  document.getElementById("forecastSubText").textContent =
    `${totalPassengers} total • ${inRoundaboutPassengers} in Roundabout • ${inChutePassengers} in Feeder Chute`;
  const listEl = document.getElementById("forecastList");
  listEl.innerHTML = "";

  // Group contiguous runs and track whether each run starts in the Roundabout or Feeder Chute
  const runs = [];
  queue.forEach((p, rowIdx) => {
    if (runs.length > 0 && runs[runs.length - 1].color === p.color) {
      runs[runs.length - 1].count += CROWD_MULT;
      runs[runs.length - 1].rows += 1;
    } else {
      runs.push({
        color: p.color,
        count: CROWD_MULT,
        rows: 1,
        startRow: rowIdx,
        inRoundabout: p.zone === "ROUNDABOUT"
      });
    }
  });

  // 1. Visual Color Proportional Strip Bar at top of modal
  if (runs.length > 0) {
    const stripWrap = document.createElement("div");
    stripWrap.className = "bg-slate-800/95 border border-slate-700 rounded-2xl p-3 mb-1 flex flex-col gap-2";
    const segsHtml = runs.slice(0, 12).map(r => {
      const liv = LIVERY_PALETTE[r.color];
      const pct = Math.max(6, Math.round((r.count / Math.max(1, totalPassengers)) * 100));
      return `<div style="width:${pct}%;background:${liv.bodyTop}" class="h-3 first:rounded-l-full last:rounded-r-full border-r border-slate-900/40" title="${liv.name}: ${r.count}"></div>`;
    }).join("");
    stripWrap.innerHTML = `
      <div class="flex items-center justify-between text-[10px] font-bold text-slate-300">
        <span>🔄 Gate &amp; Roundabout Order</span>
        <span>↗️ Feeder Chute</span>
      </div>
      <div class="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-slate-600/80">${segsHtml}</div>
    `;
    listEl.appendChild(stripWrap);
  }

  // 2. Detailed Readable Crowd Group Cards (No cryptic shape names!)
  runs.forEach((run, idx) => {
    const liv = LIVERY_PALETTE[run.color];
    const zoneLabel = idx === 0
      ? "AT BOARDING GATE"
      : (run.inRoundabout ? "REVOLVING IN ROUNDABOUT" : "WAITING IN FEEDER CHUTE");
    const zoneBadgeClass = idx === 0
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      : (run.inRoundabout ? "bg-sky-500/20 text-sky-300 border-sky-500/40" : "bg-slate-700/60 text-slate-300 border-slate-600");

    // Helpful bus capacity hint (16 = Small Car, 24 = Medium Bus, 32 = Large Bus)
    let busHint = `${run.rows} ${run.rows === 1 ? "Row" : "Rows"} of 4`;
    if (run.count === 16) busHint += " • Fits 1 Small Car (16)";
    else if (run.count === 24) busHint += " • Fits 1 Medium Bus (24)";
    else if (run.count === 32) busHint += " • Fits 1 Large Bus (32)";
    else if (run.count === 40) busHint += " • Fits 1 Jumbo Bus (40)";

    const row = document.createElement("div");
    row.className = "flex items-center justify-between bg-slate-800/90 border border-slate-700/90 rounded-2xl px-3.5 py-2.5";
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl border-2 border-white/80 shadow flex items-center justify-center text-xs font-black text-white shrink-0" style="background:${liv.bodyTop}">
          #${idx + 1}
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-black text-white">${liv.name} Passengers</span>
            <span class="px-1.5 py-0.5 rounded border text-[8.5px] font-extrabold uppercase ${zoneBadgeClass}">${zoneLabel}</span>
          </div>
          <span class="text-[10px] font-semibold text-slate-400 mt-0.5">${busHint}</span>
        </div>
      </div>
      <div class="px-2.5 py-1 rounded-xl text-xs font-black text-white shadow shrink-0" style="background:${liv.bodyTop}">
        👥 ${run.count}
      </div>
    `;
    listEl.appendChild(row);
  });

  document.getElementById("forecastModal").classList.remove("hidden");
}

if (typeof document !== "undefined") {
  document.getElementById("btnPlayCurrentLevel").addEventListener("click", () => startLevel(profile.currentLevel));
  document.getElementById("btnResumeGame").addEventListener("click", () => {
    if (profile.savedMidLevelState) startLevel(profile.savedMidLevelState.levelId, profile.savedMidLevelState);
    else startLevel(profile.currentLevel);
  });
  document.getElementById("btnUnlockAllToggle").addEventListener("click", () => {
    profile.maxUnlockedLevel = 100;
    saveProfile();
    renderHomeScreen();
  });
  document.getElementById("btnHomeNightToggle").addEventListener("click", () => {
    profile.settings.nightMode = !profile.settings.nightMode;
    syncSettingsToEngine();
    saveProfile();
  });
  document.getElementById("btnHomeSettings").addEventListener("click", () => {
    document.getElementById("settingsModal").classList.remove("hidden");
  });

  document.getElementById("btnBackToHome").addEventListener("click", () => {
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("flex");
    document.getElementById("homeScreen").classList.remove("hidden");
    document.getElementById("homeScreen").classList.add("flex");
    renderHomeScreen();
  });

  document.getElementById("btnOpenForecast").addEventListener("click", openForecastModal);
  document.getElementById("btnCloseForecast").addEventListener("click", () => {
    document.getElementById("forecastModal").classList.add("hidden");
  });

  document.getElementById("btnHint").addEventListener("click", doRequestHint);
  document.getElementById("btnNightMode").addEventListener("click", () => {
    profile.settings.nightMode = !profile.settings.nightMode;
    syncSettingsToEngine();
    saveProfile();
  });
  document.getElementById("btnRestartLevel").addEventListener("click", () => startLevel(levelState.levelId));
  document.getElementById("btnGameSettings").addEventListener("click", () => {
    document.getElementById("settingsModal").classList.remove("hidden");
  });
  document.getElementById("btnCloseSettings").addEventListener("click", () => {
    document.getElementById("settingsModal").classList.add("hidden");
  });

  document.getElementById("btnPowerUndo").addEventListener("click", doPowerUpUndo);
  document.getElementById("btnPowerVip").addEventListener("click", () => doPowerUpVipBay(null));
  document.getElementById("btnPowerMagnet").addEventListener("click", doPowerUpMagnet);
  document.getElementById("btnPowerShuffle").addEventListener("click", doPowerUpShuffle);
  document.getElementById("btnPowerAirlift").addEventListener("click", doPowerUpAirlift);
  document.getElementById("btnToggleSpeed").addEventListener("click", () => {
    isFastForward = !isFastForward;
    updateGameHud();
  });

  document.getElementById("btnNextLevel").addEventListener("click", () => {
    const nextLvl = Math.min(100, levelState.levelId + 1);
    startLevel(nextLvl);
  });

  document.getElementById("btnRescueVip").addEventListener("click", () => doPowerUpVipBay(null));
  document.getElementById("btnRescueMagnet").addEventListener("click", doPowerUpMagnet);
  document.getElementById("btnRescueRetry").addEventListener("click", () => {
    profile.winStreak = 0;
    profile.savedMidLevelState = null;
    saveProfile();
    startLevel(levelState.levelId);
  });

  ["chkSound", "chkHaptics", "chkColorblind", "chkNightMode", "chkAutoFast"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      profile.settings.soundEnabled = document.getElementById("chkSound").checked;
      profile.settings.hapticsEnabled = document.getElementById("chkHaptics").checked;
      profile.settings.colorblindMode = document.getElementById("chkColorblind").checked;
      profile.settings.nightMode = document.getElementById("chkNightMode").checked;
      profile.settings.autoFastForward = document.getElementById("chkAutoFast").checked;
      syncSettingsToEngine();
      saveProfile();
    });
  });

    document.getElementById("btnIconChoice2").addEventListener("click", () => {
    applyIconChoice("choice2", true);
    saveProfile();
    showToast("Primary Icon (Choice 2) Active");
  });
  document.getElementById("btnIconChoice1").addEventListener("click", () => {
    applyIconChoice("choice1", true);
    saveProfile();
    showToast("Alternative Icon (Choice 1) Active");
  });

  document.getElementById("btnResetProgress").addEventListener("click", () => {
    profile = {
      currentLevel: 1,
      maxUnlockedLevel: 1,
      gold: 80,
      winStreak: 0,
      bestStreak: 0,
      settings: profile.settings,
      savedMidLevelState: null
    };
    saveProfile();
    document.getElementById("settingsModal").classList.add("hidden");
    startLevel(1);
  });

  window.onload = () => {
    loadProfile();
    renderHomeScreen();
    if (profile.savedMidLevelState && profile.savedMidLevelState.levelId) {
      startLevel(profile.savedMidLevelState.levelId, profile.savedMidLevelState);
    } else {
      startLevel(profile.currentLevel || 1);
    }
    requestAnimationFrame(stepFrame);
  };
}
