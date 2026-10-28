/**
 * Thin Shubur mount for the portfolio's copied CSS-3D house.
 * The copied world and avatar geometry stay source-owned; this module maps
 * Shubur Life activities onto their existing room spots and poses.
 */

import { createLifeSimulation } from "@shubur/life";
import { SAMPLE_HOMES, SAMPLE_SEED } from "../sample-homes.mjs";
import { FIG_SCALE, buildPerson } from "./people.js";
import { STAGE_W, ROOMS, doorPoints, phaseAt, project, sunTimes } from "./world.js";

const HOUR_MS = 60 * 60 * 1000;
const TIME_LAPSE_SPEED = 1200;
const HOME = {
  ...SAMPLE_HOMES[0].config,
  furniture: { ...SAMPLE_HOMES[0].config.furniture, car: false },
};

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
  if (spot.s === "lie") return { x: 260, y: 72, z: 80, heading: 0 };
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

function createClock(speed) {
  if (speed === 1) return () => new Date();
  const wallStart = Date.now();
  const perfStart = performance.now();
  return () => new Date(wallStart + (performance.now() - perfStart) * speed);
}

function makeLife(clock, timeZone) {
  const startedAt = new Date(Math.floor(clock().getTime() / HOUR_MS) * HOUR_MS - 24 * HOUR_MS);
  return createLifeSimulation({
    agentId: "shubur-portfolio-world",
    seed: SAMPLE_SEED,
    apartment: { ...HOME, dayCycle: { timezone: timeZone } },
    startedAt,
    timeZone,
    clock,
  });
}

function createStage(target) {
  const doc = target.ownerDocument;
  const stage = doc.createElement("div");
  stage.className = "portfolio-world-stage";
  stage.dataset.worldStage = "";
  stage.setAttribute("role", "img");
  stage.setAttribute("aria-label", "A full 3D view of an agent's seven-room home");
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
    ? `matrix3d(0,0,-1,0,1,0,0,0,0,-1,0,0,260,72,80,1) scale3d(${FIG_SCALE},${FIG_SCALE},${FIG_SCALE})`
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

function render(target, stage, life, clock, last, reducedMotion) {
  const state = life.advanceTo(clock());
  const activity = state.currentActivity;
  const mapped = mapLifeActivity(activity);
  const local = new Date(clock().getTime() + 60 * 60 * 1000);
  const sun = sunTimes(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
  const phase = phaseAt(local.getUTCHours() * 60 + local.getUTCMinutes(), sun);
  const objects = sceneObjects(activity, phase);
  const signature = `${mapped.room}|${phase}|${mapped.pose}|${mapped.outfit}|${mapped.hold}|${activity.id}|${activity.objectId ?? ""}`;

  const root = stage.querySelector(".st-root");
  root.classList.toggle("still", reducedMotion.matches);
  const staticLayer = stage.querySelector("[data-world-static]");
  const dynamicLayer = stage.querySelector("[data-world-dynamic]");
  const actorLayer = stage.querySelector("[data-world-actor]");
  const doorLayer = stage.querySelector("[data-world-doors]");
  const actor = stage.querySelector("[data-agent]");
  if (last.signature !== signature) {
    staticLayer.innerHTML = sceneHTML(ROOMS[mapped.room].build(phase)) + clockMarkup(mapped.room);
    dynamicLayer.innerHTML = sceneHTML(ROOMS[mapped.room].dyn(objects, phase));
    doorLayer.innerHTML = buildDoorMarkup(mapped.room) + buildSleepMarkup(mapped);
    actorLayer.innerHTML = `<div class="st-fig" data-agent></div>`;
    renderAgent(actorLayer.firstElementChild, mapped);
    last.signature = signature;
    last.room = mapped.room;
  } else {
    renderAgent(actor, mapped);
  }
  updateClock(stage, local);

  const status = target.closest("[data-home-card]")?.querySelector("[data-home-mood]");
  if (status) {
    const text = `Mood: ${state.mood.label} — ${state.mood.reason}`;
    if (status.textContent !== text) status.textContent = text;
    status.hidden = false;
  }
  return state;
}

/** Starts the lazy-loaded portfolio house in a Shubur landing-page mount. */
export function startPortfolioWorld(target) {
  const mode = target.dataset.portfolioWorld === "hero" ? "hero" : "section";
  const card = target.closest("[data-home-card]") ?? target.parentElement;
  const badge = card?.querySelector("[data-home-badge]");
  const toggle = card?.querySelector("[data-home-toggle]");
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let timeLapse = mode === "hero" && !media.matches;
  let timer;
  let resizeListener;
  let resizeObserver;
  let stage;

  const start = () => {
    clearInterval(timer);
    const speed = timeLapse ? TIME_LAPSE_SPEED : 1;
    const clock = createClock(speed);
    const timeZone = visitorTimeZone();
    const life = makeLife(clock, timeZone);
    const last = { signature: "", room: "" };
    target.replaceChildren();
    stage = createStage(target);
    target.append(stage);

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

    const update = () => render(target, stage, life, clock, last, media);
    update();
    timer = setInterval(update, timeLapse ? 1000 : 30_000);
    target.dataset.timeLapse = String(timeLapse);
    if (badge) badge.textContent = timeLapse ? "time-lapse · a day in ~72s" : "live · your local time";
    if (toggle) {
      toggle.textContent = timeLapse ? "Back to live time" : "Play the day";
      toggle.dataset.active = String(timeLapse);
    }
  };

  const handleToggle = () => {
    if (media.matches) return;
    timeLapse = !timeLapse;
    resizeObserver?.disconnect();
    if (resizeListener) window.removeEventListener("resize", resizeListener);
    start();
  };
  const handleMotion = () => {
    if (media.matches && timeLapse) {
      timeLapse = false;
      resizeObserver?.disconnect();
      if (resizeListener) window.removeEventListener("resize", resizeListener);
      start();
    } else {
      stage?.querySelector(".st-root")?.classList.toggle("still", media.matches);
    }
  };

  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", handleToggle);
  }
  media.addEventListener?.("change", handleMotion);
  start();

  return {
    destroy() {
      clearInterval(timer);
      resizeObserver?.disconnect();
      if (resizeListener) window.removeEventListener("resize", resizeListener);
      media.removeEventListener?.("change", handleMotion);
      toggle?.removeEventListener("click", handleToggle);
      target.replaceChildren();
    },
  };
}
