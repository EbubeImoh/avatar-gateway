/**
 * Thin Shubur mount for the portfolio's copied CSS-3D house.
 * The copied world and avatar geometry stay source-owned; this module maps
 * Shubur Life activities onto their existing room spots and poses.
 */

import { APARTMENT_TYPES, apartmentTypeConfig } from "@avatar-gateway/starter-apartment";
import { availablePhoneTools, availableTools, createLifeSimulation, NETWORK_PHONE_ACTIONS } from "@shubur/life";
import { FIG_SCALE, buildPerson } from "./people.js";
import { STAGE_W, STAGE_H, ROOMS, collector, doorPoints, phaseAt, project, sunTimes } from "./world.js";

const HOUR_MS = 60 * 60 * 1000;
const SAMPLE_SEED = "shubur";
const DEMO_SCOPES = [...new Set(NETWORK_PHONE_ACTIONS.map((tool) => tool.requiredScope))];

const FALLBACK_SPOT = {
  studio: "lounge",
  living: "sofaA",
  kitchen: "dineN",
  bedroom: "window",
  bathroom: "sink",
  gym: "mat",
  garage: "bench2",
};

const SPOT_FOR_ACTIVITY = {
  sleep: { bedroom: "bed" },
  relax: { studio: "lounge", living: "sofaA", bedroom: "bedRead", kitchen: "stoolA", gym: "mat", garage: "bench2" },
  eat: { kitchen: "dineN", living: "sofaA" },
  work: { studio: "desk", garage: "bench" },
  read: { studio: "books", living: "shelf", bedroom: "bedRead" },
  exercise: { gym: "mat" },
  wash: { bathroom: "shower", kitchen: "sink" },
  groom: { bathroom: "sink" },
  tend: { studio: "window", living: "shelf", kitchen: "coffee" },
  gaze: { studio: "window", living: "shelf", bedroom: "window", kitchen: "coffee" },
  tinker: { garage: "bench", studio: "desk" },
  idle: { studio: "lounge", living: "sofaA", kitchen: "dineN", bedroom: "bedRead", bathroom: "sink", gym: "mat", garage: "bench2" },
};

const INITIAL_OBJECTS = {
  tv: "off",
  shelf: Array(10).fill(1),
  stove: false,
  coffee: false,
  plateN: "none",
  plateW: "none",
  plateIsland: null,
  sinkPlates: 0,
  bed: "made",
  lamp: false,
  nightBook: false,
  wardrobe: false,
  shower: false,
  towel: "rail",
  fog: false,
  tap: false,
  closed: false,
  tread: "off",
  dumb: "rack",
  bar: "rack",
  kettleOut: false,
  bottleOut: false,
  rollup: false,
  desk: "off",
  deskLamp: false,
};

