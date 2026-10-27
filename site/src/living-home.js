/**
 * Live Starter Apartment for the landing page. The hero time-lapse and the
 * #apartment section both mount through startLivingHome(); only the clock
 * speed and the status UI differ. Bundled to site/assets/living-home.js by
 * scripts/build-site.mjs — edit this file, not the bundle.
 */

import { mount } from "@avatar-gateway/starter-apartment";
import { createLifeSimulation } from "@shubur/life";

const HOUR_MS = 60 * 60 * 1000;
// One simulated day in about 72 seconds.
const TIME_LAPSE_SPEED = 1200;
const LIFE_SEED = "shubur";

const MODES = {
  hero: { speed: TIME_LAPSE_SPEED, refreshMs: 1000 },
  section: { speed: 1, refreshMs: 30_000 },
};

function visitorTimeZone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Starts at the visitor's real time and runs `speed` times faster. Never moves backwards. */
function createClock(speed) {
  if (speed === 1) return () => new Date();
  const wallStart = Date.now();
  const perfStart = performance.now();
  return () => new Date(wallStart + (performance.now() - perfStart) * speed);
}

function mountHome(target, { speed, refreshMs, onStatus }) {
  const timeZone = visitorTimeZone();
  const clock = createClock(speed);
  // Replay the previous day so the routine bar is already filled in on first paint.
  const startedAt = new Date(Math.floor(clock().getTime() / HOUR_MS) * HOUR_MS - 24 * HOUR_MS);
  const life = createLifeSimulation({ agentId: "shubur-site-demo", seed: LIFE_SEED, startedAt, timeZone, clock });
  return mount(
    target,
    { avatar: { name: "Your agent", accessories: ["headphones"] }, dayCycle: { timezone: timeZone } },
    life,
    {
      clock,
      refreshMs,
      followAvatar: true,
      onRender: (state) => onStatus({ ...state, mood: life.getSnapshot().mood }),
    },
  );
}

/** Replace the static poster inside `target` with the live apartment. */
export function startLivingHome(target) {
  const mode = target.dataset.livingHome === "hero" ? "hero" : "section";
  const card = target.closest("[data-home-card]") ?? target.parentElement;
  const moodText = card?.querySelector("[data-home-mood]");
  const badge = card?.querySelector("[data-home-badge]");
  const toggle = card?.querySelector("[data-home-toggle]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onStatus = ({ mood }) => {
    if (!moodText) return;
    const text = `Mood: ${mood.label} — ${mood.reason}`;
    if (moodText.textContent !== text) moodText.textContent = text;
    moodText.hidden = false;
  };

  let timeLapse = mode === "hero" && !reducedMotion;
  let home;
  const start = () => {
    home?.destroy();
    const settings = timeLapse ? MODES.hero : MODES.section;
    home = mountHome(target, { ...settings, onStatus });
    target.dataset.timeLapse = String(timeLapse);
    if (badge) badge.textContent = timeLapse ? "time-lapse · a day in ~72s" : "live · your local time";
    if (toggle) {
      toggle.textContent = timeLapse ? "Back to live time" : "Play the day";
      toggle.dataset.active = String(timeLapse);
    }
  };

  start();
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      timeLapse = !timeLapse;
      start();
    });
  }
  return { destroy: () => home?.destroy() };
}
