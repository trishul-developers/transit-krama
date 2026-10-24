// ============================================================================
// 8. HIGH-DPI 2.5D/3D VOLUMETRIC CANVAS RENDERER (1:1 BUS FEVER PARTY VISUALS)
// ============================================================================
const gameCanvas = typeof document !== "undefined" ? document.getElementById("gameCanvas") : null;
const ctx = gameCanvas ? gameCanvas.getContext("2d") : null;
let dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 2;
let viewTransform = { scale: 36, offsetX: 0, offsetY: 0, minX: 0, maxY: 24 };
let animTime = 0;

function computeViewportTransform(canvasW, canvasH, bounds) {
  const cx = (bounds.left + bounds.right) / 2;
  const halfSpanX = Math.max((bounds.right - bounds.left) / 2 + 1.05, 5.55);
  const minX = cx - halfSpanX;
  const maxX = cx + halfSpanX;
  const minY = bounds.bottom - 0.65;
  const maxY = bounds.parkTopY + 0.35;

  const worldW = maxX - minX;
  const worldH = maxY - minY;
  const padV = 8 * dpr;
  const availW = canvasW;
  const availH = Math.max(100, canvasH - padV * 2);

  const scale = Math.min(availW / worldW, availH / worldH);
  const offsetX = (canvasW - worldW * scale) / 2;
  const offsetY = padV + (availH - worldH * scale) / 2;
  return { scale, offsetX, offsetY, minX, maxY, worldW, worldH };
}

function toScreen(gx, gy) {
  return {
    x: viewTransform.offsetX + (gx - viewTransform.minX) * viewTransform.scale,
    y: viewTransform.offsetY + (viewTransform.maxY - gy) * viewTransform.scale
  };
}

function toWorld(sx, sy) {
  return {
    gx: viewTransform.minX + (sx - viewTransform.offsetX) / viewTransform.scale,
    gy: viewTransform.maxY - (sy - viewTransform.offsetY) / viewTransform.scale
  };
}

function resizeCanvas() {
  if (!gameCanvas) return;
  const rect = gameCanvas.parentElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  gameCanvas.width = Math.floor(rect.width * dpr);
  gameCanvas.height = Math.floor(rect.height * dpr);
  viewTransform = computeViewportTransform(gameCanvas.width, gameCanvas.height, islandBounds);
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", resizeCanvas);
}