const FACE = `<div class="st-f" style="width:20px;height:17px;transform-origin:0 0;transform:matrix3d(0,1,0,0,0,0,-1,0,-1,0,0,0,-14.9,-10,21,1)"><svg width="20" height="17" viewBox="0 0 20 17"><path d="M3.6 3.2 Q6 2 8.2 3" fill="none" stroke="#1A110C" stroke-width="1.1" stroke-linecap="round"/><path d="M11.8 3 Q14 2 16.4 3.2" fill="none" stroke="#1A110C" stroke-width="1.1" stroke-linecap="round"/><g class="st-eyes"><ellipse cx="6" cy="6.6" rx="1.35" ry="1.75" fill="#120C09"/><ellipse cx="14" cy="6.6" rx="1.35" ry="1.75" fill="#120C09"/><circle cx="6.5" cy="6" r=".45" fill="#fff"/><circle cx="14.5" cy="6" r=".45" fill="#fff"/></g><path d="M5.6 10.6 Q10 14.6 14.4 10.6" fill="none" stroke="#1A110C" stroke-width="1.1" stroke-linecap="round"/><path d="M3.4 9.4 Q4.6 15.4 10 15.6 Q15.4 15.4 16.6 9.4" fill="none" stroke="rgba(18,12,9,.32)" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;
const FACE_SLEEP = `<div class="st-f" style="width:20px;height:17px;transform-origin:0 0;transform:matrix3d(0,1,0,0,0,0,-1,0,-1,0,0,0,-14.9,-10,21,1)"><svg width="20" height="17" viewBox="0 0 20 17"><path d="M4.4 6.8 Q6 8 7.6 6.8 M12.4 6.8 Q14 8 15.6 6.8" fill="none" stroke="#120C09" stroke-width="1.1" stroke-linecap="round"/><path d="M7 11.6 Q10 13 13 11.6" fill="none" stroke="#1A110C" stroke-width="1.1" stroke-linecap="round"/></svg></div>`;
const CLOCK_SVG = '<svg width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="19" r="18" fill="#E9ECF2" stroke="#2A3446" stroke-width="2"/><circle cx="19" cy="19" r="15.5" fill="none" stroke="rgba(17,21,28,.22)" stroke-width="1" stroke-dasharray="1 7.1"/><g class="js-hour"><line x1="19" y1="20" x2="19" y2="10.5" stroke="#11151C" stroke-width="2.2" stroke-linecap="round"/></g><g class="js-min"><line x1="19" y1="21" x2="19" y2="6" stroke="#11151C" stroke-width="1.4" stroke-linecap="round"/></g><circle cx="19" cy="19" r="1.6" fill="#4C8DFF"/></svg>';
const ARROW = { back: "↗", left: "↖", east: "↘", south: "↙" };

const boxHTML = (b) => `<div class="st-box${b.cls ? ` ${b.cls}` : ""}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.d}px;transform:translateZ(${b.z}px)"><div class="st-f" style="width:${b.w}px;height:${b.d}px;transform:translateZ(${b.h}px);background:${b.top};box-shadow:${b.glow}"></div><div class="st-f" style="width:${b.w}px;height:${b.h}px;top:${b.d}px;transform-origin:0 0;transform:rotateX(90deg);background:${b.front}"></div><div class="st-f" style="width:${b.h}px;height:${b.d}px;left:${b.w}px;transform-origin:0 0;transform:rotateY(-90deg);background:${b.side}"></div></div>`;
const decalHTML = (d) => `<div class="st-f ${d.cls || ""}"${d.id ? ` id="${d.id}"` : ""} style="width:${d.w}px;height:${d.h}px;transform-origin:0 0;transform:${d.m};background:${d.bg || "transparent"};border-radius:${d.r || 0};box-shadow:${d.sh || "none"}">${d.html || ""}</div>`;
const bbHTML = (b) => `<div class="st-bb" style="transform:translate3d(${b.x}px,${b.y}px,${b.z}px) rotateZ(-45deg) rotateX(-60deg)">${b.html}</div>`;
const sceneHTML = (c) => c.boxes.map(boxHTML).join("") + c.decals.map(decalHTML).join("") + c.bbs.map(bbHTML).join("");

function partHTML(b) {
  return `<div class="st-box" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.d}px;transform:translateZ(${b.z}px)"><div class="st-in3 ${b.cls}"${b.origin ? ` style="transform-origin:${b.origin}"` : ""}><div class="st-f" style="width:${b.w}px;height:${b.d}px;transform:translateZ(${b.h}px);background:${b.top}"></div><div class="st-f" style="width:${b.w}px;height:${b.h}px;top:${b.d}px;transform-origin:0 0;transform:rotateX(90deg);background:${b.front}"></div><div class="st-f" style="width:${b.w}px;height:${b.h}px;transform-origin:0 0;transform:rotateX(90deg);background:${b.back}"></div><div class="st-f" style="width:${b.h}px;height:${b.d}px;left:${b.w}px;transform-origin:0 0;transform:rotateY(-90deg);background:${b.side}"></div><div class="st-f" style="width:${b.h}px;height:${b.d}px;transform-origin:0 0;transform:rotateY(-90deg);background:${b.back}"></div></div></div>`;
}

function clockMarkup(roomId) {
  const [wall, along, z] = ROOMS[roomId].clock;
  const transform = wall === "back"
    ? `matrix3d(1,0,0,0,0,0,-1,0,0,1,0,0,${along},0.9,${z + 38},1)`
    : `matrix3d(0,-1,0,0,0,0,-1,0,1,0,0,0,0.9,${along + 38},${z + 38},1)`;
  return `<div class="st-f" style="width:38px;height:38px;transform-origin:0 0;transform:${transform}">${CLOCK_SVG}</div>`;
}

/** Map one Shubur activity to an existing portfolio room, spot, and pose. */
export function mapLifeActivity(activity) {
  const room = ROOMS[activity?.room] ? activity.room : "living";
  const requested = SPOT_FOR_ACTIVITY[activity?.id]?.[room];
  const spotId = requested && ROOMS[room].spots[requested] ? requested : FALLBACK_SPOT[room];
  const spot = ROOMS[room].spots[spotId];
  let outfit = "home";
  if (activity?.id === "sleep") outfit = "sleep";
  else if (activity?.id === "exercise") outfit = "gym";
  else if (activity?.id === "work" || activity?.id === "tinker") outfit = "work";
  const hold = activity?.id === "read" ? "book"
    : activity?.id === "eat" ? "plate"
      : "none";
  return { room, spotId, spot, pose: spot.pose || "stand", outfit, hold };
}

/** Produce the same source room and wall-clock geometry used by the portfolio renderer. */
export function buildRoomMarkup(roomId, phase, objects = INITIAL_OBJECTS) {
  const room = ROOMS[roomId];
  if (!room) throw new Error(`Unknown portfolio room: ${roomId}`);
  return sceneHTML(room.build(phase)) + clockMarkup(roomId) + sceneHTML(room.dyn(objects, phase));
}

/** Project the source room doors into the same CSS overlay coordinates as the portfolio stage. */
export function buildDoorMarkup(roomId) {
  const room = ROOMS[roomId];
  if (!room) throw new Error(`Unknown portfolio room: ${roomId}`);
  return room.doors.map((door) => {
    const point = project(...doorPoints(door).label);
    const name = ROOMS[door.to].name;
    return `<div class="st-anchor door" style="left:${point.sx.toFixed(0)}px;top:${point.sy.toFixed(0)}px"><span class="st-door"><span class="ar">${ARROW[door.side]}</span><span class="t">${name}</span></span></div>`;
  }).join("");
}

/** Keep the portfolio's small sleep cue at its original projected bed position. */
export function buildSleepMarkup(mapped) {
  if (mapped.room !== "bedroom" || mapped.pose !== "lie") return "";
  const point = project(250, 60, 130);
  return `<div class="st-zz" style="left:${point.sx.toFixed(0)}px;top:${point.sy.toFixed(0)}px"><span>Z</span><span>z</span><span>z</span></div>`;
}

/** Produce the source avatar's box and faceted-cylinder geometry for one mapped pose. */
export function buildAgentMarkup(mapped) {
  const figure = buildPerson("agent", mapped.outfit, mapped.pose, mapped.hold);
  const shadow = mapped.pose === "lie" || figure.headZ === 51
    ? ""
    : '<div class="st-f st-blob" style="width:56px;height:56px;transform:translate3d(-28px,-28px,0.4px)"></div>';
  return `${shadow}${figure.body.map(partHTML).join("")}${figure.bodyD.map(decalHTML).join("")}<div class="st-headpos ${figure.headCls}" style="transform:translate3d(0,0,${figure.headZ}px)"><div class="st-head3d"><div class="st-nod">${figure.head.map(partHTML).join("")}${figure.headD.map(decalHTML).join("")}${figure.eyes === "closed" ? FACE_SLEEP : FACE}</div></div></div>`;
}

function sceneObjects(activity, phase) {
  const state = { ...INITIAL_OBJECTS, shelf: [...INITIAL_OBJECTS.shelf] };
  if (activity.id === "work" || activity.id === "tinker") state.desk = "work";
  if (activity.id === "read") state.desk = "idle";
  if (activity.id === "sleep") state.bed = "sleep";
  if (activity.id === "read" && activity.room === "bedroom") state.bed = "read";
  if (activity.id === "wash" && activity.room === "bathroom") state.shower = true;
  if (activity.id === "exercise") state.dumb = "out";
  if (activity.id === "eat" && activity.room === "kitchen") state.plateN = "food";
  if (activity.id === "relax" && activity.room === "living") state.tv = "film";
  state.lamp = phase === "night" || phase === "evening";
  return state;
}

function actorPosition(mapped) {
  const { spot } = mapped;
  if (spot.s === "lie") return { x: spot.a[0], y: spot.a[1], z: 80, heading: 0 };
  if (spot.s) return { x: spot.s[0], y: spot.s[1], z: spot.s[2], heading: spot.s[3] };
  return { x: spot.a[0], y: spot.a[1], z: 0, heading: spot.h ?? 0 };
}

function visitorTimeZone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone || "UTC";
  } catch {
    return "UTC";
  }
}