function drawRoundedRect(c, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

// Helper to stroke the Stadium-Oval Loop + Top-Right Feeder Chute
function traceStadiumOvalPath(c, m) {
  const lCx = toScreen(m.cx - m.straightHalf, m.cy).x;
  const rCx = toScreen(m.cx + m.straightHalf, m.cy).x;
  const cY = toScreen(m.cx, m.cy).y;
  const rPx = m.curveR * viewTransform.scale;

  c.beginPath();
  c.arc(lCx, cY, rPx, Math.PI * 0.5, Math.PI * 1.5, false);
  c.arc(rCx, cY, rPx, Math.PI * 1.5, Math.PI * 0.5, false);
  c.closePath();
}

function drawGlossy3DPerson(c, sx, sy, colorKey, scalePx, strideSwing, isSmiley) {
  const liv = LIVERY_PALETTE[colorKey] || LIVERY_PALETTE.BLUE;
  const r = scalePx;

  // 1. Ground shadow
  c.fillStyle = "rgba(15, 23, 42, 0.26)";
  c.beginPath();
  c.ellipse(sx, sy + r * 0.55, r * 0.85, r * 0.45, 0, 0, Math.PI * 2);
  c.fill();

  // 2. Waddling feet
  const lFootY = sy + r * 0.45 + strideSwing * r * 0.28;
  const rFootY = sy + r * 0.45 - strideSwing * r * 0.28;
  c.fillStyle = liv.outline;
  c.beginPath(); c.arc(sx - r * 0.34, lFootY, r * 0.25, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(sx + r * 0.34, rFootY, r * 0.25, 0, Math.PI * 2); c.fill();

  // 3. Plump 3D Shoulders / Torso with dark 3D skirt & outline
  c.fillStyle = liv.chassisSkirt;
  c.beginPath();
  c.ellipse(sx, sy + r * 0.16, r * 0.88, r * 0.62, 0, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = Math.max(1.2, r * 0.16);
  c.strokeStyle = liv.outline;
  c.stroke();

  c.fillStyle = liv.bodyTop;
  c.beginPath();
  c.ellipse(sx, sy + r * 0.04, r * 0.84, r * 0.56, 0, 0, Math.PI * 2);
  c.fill();

  // 4. Big Glossy 3D Spherical Head (Bus Fever Party signature look!)
  const headY = sy - r * 0.36;
  const headR = r * 0.76;
  c.fillStyle = liv.bodyTop;
  c.beginPath();
  c.arc(sx, headY, headR, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = Math.max(1.2, r * 0.16);
  c.strokeStyle = liv.outline;
  c.stroke();

  // 5. Specular highlight on upper-left of head
  c.fillStyle = "rgba(255, 255, 255, 0.55)";
  c.beginPath();
  c.ellipse(sx - headR * 0.30, headY - headR * 0.32, headR * 0.32, headR * 0.20, -0.5, 0, Math.PI * 2);
  c.fill();

  // 6. Optional cute smiley face badge (exact Bus Fever Party detail!)
  if (isSmiley) {
    c.fillStyle = "#FFC700";
    c.beginPath();
    c.arc(sx, headY, headR * 0.92, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#594300";
    c.lineWidth = Math.max(1.0, r * 0.14);
    c.stroke();

    c.fillStyle = "#1E293B";
    c.beginPath(); c.arc(sx - headR * 0.30, headY - headR * 0.12, headR * 0.13, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(sx + headR * 0.30, headY - headR * 0.12, headR * 0.13, 0, Math.PI * 2); c.fill();
    c.beginPath();
    c.arc(sx, headY + headR * 0.06, headR * 0.38, 0.15 * Math.PI, 0.85 * Math.PI, false);
    c.stroke();
  }
}

function draw3DVolumetricVehicle(c, vehicle, gx, gy, headingDeg, scaleMult, rollDeg, isHint, isBlocker, cbMode) {
  const sc = viewTransform.scale;
  const pt = toScreen(gx, gy);
  const liv = LIVERY_PALETTE[vehicle.color] || LIVERY_PALETTE.BLUE;
  const secLiv = vehicle.secondaryColor ? LIVERY_PALETTE[vehicle.secondaryColor] : null;

  const cap = vehicle.capacity;
  const dims = getVehicleDimensions(cap);
  // Preserve 100% of each vehicle's true size whether in the bottom vehicle area, driving, or parked in the middle waiting bays!
  const widUnits = dims.width;
  const lenUnits = dims.length;

  const wPx = widUnits * sc * scaleMult;
  const lPx = lenUnits * sc * scaleMult;
  const cornerR = cap <= 4
    ? Math.min(wPx * 0.36, 9 * dpr)
    : (cap <= 6 ? Math.min(wPx * 0.28, 9.5 * dpr) : Math.min(wPx * 0.22, 10 * dpr));
  const extrudeY = (cap <= 4 ? 4.0 : 5.0) * dpr;

  c.save();
  // 1. Soft Ground Drop Shadow (offset down-right in screen space)
  c.save();
  c.translate(pt.x + 3.5 * dpr, pt.y + 6.5 * dpr);
  c.rotate(((headingDeg + rollDeg) * Math.PI) / 180);
  drawRoundedRect(c, -wPx / 2, -lPx / 2, wPx, lPx, cornerR);
  c.fillStyle = "rgba(15, 23, 42, 0.24)";
  c.fill();
  c.restore();

  // 2. 3D Lower Chassis Skirt (shifted down by extrudeY in screen space for true 2.5D/3D depth!)
  c.save();
  c.translate(pt.x, pt.y + extrudeY);
  c.rotate(((headingDeg + rollDeg) * Math.PI) / 180);

  // Protruding black tires
  const tireW = 3.6 * dpr, tireL = lPx * 0.18;
  const tireOffsets = cap >= 8 ? [-lPx * 0.30, lPx * 0.10, lPx * 0.30] : [-lPx * 0.28, lPx * 0.28];
  c.fillStyle = "#18181B";
  tireOffsets.forEach(ty => {
    drawRoundedRect(c, -wPx / 2 - tireW * 0.65, ty - tireL / 2, tireW, tireL, 2 * dpr);
    c.fill();
    drawRoundedRect(c, wPx / 2 - tireW * 0.35, ty - tireL / 2, tireW, tireL, 2 * dpr);
    c.fill();
  });

  drawRoundedRect(c, -wPx / 2, -lPx / 2, wPx, lPx, cornerR);
  c.fillStyle = vehicle.isMystery ? "#44403C" : liv.chassisSkirt;
  c.fill();
  c.lineWidth = 1.8 * dpr;
  c.strokeStyle = vehicle.isMystery ? "#1C1917" : liv.outline;
  c.stroke();
  c.restore();

  // 3. Upper Glossy Toy Bus Body
  c.save();
  c.translate(pt.x, pt.y);
  c.rotate(((headingDeg + rollDeg) * Math.PI) / 180);

  if (isHint || isBlocker) {
    drawRoundedRect(c, -wPx / 2 - 4 * dpr, -lPx / 2 - 4 * dpr, wPx + 8 * dpr, lPx + 8 * dpr, cornerR + 4 * dpr);
    c.lineWidth = 3 * dpr;
    c.strokeStyle = isBlocker ? "#FF3B30" : "#FFD60A";
    c.stroke();
  }

  drawRoundedRect(c, -wPx / 2, -lPx / 2, wPx, lPx, cornerR);
  c.fillStyle = vehicle.isMystery ? "#78716C" : liv.bodyTop;
  c.fill();
  c.lineWidth = 1.8 * dpr;
  c.strokeStyle = vehicle.isMystery ? "#292524" : liv.outline;
  c.stroke();

  // 4. Front & Rear Dark Glass Windshields + Side Windows (Front is -Y in local canvas coords)
  const wsW = wPx * 0.76;
  const wsH = Math.min(lPx * 0.16, 10 * dpr);
  drawRoundedRect(c, -wsW / 2, -lPx / 2 + 3.5 * dpr, wsW, wsH, 3 * dpr);
  c.fillStyle = "#1E293B";
  c.fill();
  // Cyan windshield reflection glint
  c.strokeStyle = "rgba(147, 197, 253, 0.55)";
  c.lineWidth = 1.2 * dpr;
  c.beginPath();
  c.moveTo(-wsW * 0.30, -lPx / 2 + 5.5 * dpr);
  c.lineTo(wsW * 0.20, -lPx / 2 + 5.5 * dpr);
  c.stroke();

  // Rear window
  drawRoundedRect(c, -wsW * 0.42, lPx / 2 - 6.5 * dpr, wsW * 0.84, 3.5 * dpr, 1.5 * dpr);
  c.fillStyle = "#1E293B";
  c.fill();

  // Side window strips
  const sideWinH = lPx * 0.54;
  drawRoundedRect(c, -wPx / 2 + 1.8 * dpr, -sideWinH / 2 + 2 * dpr, 2.5 * dpr, sideWinH, 1.2 * dpr);
  c.fillStyle = "#1E293B";
  c.fill();
  drawRoundedRect(c, wPx / 2 - 4.3 * dpr, -sideWinH / 2 + 2 * dpr, 2.5 * dpr, sideWinH, 1.2 * dpr);
  c.fill();

  // Headlights at front (-lPx/2)
  c.fillStyle = "#FEF08A";
  drawRoundedRect(c, -wPx * 0.36, -lPx / 2 + 0.8 * dpr, wPx * 0.20, 2.2 * dpr, 1 * dpr); c.fill();
  drawRoundedRect(c, wPx * 0.16, -lPx / 2 + 0.8 * dpr, wPx * 0.20, 2.2 * dpr, 1 * dpr); c.fill();

  // 5. Raised Lighter Roof Panel (with Two-Tone Split Livery on Dual-Color Buses!)
  const roofW = wPx * (cap <= 4 ? 0.68 : 0.70);
  const roofL = lPx * (cap <= 4 ? 0.54 : (cap <= 6 ? 0.62 : 0.68));
  const roofOffsetY = (cap <= 4 ? 1.5 : 1.8) * dpr;
  const roofR = cornerR * 0.65;
  drawRoundedRect(c, -roofW / 2, -roofL / 2 + roofOffsetY, roofW, roofL, roofR);
  c.fillStyle = vehicle.isMystery ? "#A8A29E" : liv.roofCap;
  c.fill();

  if (secLiv && !vehicle.isMystery) {
    // Rear half of roof cap painted in vivid Secondary Color with a crisp white beltline divider
    c.save();
    drawRoundedRect(c, -roofW / 2, -roofL / 2 + roofOffsetY, roofW, roofL, roofR);
    c.clip();
    c.fillStyle = secLiv.bodyTop;
    c.fillRect(-roofW / 2, roofOffsetY, roofW, roofL / 2 + 2 * dpr);
    c.strokeStyle = "#FFFFFF";
    c.lineWidth = 1.6 * dpr;
    c.beginPath();
    c.moveTo(-roofW / 2, roofOffsetY);
    c.lineTo(roofW / 2, roofOffsetY);
    c.stroke();
    c.restore();
  }

  drawRoundedRect(c, -roofW / 2, -roofL / 2 + roofOffsetY, roofW, roofL, roofR);
  c.lineWidth = 1.2 * dpr;
  c.strokeStyle = "rgba(255, 255, 255, 0.50)";
  c.stroke();

  // Roof segment ribs on medium/large buses
  if (cap >= 6 && !vehicle.isMystery) {
    c.strokeStyle = "rgba(0, 0, 0, 0.16)";
    c.lineWidth = 1.2 * dpr;
    c.beginPath();
    if (cap === 6) {
      c.moveTo(-roofW * 0.4, roofOffsetY); c.lineTo(roofW * 0.4, roofOffsetY);
    } else {
      const ribY = roofL * 0.22;
      c.moveTo(-roofW * 0.4, -ribY + roofOffsetY); c.lineTo(roofW * 0.4, -ribY + roofOffsetY);
      c.moveTo(-roofW * 0.4, ribY + roofOffsetY); c.lineTo(roofW * 0.4, ribY + roofOffsetY);
    }
    c.stroke();
  }

  // 6. Bold White Directional Arrow on the Roof (scaled coherently to vehicle class!)
  if (vehicle.isMystery) {
    c.fillStyle = "#FFFFFF";
    c.font = `900 ${Math.round((cap <= 4 ? 10.5 : 13) * dpr)}px Inter, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("?", 0, roofOffsetY);
  } else {
    const sizeScale = cap <= 4 ? 0.74 : (cap <= 6 ? 0.88 : 1.0);
    const aLen = Math.min(roofL * 0.70, 21 * dpr * sizeScale);
    const aTipY = -aLen * 0.48 + roofOffsetY;
    const aBaseY = aLen * 0.48 + roofOffsetY;
    const shaftW = 4.0 * dpr * sizeScale;
    const headW = 9.8 * dpr * sizeScale;
    const headNeckY = aTipY + Math.min(aLen * 0.48, 7.2 * dpr * sizeScale);

    c.beginPath();
    c.moveTo(0, aTipY);
    c.lineTo(headW / 2, headNeckY);
    c.lineTo(shaftW / 2, headNeckY);
    c.lineTo(shaftW / 2, aBaseY);
    c.lineTo(-shaftW / 2, aBaseY);
    c.lineTo(-shaftW / 2, headNeckY);
    c.lineTo(-headW / 2, headNeckY);
    c.closePath();

    c.lineWidth = 2.4 * dpr;
    c.strokeStyle = liv.outline;
    c.stroke();
    c.fillStyle = "#FFFFFF";
    c.fill();
  }

  if (cbMode && !vehicle.isMystery) {
    const symChar = {
      "STAR": "★", "TRIANGLE": "▲", "CLOVER": "♣", "LIGHTNING BOLT": "⚡",
      "DIAMOND": "◆", "HEXAGON": "⬢", "CRESCENT": "☾", "HEART": "♥"
    }[liv.symbol] || "●";
    c.fillStyle = "#0F172A";
    c.font = `900 ${Math.round(9 * dpr)}px Inter, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(symChar, 0, lPx * 0.28);
  }

  c.restore();
  c.restore();
}

function renderScene(c = ctx, canvasW = gameCanvas ? gameCanvas.width : 860, canvasH = gameCanvas ? gameCanvas.height : 1600) {
  if (!c) return;
  const night = profile.settings.nightMode;
  const cbMode = profile.settings.colorblindMode;
  const b = islandBounds;
  const sc = viewTransform.scale;

  // 1. Bottom Zone Background: Clean Bright Light-Grey Parking Lot (#E2E7F0)
  c.fillStyle = night ? "#182235" : "#E2E7F0";
  c.fillRect(0, 0, canvasW, canvasH);

  // Full-Width Edge-to-Edge Fine Vehicle Area Grid (spans the entire bottom vehicle area cleanly!)
  const gridStepPx = VEHICLE_GRID_CELL * sc;
  const gridTopPx = toScreen(0, b.roadY - 1.34).y;
  const gridBotPx = canvasH;
  const centerPt = toScreen(6.0, 7.0);

  const firstGxPx = centerPt.x - Math.ceil(centerPt.x / gridStepPx) * gridStepPx;
  const firstGyPx = gridTopPx + ((centerPt.y - gridTopPx) % gridStepPx + gridStepPx) % gridStepPx;

  c.strokeStyle = night ? "rgba(51, 65, 85, 0.45)" : "rgba(203, 213, 225, 0.68)";
  c.lineWidth = 1.0 * dpr;
  c.beginPath();
  for (let sx = firstGxPx; sx <= canvasW; sx += gridStepPx) {
    c.moveTo(sx, gridTopPx);
    c.lineTo(sx, gridBotPx);
  }
  for (let sy = firstGyPx; sy <= gridBotPx; sy += gridStepPx) {
    c.moveTo(0, sy);
    c.lineTo(canvasW, sy);
  }
  c.stroke();

  c.fillStyle = night ? "#334155" : "#94A3B8";
  for (let sx = firstGxPx; sx <= canvasW; sx += gridStepPx) {
    for (let sy = firstGyPx; sy <= gridBotPx; sy += gridStepPx) {
      c.beginPath();
      c.arc(sx, sy, 1.55 * dpr, 0, Math.PI * 2);
      c.fill();
    }
  }

  // 2. Top Zone: Lush Green Park & Stadium-Oval Loop Track
  const parkBottomScreenY = toScreen(0, b.parkBottomY - 0.15).y;
  c.fillStyle = night ? "#153826" : "#75C94C";
  c.fillRect(0, 0, canvasW, parkBottomScreenY);

  // Grass lip / curb above road
  c.fillStyle = night ? "#0F291C" : "#55A630";
  c.fillRect(0, parkBottomScreenY - 5 * dpr, canvasW, 5 * dpr);

  // Cute Rounded Bushes & Flowers in Left & Right Park Corners
  const drawParkBushCluster = (gx, gy, flipX) => {
    const bp = toScreen(gx, gy);
    const br = sc * 0.58;
    // Wooden planter box under bush
    drawRoundedRect(c, bp.x - br * 1.15, bp.y - br * 0.1, br * 2.3, br * 0.72, 6 * dpr);
    c.fillStyle = "#B4845C";
    c.fill();
    c.lineWidth = 1.5 * dpr;
    c.strokeStyle = "#7C5333";
    c.stroke();

    // 3 overlapping green bush spheres
    c.fillStyle = night ? "#1E5631" : "#38983C";
    c.beginPath(); c.arc(bp.x - br * 0.45, bp.y - br * 0.15, br * 0.62, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(bp.x + br * 0.45, bp.y - br * 0.12, br * 0.58, 0, Math.PI * 2); c.fill();
    c.fillStyle = night ? "#2D7A47" : "#4BB54F";
    c.beginPath(); c.arc(bp.x, bp.y - br * 0.34, br * 0.72, 0, Math.PI * 2); c.fill();

    // Red & yellow flowers
    [[ -0.35, -0.45, "#FF3B30" ], [ 0.25, -0.52, "#FFC700" ], [ 0.48, -0.15, "#FF3B30" ], [ -0.10, -0.15, "#FFC700" ]].forEach(([ox, oy, fc]) => {
      c.fillStyle = fc;
      c.beginPath();
      c.arc(bp.x + ox * br * flipX, bp.y + oy * br, 3.2 * dpr, 0, Math.PI * 2);
      c.fill();
    });
  };
  drawParkBushCluster(b.left - 0.55, b.parkBottomY + 0.72, 1);
  drawParkBushCluster(b.right + 0.55, b.parkBottomY + 0.72, -1);

  // Draw Stadium-Oval Loop Track & Top-Right Feeder Chute
  const m = getStadiumOvalMetrics(b);
  const trackPx = m.trackWidth * sc;

  // Top-Right Feeder Chute Road aligned 100% with feederChutePoints centerline!
  if (feederChutePoints.length === 0) buildRoundaboutAndFeederPoints(b);
  const f0 = feederChutePoints[0];
  const fLast = feederChutePoints[Math.min(feederChutePoints.length - 1, 20)];
  const feederStart = toScreen(f0.x, f0.y);
  const feederEnd = toScreen(fLast.x, fLast.y);

  // Outer dark 3D shadow of track + feeder
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = "rgba(15, 23, 42, 0.25)";
  c.lineWidth = trackPx + 12 * dpr;
  c.beginPath(); c.moveTo(feederStart.x, feederStart.y + 4 * dpr); c.lineTo(feederEnd.x, feederEnd.y + 4 * dpr); c.stroke();
  c.save(); c.translate(0, 4 * dpr); traceStadiumOvalPath(c, m); c.stroke(); c.restore();

  // Raised light-grey curb border of track + feeder
  c.strokeStyle = night ? "#475569" : "#94A3B8";
  c.lineWidth = trackPx + 8 * dpr;
  c.beginPath(); c.moveTo(feederStart.x, feederStart.y); c.lineTo(feederEnd.x, feederEnd.y); c.stroke();
  traceStadiumOvalPath(c, m); c.stroke();

  // Grey asphalt surface of track + feeder
  c.strokeStyle = night ? "#334155" : "#6E7788";
  c.lineWidth = trackPx;
  c.beginPath(); c.moveTo(feederStart.x, feederStart.y); c.lineTo(feederEnd.x, feederEnd.y); c.stroke();
  traceStadiumOvalPath(c, m); c.stroke();

  // Bottom-Center Boarding Gate Apron connecting oval loop to the waiting bay road
  const gatePt = toScreen(m.cx, b.parkBottomY + 0.45);
  const apronW = trackPx * 1.15;
  const apronH = Math.abs(parkBottomScreenY - gatePt.y) + 10 * dpr;
  c.fillStyle = night ? "#334155" : "#6E7788";
  c.fillRect(gatePt.x - apronW / 2, gatePt.y - 8 * dpr, apronW, apronH);

  // 3. Middle Zone: Horizontal Grey Asphalt Road & 8 Properly Proportioned Angled Waiting Bays (\)
  const roadTopY = parkBottomScreenY;
  const roadBotY = toScreen(0, b.roadY - 1.34).y;
  const roadH = Math.max(44 * dpr, roadBotY - roadTopY);

  c.fillStyle = night ? "#263147" : "#6E7788";
  c.fillRect(0, roadTopY, canvasW, roadH);

  // Road top & bottom curbs
  c.fillStyle = night ? "#475569" : "#94A3B8";
  c.fillRect(0, roadTopY, canvasW, 3.5 * dpr);
  c.fillRect(0, roadBotY - 3.5 * dpr, canvasW, 3.5 * dpr);

  // Draw 8 Wide, Coherent Angled Waiting Bays spanning across the full road width!
  const usableW = Math.max((b.right - b.left) + 2.85, 10.08);
  const baySpacingPx = (usableW / TOTAL_BAY_SLOTS) * sc;
  const stallW = Math.min(baySpacingPx * 0.82, 1.04 * sc);
  const stallH = 2.06 * sc;
  const bayTiltRad = (-16 * Math.PI) / 180;

  levelState.waitingBays.forEach(bay => {
    const bayC = getBayCenter(bay.index, TOTAL_BAY_SLOTS, b);
    const bp = toScreen(bayC.x, bayC.y);
    const occ = bay.occupantVehicleId ? levelState.vehicles[bay.occupantVehicleId] : null;

    c.save();
    c.translate(bp.x, bp.y);
    c.rotate(bayTiltRad);

    const isVip = bay.labelType === "VIP" && !bay.isUnlocked;
    const isPlus = bay.labelType === "PLUS" && !bay.isUnlocked;

    // Recessed asphalt bay floor
    drawRoundedRect(c, -stallW / 2, -stallH / 2, stallW, stallH, 6.5 * dpr);
    c.fillStyle = isVip
      ? "rgba(255, 199, 0, 0.16)"
      : (bay.isUnlocked ? "rgba(15, 23, 42, 0.22)" : "rgba(15, 23, 42, 0.13)");
    c.fill();

    // Crisp parking bay border coherent with vehicle width & length
    c.lineWidth = 2.4 * dpr;
    if (bay.state === "RESERVED") {
      c.strokeStyle = "#FFC700";
    } else if (occ && occ.state === "IN_BAY") {
      c.strokeStyle = LIVERY_PALETTE[occ.color].bodyTop;
    } else if (isVip) {
      c.strokeStyle = "#FFC700";
    } else if (isPlus) {
      c.strokeStyle = "rgba(74, 222, 128, 0.75)";
    } else {
      c.strokeStyle = "rgba(241, 245, 249, 0.78)";
    }
    c.stroke();

    // Front wheel-stop bumper bar inside unlocked bays
    if (bay.isUnlocked) {
      drawRoundedRect(c, -stallW * 0.30, -stallH / 2 + 3.5 * dpr, stallW * 0.60, 2.8 * dpr, 1.4 * dpr);
      c.fillStyle = "rgba(248, 250, 252, 0.55)";
      c.fill();
    }

    if (isVip) {
      c.fillStyle = "#FFC700";
      c.font = `900 ${Math.round(9.5 * dpr)}px Inter, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("VIP", 0, -5 * dpr);
      c.font = `800 ${Math.round(7.5 * dpr)}px Inter, sans-serif`;
      c.fillStyle = "#FEF08A";
      c.fillText("150$", 0, 6 * dpr);
    } else if (isPlus) {
      c.fillStyle = "#4ADE80";
      c.font = `900 ${Math.round(14 * dpr)}px Inter, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("+", 0, -5 * dpr);
      c.font = `800 ${Math.round(7.5 * dpr)}px Inter, sans-serif`;
      c.fillStyle = "#BBF7D0";
      c.fillText("150$", 0, 6 * dpr);
    }
    c.restore();
  });

  // 4. Draw 4-Abreast Glossy 3D Crowd with Coherent Rows & 1-by-1 Individual Member Motion!
  const queue = levelState.passengerQueue;
  if (queue.length > 0 && typeof queue[0].pos !== "number") {
    initCrowdPhysicalPositions(queue);
  }
  const personRadiusPx = Math.max(5.6 * dpr, sc * 0.215);
  const crowdDrawList = [];

  for (let r = 0; r < queue.length; r++) {
    const p = queue[r];
    if (p.zone === "FEEDER" && p.pos > feederChutePoints.length - 1.5) continue;

    const sp = p.zone === "ROUNDABOUT" ? sampleRoundaboutRing(p.pos) : sampleFeederChute(p.pos);
    // Unit walking tangent vector `(tx, ty)` pointing in the direction of crowd flow:
    const tx = sp.ny, ty = -sp.nx;
    const rowIdNum = parseInt(p.id.slice(2), 10) || r;
    const isMoving = (p.moveSpeed || 0) > 0.05;

    for (let col = 0; col < 4; col++) {
      const m = (p.members && p.members[col]) ? p.members[col] : { lag: 0, phaseOffset: col * 1.45 + rowIdNum * 0.85 };
      const latOffset = (col - 1.5) * 0.34;
      // Individual 1-by-1 longitudinal offset along the walking tangent so each person moves 1-by-1
      // without twisting the 4-wide row on roundabout curves!
      const fwdOffset = -m.lag * 0.55;
      const wx = sp.x + sp.nx * latOffset + tx * fwdOffset;
      const wy = sp.y + sp.ny * latOffset + ty * fwdOffset;
      const sPt = toScreen(wx, wy);

      // Independent per-person walking gait phase (staggered 1-by-1 across col = 0, 1, 2, 3)
      const phase = animTime * (isMoving ? 13.5 : 4.2) - col * 1.35 - rowIdNum * 0.85;
      const bobY = -Math.abs(Math.sin(phase)) * (isMoving ? 2.6 * dpr : 0.55 * dpr);
      const swing = isMoving ? Math.sin(phase) : 0;

      crowdDrawList.push({
        sx: sPt.x,
        sy: sPt.y + bobY,
        sortY: sPt.y,
        color: p.color,
        swing,
        isSmiley: p.hasSmiley && col === 1
      });
    }
  }

  // Sort all crowd members by screen Y ascending so front (lower on screen) people naturally overlap back people in 2.5D!
  crowdDrawList.sort((a, bItem) => a.sortY - bItem.sortY);
  crowdDrawList.forEach(item => {
    drawGlossy3DPerson(c, item.sx, item.sy, item.color, personRadiusPx, item.swing, item.isSmiley);
  });

  // 5. Draw Sprinting Runners (Peeling Off 1 by 1 from the Gate into Parked Buses!)
  activeBoarders.forEach(bStep => {
    if (bStep.elapsedTime < 0) {
      // Still standing at their individual gate spot waiting for their 1-by-1 peel-off turn!
      const waitPt = toScreen(bStep.startPos.x, bStep.startPos.y);
      drawGlossy3DPerson(c, waitPt.x, waitPt.y, bStep.passenger.color, personRadiusPx, 0, false);
      return;
    }
    const t = Math.max(0, Math.min(1, bStep.elapsedTime / bStep.duration));
    const lx = bStep.startPos.x + (bStep.targetPos.x - bStep.startPos.x) * t;
    const ly = bStep.startPos.y + (bStep.targetPos.y - bStep.startPos.y) * t;
    const sPt = toScreen(lx, ly);
    const hopPx = -Math.sin(t * Math.PI) * 10 * dpr - Math.abs(Math.sin(t * Math.PI * 3)) * 4 * dpr;

    drawGlossy3DPerson(
      c,
      sPt.x,
      sPt.y + hopPx,
      bStep.passenger.color,
      personRadiusPx * 1.04,
      Math.sin(t * Math.PI * 6),
      false
    );
  });

  // 6. Draw Underground Tunnels in Parking Lot
  levelState.tunnels.forEach(tunnel => {
    const tp = toScreen(tunnel.anchorX, tunnel.anchorY);
    const tw = 1.35 * sc, th = 1.05 * sc;
    drawRoundedRect(c, tp.x - tw / 2, tp.y - th / 2, tw, th, 8 * dpr);
    c.fillStyle = "#334155"; c.fill();
    c.lineWidth = 2 * dpr; c.strokeStyle = "#94A3B8"; c.stroke();

    drawRoundedRect(c, tp.x - tw * 0.36, tp.y - th * 0.34, tw * 0.72, th * 0.68, 5 * dpr);
    c.fillStyle = "#0F172A"; c.fill();

    if (tunnel.spawnQueue.length > 0) {
      c.fillStyle = "#FFC700";
      c.font = `900 ${Math.round(10 * dpr)}px Inter, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(`${tunnel.spawnQueue.length}`, tp.x, tp.y);
    }
  });

  // 7. Draw White Cartoon Smoke Puffs & Impact Shockwaves
  exhaustPuffs.concat(particlePuffs).forEach(pf => {
    const prog = Math.min(1, pf.elapsedTime / pf.duration);
    const pt = toScreen(pf.pos.x, pf.pos.y);
    const rad = (0.35 + prog * 0.85) * pf.maxRadius * dpr;
    c.save();
    c.globalAlpha = Math.max(0, (1 - prog) * 0.85);
    c.fillStyle = pf.color || "#FFFFFF";
    c.beginPath();
    c.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });

  // 8. Draw All Vehicles (Sorted by Y descending so lower vehicles overlap higher ones in 2.5D!)
  const renderList = [];
  Object.values(levelState.vehicles).forEach(v => {
    const anim = movingVehicles.get(v.id);
    if (v.state === "CLEARED" && !anim) return;

    let gx = v.anchorX;
    let gy = v.anchorY;
    let headingDeg = v.direction.deg;
    let scaleMult = 1.0;
    let rollDeg = 0;

    if (anim) {
      gx = anim.currentPos.x;
      gy = anim.currentPos.y;
      headingDeg = anim.currentHeading;
      scaleMult = anim.bounceScale || 1.0;
      rollDeg = (anim.steeringRoll || 0) * 35;
    } else if (v.state === "IN_BAY" && v.assignedBayIndex !== null) {
      const bayPos = getBayParkedWorldPos(v.assignedBayIndex, v, b);
      gx = bayPos.x;
      gy = bayPos.y;
      headingDeg = BAY_TILT_DEG;
    }

    const bonk = blockedBonks.get(v.id);
    if (bonk) {
      gx = bonk.currentPos.x;
      gy = bonk.currentPos.y;
    }

    const wob = vehicleWobbles.get(v.id);
    if (wob) {
      const prog = wob.elapsed / wob.duration;
      rollDeg += Math.exp(-prog * 5.0) * Math.sin(prog * Math.PI * 5.5) * wob.amp * 28;
    }

    const sb = baySeatBounces.get(v.id);
    if (sb) {
      const p = sb.elapsed / sb.duration;
      scaleMult *= 1.0 + 0.11 * Math.sin(p * Math.PI);
    }

    renderList.push({ v, gx, gy, headingDeg, scaleMult, rollDeg });
  });

  renderList.sort((a, bItem) => bItem.gy - a.gy);
  renderList.forEach(item => {
    const isHint = item.v.id === hintVehicleId;
    const isBlocker = (inspectRaycast && inspectRaycast.firstBlocker && inspectRaycast.firstBlocker.id === item.v.id) ||
                      Array.from(blockedBonks.values()).some(bk => bk.blockerId === item.v.id);
    draw3DVolumetricVehicle(c, item.v, item.gx, item.gy, item.headingDeg, item.scaleMult, item.rollDeg, isHint, isBlocker, cbMode);
  });

  // 9. Draw Color-Matched Remaining Passenger Countdown Badges Below Occupied Bays (Exact Bus Fever Party Badge!)
  levelState.waitingBays.forEach(bay => {
    if (!bay.isUnlocked) return;
    const occ = bay.occupantVehicleId ? levelState.vehicles[bay.occupantVehicleId] : null;
    if (!occ) return;
    const mAnim = movingVehicles.get(occ.id);
    if (mAnim && mAnim.stage !== "PARKED_IN_BAY") return;

    const totalSubCap = occ.capacity * CROWD_MULT;
    const curSubSeated = Math.min(totalSubCap, occ.subSeatedCount || 0);
    const remaining = Math.max(0, totalSubCap - curSubSeated);

    const bayC = getBayCenter(bay.index, TOTAL_BAY_SLOTS, b);
    const badgePt = toScreen(bayC.x, bayC.y - 1.04);
    const liv = LIVERY_PALETTE[getActiveBoardingColor(occ)] || LIVERY_PALETTE.BLUE;

    const pw = 28 * dpr, ph = 16 * dpr;
    drawRoundedRect(c, badgePt.x - pw / 2, badgePt.y - ph / 2, pw, ph, 4.5 * dpr);
    c.fillStyle = liv.bodyTop;
    c.fill();

    // Subtle progress fill bar along bottom of badge
    const fillRatio = Math.max(0, Math.min(1, curSubSeated / Math.max(1, totalSubCap)));
    if (fillRatio > 0) {
      c.save();
      drawRoundedRect(c, badgePt.x - pw / 2, badgePt.y - ph / 2, pw, ph, 4.5 * dpr);
      c.clip();
      c.fillStyle = "rgba(255, 255, 255, 0.28)";
      c.fillRect(badgePt.x - pw / 2, badgePt.y + ph / 2 - 3.2 * dpr, pw * fillRatio, 3.2 * dpr);
      c.restore();
    }

    c.lineWidth = 1.6 * dpr;
    c.strokeStyle = "#FFFFFF";
    drawRoundedRect(c, badgePt.x - pw / 2, badgePt.y - ph / 2, pw, ph, 4.5 * dpr);
    c.stroke();

    // Secondary color dot indicator when a dual-color bus is still on its primary color phase
    if (occ.secondaryColor && occ.seatedCount < 4) {
      const secHex = LIVERY_PALETTE[occ.secondaryColor].bodyTop;
      c.fillStyle = secHex;
      c.beginPath();
      c.arc(badgePt.x + pw / 2 - 2 * dpr, badgePt.y - ph / 2 + 2 * dpr, 3.2 * dpr, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 1 * dpr;
      c.strokeStyle = "#FFFFFF";
      c.stroke();
    }

    c.fillStyle = "#FFFFFF";
    c.font = `900 ${Math.round(9.5 * dpr)}px Inter, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(`${remaining}`, badgePt.x, badgePt.y + 0.5 * dpr);
  });

  // 10. Floating Popups & Confetti
  floatingPopups.forEach(fp => {
    const prog = Math.min(1, fp.elapsed / fp.duration);
    const pt = toScreen(fp.pos.x, fp.pos.y + prog * 0.8);
    c.save();
    c.globalAlpha = Math.max(0, 1 - prog * 0.9);
    c.font = `900 ${Math.round(12 * dpr)}px Inter, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineWidth = 3 * dpr;
    c.strokeStyle = "#0F172A";
    c.strokeText(fp.text, pt.x, pt.y);
    c.fillStyle = fp.color;
    c.fillText(fp.text, pt.x, pt.y);
    c.restore();
  });

  confettiParticles.forEach(cf => {
    c.save();
    c.translate(cf.x * canvasW, cf.y * canvasH);
    c.rotate((cf.rot * Math.PI) / 180);
    c.fillStyle = cf.color;
    c.fillRect(-4.5 * dpr, -2.5 * dpr, 9 * dpr, 5 * dpr);
    c.restore();
  });
}

function animStageIsEnRoute(anim) {
  return anim.stage !== "PARKED_IN_BAY" && anim.stage !== "DEPARTING" && anim.stage !== "DEPARTED";
}

// ============================================================================
// 9. MAIN 60FPS PHYSICS & REAL-TIME MULTI-VEHICLE CHOREOGRAPHY LOOP
// ============================================================================
function advanceSimulation(dt) {
  animTime += dt;
  const speedMult = isFastForward ? 3.0 : 1.0;
  const effDt = dt * speedMult;

  if (queueWalkOffset > 0) {
    queueWalkOffset = Math.max(0, queueWalkOffset - effDt * 7.5);
  }
  if (feederWalkOffset > 0) {
    feederWalkOffset = Math.max(0, feederWalkOffset - effDt * 7.5);
  }

  recirculatingGroups = recirculatingGroups.filter(rg => {
    rg.elapsed += effDt;
    return rg.elapsed < rg.duration;
  });

  // Advance Blocked Lunge-and-Bonk Physics
  blockedBonks.forEach((bonk, vId) => {
    bonk.elapsed += dt;
    if (bonk.elapsed <= bonk.lungeDuration) {
      const t = bonk.elapsed / bonk.lungeDuration;
      const easeIn = t * t;
      bonk.currentPos.x = bonk.startPos.x + (bonk.targetPos.x - bonk.startPos.x) * easeIn;
      bonk.currentPos.y = bonk.startPos.y + (bonk.targetPos.y - bonk.startPos.y) * easeIn;
    } else {
      if (!bonk.hitTriggered) {
        bonk.hitTriggered = true;
        audio.playBlockedBump();
        audio.vibrate([0, 28, 30, 30]);

        const contactX = bonk.targetPos.x + bonk.dir.dx * 0.65;
        const contactY = bonk.targetPos.y + bonk.dir.dy * 0.65;
        particlePuffs.push({
          pos: { x: contactX, y: contactY },
          color: "#FFFFFF",
          elapsedTime: 0,
          duration: 0.26,
          maxRadius: 16
        });

        if (bonk.blockerId) {
          vehicleWobbles.set(bonk.blockerId, {
            elapsed: 0,
            duration: 0.42,
            axisX: bonk.dir.dy,
            axisZ: bonk.dir.dx,
            amp: 0.32
          });
        }
      }

      const retElapsed = bonk.elapsed - bonk.lungeDuration;
      const rt = Math.min(1, retElapsed / bonk.returnDuration);
      const easeOut = 1 - Math.pow(1 - rt, 2);
      bonk.currentPos.x = bonk.targetPos.x + (bonk.startPos.x - bonk.targetPos.x) * easeOut;
      bonk.currentPos.y = bonk.targetPos.y + (bonk.startPos.y - bonk.targetPos.y) * easeOut;

      if (rt >= 1) {
        blockedBonks.delete(vId);
      }
    }
  });

  vehicleWobbles.forEach((wob, vId) => {
    wob.elapsed += dt;
    if (wob.elapsed >= wob.duration) vehicleWobbles.delete(vId);
  });
  baySeatBounces.forEach((sb, vId) => {
    sb.elapsed += effDt;
    if (sb.elapsed >= sb.duration) baySeatBounces.delete(vId);
  });

  // Advance All Simultaneously Moving Vehicles
  const finishedVehs = [];
  movingVehicles.forEach((anim, vehId) => {
    const driveSpeed = anim.stage === "DEPARTING" ? 20.0 : 15.5;
    const turnRate = 980;
    anim.exhaustTimer += effDt;
    const logicalVeh = levelState.vehicles[vehId];

    if (animStageIsEnRoute(anim)) {
      if (anim.waypointIdx < anim.waypoints.length) {
        const wp = anim.waypoints[anim.waypointIdx];
        const dx = wp.x - anim.currentPos.x;
        const dy = wp.y - anim.currentPos.y;
        const dist = Math.hypot(dx, dy);
        let headingDelta = 0;
        if (dist > 0.02) {
          const tAngle = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
          const prevH = anim.currentHeading;
          anim.currentHeading = lerpAngle(anim.currentHeading, tAngle, turnRate * effDt);
          headingDelta = anim.currentHeading - prevH;
          if (headingDelta > 180) headingDelta -= 360;
          if (headingDelta < -180) headingDelta += 360;
        }
        anim.steeringRoll = Math.max(-0.22, Math.min(0.22, headingDelta * 0.025));

        const sp = anim.stage === "PARK_IN_BAY" ? driveSpeed * Math.max(0.48, Math.min(1.0, dist / 1.3)) : driveSpeed;
        const stepDist = sp * effDt;
        if (dist <= stepDist) {
          anim.currentPos = { x: wp.x, y: wp.y };
          anim.waypointIdx++;
          if (anim.waypointIdx >= anim.waypoints.length) {
            anim.stage = "PARKED_IN_BAY";
            anim.currentHeading = BAY_TILT_DEG;
            anim.steeringRoll = 0;
            if (logicalVeh && logicalVeh.state === "EN_ROUTE") {
              logicalVeh.state = "IN_BAY";
              const bay = levelState.waitingBays[anim.targetBayIndex];
              if (bay) bay.state = "OCCUPIED";
            }
            baySeatBounces.set(vehId, { elapsed: 0, duration: 0.18 });
            updateGameHud();
          } else if (anim.waypointIdx === anim.waypoints.length - 1) {
            anim.stage = "PARK_IN_BAY";
          } else {
            anim.stage = "PERIMETER_HIGHWAY";
          }
        } else {
          anim.currentPos.x += (dx / dist) * stepDist;
          anim.currentPos.y += (dy / dist) * stepDist;
        }
      }
    } else if (anim.stage === "PARKED_IN_BAY") {
      anim.currentHeading = BAY_TILT_DEG;
      anim.steeringRoll = 0;
      if (anim.isDeparting) {
        if (anim.pauseTimer === 0) {
          audio.playFullDepart();
          for (let k = 0; k < 6; k++) {
            const cKey = COLOR_KEYS[(k + anim.targetBayIndex) % COLOR_KEYS.length];
            particlePuffs.push({
              pos: {
                x: anim.currentPos.x + (Math.random() - 0.5) * 0.9,
                y: anim.currentPos.y + 0.5 + Math.random() * 0.6
              },
              color: LIVERY_PALETTE[cKey].bodyTop,
              elapsedTime: 0,
              duration: 0.35,
              maxRadius: 9
            });
          }
        }
        anim.pauseTimer += effDt;
        if (anim.pauseTimer < 0.14) {
          anim.bounceScale = 1.0 + 0.16 * Math.sin((anim.pauseTimer / 0.14) * Math.PI);
        } else {
          anim.bounceScale = 1.0;
          anim.stage = "DEPARTING";
          anim.exitWaypoints = [
            { x: anim.currentPos.x + 0.45, y: islandBounds.roadY - 0.95 },
            { x: islandBounds.right + 7.5, y: islandBounds.roadY - 0.95 }
          ];
          anim.waypointIdx = 0;
        }
      } else {
        finishedVehs.push(vehId);
      }
    } else if (anim.stage === "DEPARTING") {
      const ewps = anim.exitWaypoints || [];
      if (anim.waypointIdx < ewps.length) {
        const wp = ewps[anim.waypointIdx];
        const dx = wp.x - anim.currentPos.x;
        const dy = wp.y - anim.currentPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.02) {
          const tAngle = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
          anim.currentHeading = lerpAngle(anim.currentHeading, tAngle, turnRate * effDt);
        }
        const stepDist = driveSpeed * effDt;
        if (dist <= stepDist) {
          anim.currentPos = { x: wp.x, y: wp.y };
          anim.waypointIdx++;
        } else {
          anim.currentPos.x += (dx / dist) * stepDist;
          anim.currentPos.y += (dy / dist) * stepDist;
        }
      } else {
        anim.stage = "DEPARTED";
      }
    }

    if ((animStageIsEnRoute(anim) || anim.stage === "DEPARTING") && anim.exhaustTimer >= 0.036) {
      anim.exhaustTimer = 0;
      const rad = (anim.currentHeading * Math.PI) / 180;
      exhaustPuffs.push({
        pos: {
          x: anim.currentPos.x - Math.sin(rad) * 0.92 + (Math.random() - 0.5) * 0.20,
          y: anim.currentPos.y - Math.cos(rad) * 0.92 + (Math.random() - 0.5) * 0.20
        },
        color: "#FFFFFF",
        elapsedTime: 0,
        duration: 0.34,
        maxRadius: 10.5
      });
    }

    if (anim.stage === "DEPARTED") {
      finishedVehs.push(vehId);
    }
  });
  finishedVehs.forEach(id => movingVehicles.delete(id));

  // Step Real-Time Asynchronous Crowd Boarding & Left-Loop Recirculation
  stepRealtimeBoarding(effDt);

  // Advance Sprinting Runners & Decrement Bay Counter as Each Runner Boards
  activeBoarders = activeBoarders.filter(b => {
    b.elapsedTime += effDt;
    if (b.elapsedTime < b.duration) return true;

    const veh = levelState.vehicles[b.targetVehicleId];
    if (veh) {
      veh.subSeatedCount = (veh.subSeatedCount || 0) + 1;
      audio.playPopNote(popNoteCounter++);
      audio.vibrate(8);
      baySeatBounces.set(veh.id, { elapsed: 0, duration: 0.12 });

      if (b.triggersDeparture) {
        veh.state = "CLEARED";
        const bayIdx = veh.assignedBayIndex !== null ? veh.assignedBayIndex : 1;
        veh.assignedBayIndex = null;
        if (levelState.waitingBays[bayIdx]) {
          levelState.waitingBays[bayIdx].occupantVehicleId = null;
          levelState.waitingBays[bayIdx].state = "EMPTY";
        }
        const bayPos = getBayParkedWorldPos(bayIdx, veh, islandBounds);

        // Departure Combo Streak Bonus (when buses fill & depart within 5.5s of each other!)
        if (animTime - lastDepartureTime <= 5.5) {
          departureCombo += 1;
        } else {
          departureCombo = 1;
        }
        lastDepartureTime = animTime;
        if (departureCombo >= 2) {
          const bonusGold = Math.min(6, departureCombo);
          profile.gold += bonusGold;
          floatingPopups.push({
            pos: { x: bayPos.x, y: bayPos.y + 0.65 },
            text: `🔥 COMBO x${departureCombo}! +${bonusGold}$`,
            color: "#FFD60A",
            elapsed: 0,
            duration: 1.05
          });
        }
        profile.savedMidLevelState = cloneState(levelState);
        saveProfile();
        movingVehicles.set(veh.id, {
          vehicleId: veh.id,
          initialVehicle: veh,
          waypoints: [bayPos],
          targetBayIndex: bayIdx,
          currentPos: { x: bayPos.x, y: bayPos.y },
          currentHeading: BAY_TILT_DEG,
          waypointIdx: 1,
          stage: "PARKED_IN_BAY",
          bounceScale: 1.0,
          steeringRoll: 0,
          pauseTimer: 0,
          isDeparting: true,
          exhaustTimer: 0
        });
      }
    }
    updateGameHud();
    return false;
  });

  particlePuffs = particlePuffs.filter(p => {
    p.elapsedTime += effDt;
    return p.elapsedTime < p.duration;
  });
  exhaustPuffs = exhaustPuffs.filter(ex => {
    ex.elapsedTime += effDt;
    return ex.elapsedTime < ex.duration;
  });
  floatingPopups = floatingPopups.filter(fp => {
    fp.elapsed += dt;
    return fp.elapsed < fp.duration;
  });
  confettiParticles = confettiParticles.filter(c => {
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vRot * dt;
    return c.y < 1.15;
  });

  checkDeadlockAndVictory();
}

let lastTimeMs = typeof performance !== "undefined" ? performance.now() : 0;

function stepFrame(nowMs) {
  const dt = Math.max(0.001, Math.min(0.033, (nowMs - lastTimeMs) / 1000));
  lastTimeMs = nowMs;
  advanceSimulation(dt);

  if (typeof document !== "undefined" && !document.getElementById("gameScreen").classList.contains("hidden")) {
    renderScene();
  }
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(stepFrame);
  }
}