function makeLife(clock, timeZone, apartmentType) {
  const startedAt = new Date(Math.floor(clock().getTime() / HOUR_MS) * HOUR_MS - 24 * HOUR_MS);
  return createLifeSimulation({
    agentId: "shubur-portfolio-world",
    seed: SAMPLE_SEED,
    apartmentType,
    apartment: { ...apartmentTypeConfig(apartmentType), avatar: { name: "Your agent", accessories: ["headphones"] } },
    startedAt,
    timeZone,
    clock,
  });
}

export function createStage(target) {
  const doc = target.ownerDocument;
  const stage = doc.createElement("div");
  stage.className = "portfolio-world-stage";
  stage.dataset.worldStage = "";
  stage.setAttribute("role", "group");
  stage.setAttribute("aria-label", "Interactive 3D apartment and live agent status");
  stage.innerHTML = `<div class="st-root">
    <div class="st-glow" aria-hidden="true"></div>
    <div aria-hidden="true" style="position:absolute;left:230px;top:560px;width:540px;height:140px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),transparent)"></div>
    <div class="st-view">
      <div class="st-world" aria-hidden="true">
        <div class="st-layer" data-world-static></div>
        <div class="st-layer" data-world-dynamic></div>
        <div class="st-layer" data-world-actor><div class="st-fig" data-agent></div></div>
      </div>
      <div class="st-overlay" data-world-doors aria-hidden="true"></div>
    </div>
  </div>
  <div class="apartment-ui" data-apartment-ui>
    <section class="apt-copy" aria-labelledby="apt-copy-title">
      <p class="apt-kicker">Shubur · a living home</p>
      <h2 id="apt-copy-title">Pick a home. Your agent decides the rest.</h2>
      <p>Studio, starter flat, one-bedroom, high-rise. Every home comes with what's in it: a bed, a kitchenette, a sofa, a shower, a phone. Everything inside is a tool. There's no schedule and no script; your agent chooses what to use and when. Its phone connects it to the Shubur network.</p>
    </section>
    <div class="apt-controls">
      <label>Apartment type<select data-apartment-type></select></label>
      <label>Room<select data-apartment-room></select></label>
    </div>
    <section class="apt-status" aria-live="polite">
      <span>What it's doing right now</span>
      <strong data-current-status></strong>
    </section>
    <div class="apt-hotspots" data-object-hotspots aria-label="Objects and tools in this room"></div>
    <section class="apt-object-detail" data-object-detail aria-live="polite"></section>
  </div>`;
  return stage;
}

function renderAgent(element, mapped) {
  const key = `${mapped.pose}|${mapped.outfit}|${mapped.hold}`;
  if (element.dataset.pose !== key) {
    element.dataset.pose = key;
    element.innerHTML = buildAgentMarkup(mapped);
  }
  const position = actorPosition(mapped);
  const transform = mapped.pose === "lie"
    ? `matrix3d(0,0,-1,0,1,0,0,0,0,-1,0,0,${position.x.toFixed(1)},${position.y.toFixed(1)},${position.z},1) scale3d(${FIG_SCALE},${FIG_SCALE},${FIG_SCALE})`
    : `translate3d(${position.x.toFixed(1)}px,${position.y.toFixed(1)}px,${position.z}px) rotateZ(${position.heading.toFixed(1)}deg) scale3d(${FIG_SCALE},${FIG_SCALE},${FIG_SCALE})`;
  element.style.transform = transform;
  element.style.display = "";
  element.classList.toggle("lying", mapped.pose === "lie");
}

function updateClock(stage, local) {
  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  stage.querySelector(".js-hour")?.setAttribute("transform", `rotate(${(hour % 12) * 30 + minute * 0.5} 19 19)`);
  stage.querySelector(".js-min")?.setAttribute("transform", `rotate(${minute * 6} 19 19)`);
}

function roomColors(roomId) {
  return {
    studio: ["#151d2a", "#26364c"], living: ["#261d1a", "#49382e"], kitchen: ["#1b222b", "#394656"],
    bedroom: ["#1b2030", "#393952"], bathroom: ["#1b252e", "#39525a"], gym: ["#171b21", "#333943"],
  }[roomId] ?? ["#151d2a", "#26364c"];
}

function objectPosition(object) {
  return { x: 60 + object.x * 4.8, y: 60 + object.y * 4.8 };
}

function drawApartmentObject(c, object, selectedId, activity) {
  const { x, y } = objectPosition(object);
  const active = activity.objectId === `prop-${object.id}` || selectedId === object.id;
  const wood = "#624831";
  const pale = "#d7d5ce";
  c.shadow(x - 96, y - 64, 192, 128);
  if (active) c.glowAt(x, y, 92, 0.16);
  switch (object.kind) {
    case "bed":
      c.B(x - 86, y - 56, 172, 112, 0, 18, "#413128", { top: "#6b5037" });
      c.B(x - 78, y - 48, 156, 96, 18, 15, pale, { top: "#ece8df" });
      c.B(x - 73, y - 43, 52, 32, 33, 7, "#f5f1e9", { top: "#ffffff" });
      c.B(x - 15, y - 42, 86, 88, 32, 5, active ? "#8ba9ff" : "#596b91", { top: active ? "#a9b8ff" : "#7586ac" });
      c.B(x - 86, y + 52, 12, 10, -4, 20, wood); c.B(x + 74, y + 52, 12, 10, -4, 20, wood);
      break;
    case "sofa":
      c.B(x - 80, y - 45, 160, 92, 0, 28, "#5a4032", { top: "#765744" });
      c.B(x - 72, y - 42, 144, 18, 28, 54, "#6b4c39", { top: "#8a6349" });
      c.B(x - 72, y - 20, 68, 57, 28, 16, active ? "#7183b2" : "#596b91", { top: "#8499c8" });
      c.B(x + 4, y - 20, 68, 57, 28, 16, active ? "#7183b2" : "#596b91", { top: "#8499c8" });
      c.B(x - 88, y - 38, 16, 82, 8, 42, "#765744"); c.B(x + 72, y - 38, 16, 82, 8, 42, "#765744");
      break;
    case "desk":
      c.B(x - 76, y - 37, 152, 82, 58, 8, "#775639", { top: "#a37a50" });
      c.B(x - 66, y - 30, 9, 68, 0, 58, wood); c.B(x + 57, y - 30, 9, 68, 0, 58, wood);
      c.B(x - 23, y - 26, 58, 8, 69, 43, "#17202c", { front: "#202e3a", side: "#111820" });
      c.B(x - 18, y - 21, 48, 3, 112, 2, "#8cced2", { front: "#8cced2", side: "#8cced2" });
      break;
    case "island":
      c.B(x - 82, y - 44, 164, 88, 0, 68, "#75634f", { top: "#b6a88f" });
      c.B(x - 92, y - 54, 184, 108, 68, 10, "#c9c3b6", { top: "#e4e0d7" });
      c.B(x - 49, y - 22, 54, 34, 79, 2, "#94aab0", { top: "#607780" });
      c.B(x - 3, y - 18, 4, 26, 80, 25, "#a5b1b5");
      break;
    case "sink":
      c.B(x - 56, y - 35, 112, 70, 0, 58, "#625041", { top: "#bcb2a1" });
      c.B(x - 48, y - 27, 96, 54, 58, 7, "#e5e3dd", { top: "#f5f3ee" });
      c.B(x - 22, y - 13, 44, 26, 65, 2, "#6f8993", { top: "#b8cdd2" });
      c.B(x + 28, y - 23, 4, 18, 66, 22, "#aab6b8");
      break;
    case "shower":
      c.B(x - 66, y - 52, 132, 104, 0, 7, "#66777a", { top: "#46575c" });
      c.B(x - 60, y - 46, 120, 94, 7, 2, "rgba(155,210,220,.35)", { top: "rgba(155,210,220,.18)", front: "rgba(155,210,220,.24)", side: "rgba(155,210,220,.22)" });
      c.B(x - 62, y - 46, 6, 94, 9, 142, "#a9bdc3"); c.B(x + 56, y - 46, 6, 94, 9, 142, "#a9bdc3");
      c.B(x - 62, y - 46, 124, 5, 146, 7, "#a9bdc3");
      break;
    case "phone":
      c.B(x - 19, y - 30, 38, 60, 0, 8, "#111823");
      c.B(x - 14, y - 24, 28, 48, 8, 2, "#74c5d0", { top: "linear-gradient(145deg,#b2edf0,#4c8294)" });
      c.B(x - 8, y - 17, 16, 3, 10, 2, "#355c70"); c.B(x - 8, y - 9, 16, 3, 10, 2, "#355c70");
      c.B(x - 8, y - 1, 16, 3, 10, 2, "#355c70");
      break;
    case "bookshelf":
      c.B(x - 58, y - 32, 116, 64, 0, 164, "#503a2b", { top: "#77583d" });
      for (let level = 0; level < 3; level += 1) {
        c.B(x - 51, y - 28, 102, 4, 36 + level * 40, 4, "#a88457");
        for (let book = 0; book < 5; book += 1) c.B(x - 43 + book * 18, y - 22, 11, 30, 40 + level * 40, 26 + (book % 2) * 5, ["#47647a", "#b77853", "#7884ad", "#547565", "#b0966a"][book]);
      }
      break;
    case "weights":
      c.B(x - 3, y - 52, 6, 104, 26, 5, "#b8c2d0", { top: "#d6dde7" });
      c.B(x - 23, y - 48, 17, 10, 7, 42, "#232b37"); c.B(x + 6, y + 38, 17, 10, 7, 42, "#232b37");
      c.B(x - 35, y - 51, 10, 16, 4, 50, "#38485d"); c.B(x + 25, y + 35, 10, 16, 4, 50, "#38485d");
      break;
    case "mat":
      c.B(x - 66, y - 38, 132, 76, 0, 3, active ? "#9b8bcd" : "#655a86", { top: "repeating-linear-gradient(45deg,#736993 0 4px,#62587f 4px 8px)" });
      break;
    default:
      c.B(x - 42, y - 32, 84, 64, 0, 42, "#72553b", { top: "#a5835d" });
  }
}

export function buildApartmentRoomMarkup(typeId, roomId, phase, activity, selectedId) {
  const c = collector();
  const [floor, wall] = roomColors(roomId);
  c.B(0, 0, 600, 600, -30, 30, floor, { top: `repeating-linear-gradient(90deg,rgba(220,230,245,.035) 0 1px,transparent 1px 72px),repeating-linear-gradient(0deg,rgba(220,230,245,.035) 0 1px,transparent 1px 72px),${floor}` });
  c.B(0, -14, 600, 14, 0, 230, wall, { front: `linear-gradient(180deg,${wall},#0e141f)` });
  c.B(-14, -14, 14, 614, 0, 230, wall, { side: `linear-gradient(90deg,${wall},#0e141f)` });
  const sky = phase === "night" || phase === "evening" ? "linear-gradient(#101932,#263352)" : "linear-gradient(#8bb5e0,#d3e3ed)";
  c.yPlane(310, 0.8, 68, 185, 118, sky, { sh: "inset 0 0 0 5px #313c51, inset 0 0 0 8px rgba(190,215,230,.45)" });
  c.B(308, 0, 190, 8, 183, 5, "#323e53");
  c.floor(116, 270, 362, 250, 0.5, "repeating-linear-gradient(45deg,rgba(169,184,255,.045) 0 2px,transparent 2px 8px),#172131", { r: "9px", sh: "inset 0 0 0 7px #172131,inset 0 0 0 8px rgba(169,184,255,.16)" });
  const type = APARTMENT_TYPES[typeId];
  const objects = type.objects.filter((object) => object.room === roomId);
  for (const object of objects) drawApartmentObject(c, object, selectedId, activity);
  return { markup: sceneHTML(c), objects };
}

function mapApartmentActivity(typeId, roomId, activity) {
  const type = APARTMENT_TYPES[typeId];
  const target = type.objects.find((object) => activity.objectId === `prop-${object.id}` && object.room === roomId)
    ?? type.objects.find((object) => object.room === roomId && object.kind !== "phone")
    ?? type.objects.find((object) => object.room === roomId);
  const pose = {
    sleep: "lie", relax: "bedsit", eat: "counter", work: "desk", read: "bedsit", exercise: "stretch",
    wash: "wash", groom: "sink", tend: "stand", gaze: "stand", tinker: "desk", idle: "stand",
  }[activity.id] ?? "stand";
  const position = target ? objectPosition(target) : { x: 300, y: 390 };
  const x = position.x - (pose === "lie" ? 0 : 64);
  const y = position.y + (pose === "lie" ? 12 : 70);
  return {
    room: roomId,
    spotId: target?.id ?? "center",
    spot: { a: [x, y], ...(pose === "lie" ? { s: "lie" } : pose === "bedsit" ? { s: [x, y, 42, -90] } : {}), pose },
    pose,
    outfit: activity.id === "sleep" ? "sleep" : activity.id === "exercise" ? "gym" : activity.id === "work" || activity.id === "tinker" ? "work" : "home",
    hold: activity.id === "read" ? "book" : activity.id === "eat" ? "plate" : "none",
  };
}

function currentHour(timeZone, now) {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderObjectDetail(stage, object, environment, life, state, scopes, timeZone, now) {
  const detail = stage.querySelector("[data-object-detail]");
  if (!object) { detail.replaceChildren(); return; }
  const lifeObject = environment.objects.find((item) => item.id === `prop-${object.id}`);
  if (!lifeObject) { detail.replaceChildren(); return; }
  const roomWorld = { location: state.objects[lifeObject.id]?.room ?? object.room, objects: state.objects };
  const localTools = availableTools({ environment, world: roomWorld, hour: currentHour(timeZone, now) })
    .filter((tool) => tool.objectId === lifeObject.id)
    .map((tool) => tool.verb);
  const networkTools = lifeObject.kind === "phone" ? availablePhoneTools(environment, scopes).map((tool) => `${tool.action.replaceAll("_", " ")} · ${tool.requiredScope}`) : [];
  const tools = [...new Set([...localTools, ...networkTools])];
  detail.innerHTML = `<strong>${escapeHtml(object.label)}</strong><span>${escapeHtml(lifeObject.size)} · capacity ${lifeObject.capacity}${lifeObject.carryable ? " · can be carried" : ""}</span><span>Tools: ${tools.length ? tools.map(escapeHtml).join(", ") : "no available tools right now"}</span>${lifeObject.hints.length ? `<span class="apt-hint">${escapeHtml(lifeObject.hints.map((hint) => hint.note).join(" · "))}</span>` : ""}`;
}

function renderHud(stage, typeId, roomId, state, life, timeZone, now, selectedId, onSelection) {
  const typeSelect = stage.querySelector("[data-apartment-type]");
  if (!typeSelect.options.length) typeSelect.innerHTML = Object.values(APARTMENT_TYPES).map((type) => `<option value="${type.id}">${escapeHtml(type.label)}</option>`).join("");
  typeSelect.value = typeId;
  const type = APARTMENT_TYPES[typeId];
  const roomSelect = stage.querySelector("[data-apartment-room]");
  const roomOptions = type.rooms.map((room) => `<option value="${room.id}">${escapeHtml(room.name)}</option>`).join("");
  if (roomSelect.dataset.type !== typeId) {
    roomSelect.dataset.type = typeId;
    roomSelect.innerHTML = roomOptions;
  }
  roomSelect.value = roomId;
  const currentRoom = type.rooms.find((room) => room.id === state.currentActivity.room)?.name ?? type.rooms.find((room) => room.id === type.startRoom)?.name;
  const status = stage.querySelector("[data-current-status]");
  status.textContent = `${state.currentActivity.caption} · ${currentRoom}`;

  const hotspotLayer = stage.querySelector("[data-object-hotspots]");
  const { objects } = buildApartmentRoomMarkup(typeId, roomId, "afternoon", state.currentActivity, selectedId);
  hotspotLayer.innerHTML = objects.map((object) => {
    const pos = objectPosition(object);
    const projected = project(pos.x, pos.y, object.kind === "phone" ? 100 : 158);
    return `<button type="button" class="apt-hotspot${object.id === selectedId ? " is-selected" : ""}" data-object-id="${escapeHtml(object.id)}" aria-pressed="${object.id === selectedId}" style="left:${(projected.sx / STAGE_W * 100).toFixed(2)}%;top:${(projected.sy / STAGE_H * 100).toFixed(2)}%">${escapeHtml(object.label)}</button>`;
  }).join("");
  hotspotLayer.querySelectorAll("[data-object-id]").forEach((button) => button.addEventListener("click", () => onSelection(button.dataset.objectId)));
  const object = objects.find((item) => item.id === selectedId) ?? objects[0];
  renderObjectDetail(stage, object, life.getEnvironment(), life, state, DEMO_SCOPES, timeZone, now);
}

function render(stage, life, clock, ui, last, reducedMotion) {
  const now = clock();
  const state = life.advanceTo(now);
  const activity = state.currentActivity;
  const date = new Date(now);
  const sun = sunTimes(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const phase = phaseAt(date.getHours() * 60 + date.getMinutes(), sun);
  const type = APARTMENT_TYPES[ui.typeId];
  if (ui.followActivityRoom && type.rooms.some((room) => room.id === activity.room)) ui.roomId = activity.room;
  if (!type.rooms.some((room) => room.id === ui.roomId)) ui.roomId = type.startRoom;
  const objects = type.objects.filter((object) => object.room === ui.roomId);
  if (!objects.some((object) => object.id === ui.selectedId)) ui.selectedId = objects[0]?.id;
  const signature = `${ui.typeId}|${ui.roomId}|${phase}|${activity.id}|${activity.objectId ?? ""}|${ui.selectedId ?? ""}`;

  const root = stage.querySelector(".st-root");
  root.classList.toggle("still", reducedMotion.matches);
  const staticLayer = stage.querySelector("[data-world-static]");
  const dynamicLayer = stage.querySelector("[data-world-dynamic]");
  const actorLayer = stage.querySelector("[data-world-actor]");
  if (last.signature !== signature) {
    staticLayer.innerHTML = buildApartmentRoomMarkup(ui.typeId, ui.roomId, phase, activity, ui.selectedId).markup;
    dynamicLayer.replaceChildren();
    actorLayer.replaceChildren();
    if (activity.room === ui.roomId) {
      const mapped = mapApartmentActivity(ui.typeId, ui.roomId, activity);
      const actor = stage.ownerDocument.createElement("div");
      actor.className = "st-fig";
      actor.dataset.agent = "";
      actorLayer.append(actor);
      renderAgent(actor, mapped);
    }
    last.signature = signature;
  }
  renderHud(stage, ui.typeId, ui.roomId, state, life, ui.timeZone, now, ui.selectedId, (id) => {
    ui.selectedId = id;
    last.signature = "";
    render(stage, life, clock, ui, last, reducedMotion);
  });
  return state;
}

/** Starts the lazy-loaded portfolio house in a Shubur landing-page mount. */
export function startPortfolioWorld(target) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const clock = () => new Date();
  const timeZone = visitorTimeZone();
  const ui = { typeId: "studio", roomId: APARTMENT_TYPES.studio.startRoom, selectedId: "phone", timeZone, followActivityRoom: true };
  let life = makeLife(clock, timeZone, ui.typeId);
  let timer;
  let resizeListener;
  let resizeObserver;
  const stage = createStage(target);
  const last = { signature: "" };
  target.replaceChildren(stage);
  const typeSelect = stage.querySelector("[data-apartment-type]");
  const roomSelect = stage.querySelector("[data-apartment-room]");
  const update = () => render(stage, life, clock, ui, last, media);
  const handleTypeChange = () => {
    ui.typeId = typeSelect.value;
    ui.roomId = APARTMENT_TYPES[ui.typeId].startRoom;
    ui.followActivityRoom = true;
    ui.selectedId = APARTMENT_TYPES[ui.typeId].objects.find((object) => object.room === ui.roomId)?.id;
    life = makeLife(clock, timeZone, ui.typeId);
    last.signature = "";
    update();
  };
  const handleRoomChange = () => {
    ui.roomId = roomSelect.value;
    ui.followActivityRoom = false;
    ui.selectedId = APARTMENT_TYPES[ui.typeId].objects.find((object) => object.room === ui.roomId)?.id;
    last.signature = "";
    update();
  };
  const handleMotion = () => {
    stage.querySelector(".st-root")?.classList.toggle("still", media.matches);
  };
  typeSelect.addEventListener("change", handleTypeChange);
  roomSelect.addEventListener("change", handleRoomChange);
  media.addEventListener?.("change", handleMotion);
  const scale = () => {
    const root = stage.querySelector(".st-root");
    const width = stage.clientWidth;
    root.style.transform = `scale(${width / STAGE_W})`;
    root.classList.toggle("compact", width < 760);
  };
  scale();
  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(scale);
    resizeObserver.observe(stage);
  } else {
    resizeListener = scale;
    window.addEventListener("resize", resizeListener);
  }
  update();
  timer = setInterval(update, 30_000);

  return {
    destroy() {
      clearInterval(timer);
      resizeObserver?.disconnect();
      if (resizeListener) window.removeEventListener("resize", resizeListener);
      media.removeEventListener?.("change", handleMotion);
      typeSelect.removeEventListener("change", handleTypeChange);
      roomSelect.removeEventListener("change", handleRoomChange);
      target.replaceChildren();
    },
  };
}
