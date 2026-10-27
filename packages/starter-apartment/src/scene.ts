/**
 * Headless scene state: resolves config, computes the current activity from
 * local time, and builds the SVG markup string for the apartment scene.
 *
 * This module has zero runtime dependencies — it can run in Node, browsers,
 * and edge workers. React and DOM usage lives in react.ts / script.ts.
 */

import type {
  ApartmentConfig,
  ResolvedApartmentConfig,
  DayActivity,
  AvatarActivity,
  DayPeriod,
} from "./types.js";

import {
  DEFAULT_AVATAR_LOOK,
  DEFAULT_ROOM_THEME,
  DEFAULT_FURNITURE,
  DEFAULT_DAY_CYCLE,
} from "./types.js";

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

export function resolveConfig(config: ApartmentConfig): ResolvedApartmentConfig {
  return {
    avatar: { ...DEFAULT_AVATAR_LOOK, ...config.avatar },
    room: { ...DEFAULT_ROOM_THEME, ...config.room },
    furniture: { ...DEFAULT_FURNITURE, ...config.furniture },
    dayCycle: {
      ...DEFAULT_DAY_CYCLE,
      ...config.dayCycle,
      activities: config.dayCycle?.activities ?? DEFAULT_DAY_CYCLE.activities,
    },
    gateway: config.gateway,
    assetCredits: config.assetCredits,
  };
}

// ---------------------------------------------------------------------------
// Day-cycle helpers
// ---------------------------------------------------------------------------

/** Returns the local hour (0–23) in the given IANA timezone. */
export function localHour(timezone: string, now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric", hour12: false, timeZone: timezone,
    }).formatToParts(now);
    const h = parts.find((p) => p.type === "hour")?.value ?? "0";
    const n = parseInt(h, 10);
    return Number.isFinite(n) ? n % 24 : now.getHours();
  } catch {
    return now.getHours();
  }
}

export function currentActivity(activities: DayActivity[], timezone: string, now = new Date()): DayActivity {
  const hour = localHour(timezone, now);
  const match = activities.find((a) => hour >= a.startHour && hour < a.endHour);
  return match ?? activities[0] ?? { startHour: 0, endHour: 24, activity: "idle", caption: "Just chilling" };
}

export function dayPeriod(timezone: string, now = new Date()): DayPeriod {
  const hour = localHour(timezone, now);
  if (hour >= 5 && hour < 7)  return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "noon";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 21) return "evening";
  return "night";
}

// ---------------------------------------------------------------------------
// SVG scene builder
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function windowColor(period: DayPeriod, cfg: ResolvedApartmentConfig): string {
  if (period === "night" || period === "evening") return cfg.room.windowNightColor;
  return cfg.room.windowDaytimeColor;
}

/** Builds the brick-style avatar SVG group at (cx, cy). */
function buildAvatarSvg(cfg: ResolvedApartmentConfig, activity: AvatarActivity): string {
  const { skinTone, hairColor, outfitColor, trouserColor } = cfg.avatar;
  const hasGlasses = cfg.avatar.accessories.includes("glasses");
  const hasHeadphones = cfg.avatar.accessories.includes("headphones");

  // Pose-specific transforms
  const poseTransform = activity === "sleeping"
    ? 'transform="rotate(-90, 100, 115) translate(-30, 30)"'
    : activity === "working"
    ? 'transform="translate(0, 0)"'
    : activity === "stretching"
    ? 'transform="translate(0, -3)"'
    : "";

  const armPos = activity === "working"
    ? `<path d="M57 111c0-9 7-16 16-16l-8 28z" fill="${esc(outfitColor)}" stroke="#172320" stroke-width="5"/>
       <path d="M143 111c0-9-7-16-16-16l8 28z" fill="${esc(outfitColor)}" stroke="#172320" stroke-width="5"/>`
    : activity === "stretching"
    ? `<path d="M57 111l-20-20c-3-3 0-9 5-9l12 4 15 28z" fill="${esc(skinTone)}" stroke="#172320" stroke-width="5"/>
       <path d="M143 111l20-20c3-3 0-9-5-9l-12 4-15 28z" fill="${esc(skinTone)}" stroke="#172320" stroke-width="5"/>`
    : `<path d="M64 120l-17 28c-3 5 0 11 6 13l10 3 18-29z" fill="${esc(skinTone)}" stroke="#172320" stroke-width="5"/>
       <path d="M136 120l16 27c3 5 0 11-6 13l-9 3-17-28z" fill="${esc(skinTone)}" stroke="#172320" stroke-width="5"/>`;

  return `<g ${poseTransform}>
    <!-- shadow -->
    <ellipse cx="100" cy="215" rx="59" ry="9" fill="#23332d" opacity=".18"/>
    <!-- hair / hat -->
    <path d="M76 18c0-10 10-16 24-16s24 6 24 16v9H76z" fill="${esc(hairColor)}" stroke="#172320" stroke-width="4"/>
    <!-- head -->
    <path d="M61 39c0-12 11-21 25-21h28c14 0 25 9 25 21v33c0 20-17 35-39 35h-1c-22 0-38-15-38-35z" fill="${esc(skinTone)}" stroke="#172320" stroke-width="5"/>
    <!-- eyes -->
    <path d="M78 60v4m44-4v4" stroke="#172320" stroke-width="7" stroke-linecap="round"/>
    ${hasGlasses ? `<rect x="70" y="55" width="22" height="16" rx="5" fill="none" stroke="#172320" stroke-width="3"/>
                    <rect x="108" y="55" width="22" height="16" rx="5" fill="none" stroke="#172320" stroke-width="3"/>
                    <path d="M92 63h16" stroke="#172320" stroke-width="3"/>` : ""}
    ${hasHeadphones ? `<path d="M62 55 Q62 30 100 30 Q138 30 138 55" fill="none" stroke="#172320" stroke-width="6"/>
                       <rect x="55" y="52" width="14" height="18" rx="7" fill="${esc(cfg.avatar.outfitColor)}" stroke="#172320" stroke-width="3"/>
                       <rect x="131" y="52" width="14" height="18" rx="7" fill="${esc(cfg.avatar.outfitColor)}" stroke="#172320" stroke-width="3"/>` : ""}
    <!-- smile -->
    <path d="M86 82c8 9 20 9 28 0" fill="none" stroke="#172320" stroke-width="4" stroke-linecap="round"/>
    <!-- body -->
    <path d="M57 111c0-9 7-16 16-16h55c9 0 16 7 16 16v54H57z" fill="${esc(outfitColor)}" stroke="#172320" stroke-width="5"/>
    <!-- stud strip on shirt -->
    <path d="M68 111v-9c0-7 6-13 13-13s13 6 13 13v9m-5-1v-8c0-5 4-9 9-9s9 4 9 9v8m-3 1v-7c0-4 3-7 7-7s7 3 7 7v7" fill="#f7f5ed" stroke="#172320" stroke-width="4"/>
    <!-- arms -->
    ${armPos}
    <!-- legs -->
    <path d="M69 168v28c0 5 4 9 9 9h16v-37zm35 0v37h18c5 0 9-4 9-9v-28z" fill="${esc(trouserColor)}" stroke="#172320" stroke-width="5" stroke-linejoin="round"/>
    <!-- accent circles for accessories (knees) -->
    <circle cx="43" cy="166" r="11" fill="#ff895e" stroke="#172320" stroke-width="4"/>
  </g>`;
}

/** Generates the full apartment SVG as a string. */
export function buildSceneSvg(cfg: ResolvedApartmentConfig, now = new Date()): {
  svg: string;
  activity: DayActivity;
  period: DayPeriod;
} {
  const period = dayPeriod(cfg.dayCycle.timezone, now);
  const act = cfg.dayCycle.enabled
    ? currentActivity(cfg.dayCycle.activities, cfg.dayCycle.timezone, now)
    : cfg.dayCycle.activities[0] ?? { startHour: 0, endHour: 24, activity: "idle" as AvatarActivity, caption: "Idle" };

  const w = cfg.room.windowNightColor;
  const winColor = windowColor(period, cfg);
  const wallC = esc(cfg.room.wallColor);
  const floorC = esc(cfg.room.floorColor);
  const accentC = esc(cfg.room.accentColor);
  const winC = esc(winColor);
  const isDark = period === "night" || period === "evening";

  // Dim the room at night
  const ambientOpacity = isDark ? 0.55 : 0;

  // Furniture visibility
  const { desk, bed, bookshelf, plant, window: showWindow, floorLamp } = cfg.furniture;

  const avatarX = act.activity === "sleeping" ? 240 : act.activity === "working" ? 155 : 180;
  const avatarY = act.activity === "sleeping" ? 200 : 290;
  const avatarScale = 0.52;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 400" role="img" aria-label="Apartment scene — ${esc(cfg.avatar.name)} is ${esc(act.caption.toLowerCase())}">
  <defs>
    <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff9e0" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#fff9e0" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Room walls & floor -->
  <rect x="0" y="0" width="540" height="400" fill="${wallC}"/>
  <!-- Left wall accent -->
  <rect x="0" y="0" width="8" height="400" fill="${accentC}" opacity="0.25"/>
  <!-- Baseboard -->
  <rect x="0" y="320" width="540" height="80" fill="${floorC}"/>
  <rect x="0" y="318" width="540" height="5" fill="${esc(cfg.room.floorColor)}" opacity="0.6"/>
  <!-- Floor boards (horizontal lines) -->
  <line x1="0" y1="340" x2="540" y2="340" stroke="#b09060" stroke-width="1" opacity="0.4"/>
  <line x1="0" y1="360" x2="540" y2="360" stroke="#b09060" stroke-width="1" opacity="0.4"/>
  <line x1="0" y1="380" x2="540" y2="380" stroke="#b09060" stroke-width="1" opacity="0.4"/>

  ${showWindow ? `
  <!-- Window -->
  <rect x="60" y="40" width="140" height="110" rx="6" fill="${winC}" stroke="#172320" stroke-width="4"/>
  <rect x="62" y="42" width="136" height="106" rx="4" fill="none" stroke="#172320" stroke-width="2" opacity="0.3"/>
  <line x1="130" y1="42" x2="130" y2="148" stroke="#172320" stroke-width="3"/>
  <line x1="62"  y1="95" x2="198" y2="95" stroke="#172320" stroke-width="3"/>
  <!-- Window sill -->
  <rect x="52" y="148" width="156" height="10" rx="3" fill="${wallC}" stroke="#172320" stroke-width="3"/>
  ${period === "morning" || period === "noon" ? `<ellipse cx="130" cy="68" rx="18" ry="18" fill="#ffd466" opacity="0.45"/>` : ""}
  ` : ""}

  ${plant ? `
  <!-- Potted plant -->
  <ellipse cx="215" cy="162" rx="18" ry="7" fill="#8a7040" stroke="#172320" stroke-width="2"/>
  <rect x="197" y="138" width="36" height="26" rx="5" fill="#a08040" stroke="#172320" stroke-width="3"/>
  <!-- leaves -->
  <path d="M215 136 Q205 110 190 108 Q200 122 215 136z" fill="#5a9e3c" stroke="#172320" stroke-width="2"/>
  <path d="M215 136 Q225 108 242 106 Q230 122 215 136z" fill="#72b84c" stroke="#172320" stroke-width="2"/>
  <path d="M215 136 Q212 106 215 95 Q218 106 215 136z" fill="#5a9e3c" stroke="#172320" stroke-width="2"/>
  ` : ""}

  ${bookshelf ? `
  <!-- Bookshelf -->
  <rect x="400" y="50" width="130" height="210" rx="5" fill="#c9a86a" stroke="#172320" stroke-width="4"/>
  <!-- shelves -->
  <rect x="400" y="108" width="130" height="8" fill="#a08040" stroke="#172320" stroke-width="2"/>
  <rect x="400" y="168" width="130" height="8" fill="#a08040" stroke="#172320" stroke-width="2"/>
  <rect x="400" y="228" width="130" height="8" fill="#a08040" stroke="#172320" stroke-width="2"/>
  <!-- books row 1 -->
  <rect x="408" y="60"  width="14" height="46" rx="2" fill="${accentC}" stroke="#172320" stroke-width="2"/>
  <rect x="425" y="65"  width="18" height="41" rx="2" fill="#ff895e" stroke="#172320" stroke-width="2"/>
  <rect x="446" y="62"  width="12" height="44" rx="2" fill="#c9f36a" stroke="#172320" stroke-width="2"/>
  <rect x="461" y="67"  width="16" height="39" rx="2" fill="#c6b9ff" stroke="#172320" stroke-width="2"/>
  <rect x="480" y="60"  width="14" height="46" rx="2" fill="#ffd466" stroke="#172320" stroke-width="2"/>
  <rect x="497" y="64"  width="12" height="42" rx="2" fill="${accentC}" stroke="#172320" stroke-width="2"/>
  <!-- books row 2 -->
  <rect x="408" y="118" width="16" height="48" rx="2" fill="#ff895e" stroke="#172320" stroke-width="2"/>
  <rect x="427" y="120" width="14" height="46" rx="2" fill="${accentC}" stroke="#172320" stroke-width="2"/>
  <rect x="444" y="116" width="18" height="50" rx="2" fill="#c9f36a" stroke="#172320" stroke-width="2"/>
  <rect x="465" y="119" width="12" height="47" rx="2" fill="#ffd466" stroke="#172320" stroke-width="2"/>
  <rect x="480" y="121" width="16" height="45" rx="2" fill="#c6b9ff" stroke="#172320" stroke-width="2"/>
  <!-- small ornament row 3 -->
  <circle cx="420" cy="195" r="10" fill="${accentC}" stroke="#172320" stroke-width="2"/>
  <rect x="440" y="183" width="20" height="30" rx="3" fill="#ff895e" stroke="#172320" stroke-width="2"/>
  <rect x="464" y="178" width="14" height="35" rx="2" fill="#c9f36a" stroke="#172320" stroke-width="2"/>
  ` : ""}

  ${desk ? `
  <!-- Desk -->
  <rect x="80" y="270" width="250" height="60" rx="8" fill="#c9a86a" stroke="#172320" stroke-width="4"/>
  <!-- Desk legs -->
  <rect x="90"  y="328" width="14" height="38" rx="3" fill="#a08040" stroke="#172320" stroke-width="3"/>
  <rect x="302" y="328" width="14" height="38" rx="3" fill="#a08040" stroke="#172320" stroke-width="3"/>
  <!-- Monitor -->
  <rect x="130" y="200" width="120" height="78" rx="8" fill="#172320" stroke="#172320" stroke-width="4"/>
  <rect x="138" y="208" width="104" height="62" rx="4" fill="${isDark ? "#1e2d50" : "#e8f0fc"}"/>
  ${isDark ? `<rect x="148" y="218" width="60" height="6" rx="3" fill="${accentC}" opacity="0.7"/>
              <rect x="148" y="230" width="40" height="6" rx="3" fill="${accentC}" opacity="0.5"/>
              <rect x="148" y="242" width="50" height="6" rx="3" fill="${accentC}" opacity="0.4"/>` :
            `<rect x="148" y="218" width="60" height="6" rx="3" fill="#172320" opacity="0.25"/>
              <rect x="148" y="230" width="40" height="6" rx="3" fill="#172320" opacity="0.2"/>
              <rect x="148" y="242" width="50" height="6" rx="3" fill="#172320" opacity="0.15"/>`}
  <!-- Monitor stand -->
  <rect x="182" y="278" width="16" height="10" rx="2" fill="#172320" stroke="#172320" stroke-width="2"/>
  <rect x="170" y="288" width="40" height="6" rx="3" fill="#172320" opacity="0.5"/>
  <!-- Keyboard -->
  <rect x="118" y="292" width="90" height="22" rx="4" fill="#e8e0d0" stroke="#172320" stroke-width="3"/>
  <!-- Mug -->
  <rect x="262" y="258" width="28" height="22" rx="6" fill="${accentC}" stroke="#172320" stroke-width="3"/>
  <path d="M290 265 Q302 265 302 272 Q302 279 290 279" fill="none" stroke="#172320" stroke-width="3"/>
  ` : ""}

  ${bed ? `
  <!-- Bed -->
  <rect x="330" y="290" width="110" height="70" rx="8" fill="#e8e0d4" stroke="#172320" stroke-width="4"/>
  <!-- Headboard -->
  <rect x="326" y="268" width="118" height="28" rx="8" fill="#a08040" stroke="#172320" stroke-width="4"/>
  <!-- Pillow -->
  <rect x="336" y="278" width="50" height="26" rx="7" fill="#f7f5ed" stroke="#172320" stroke-width="3"/>
  <!-- Duvet texture -->
  <path d="M330 305 Q385 299 440 305" fill="none" stroke="#d0c8bc" stroke-width="3"/>
  <path d="M330 318 Q385 312 440 318" fill="none" stroke="#d0c8bc" stroke-width="3"/>
  ` : ""}

  ${floorLamp ? `
  <!-- Floor lamp -->
  <line x1="370" y1="160" x2="375" y2="320" stroke="#172320" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="370" cy="320" rx="20" ry="6" fill="#a08040" stroke="#172320" stroke-width="3"/>
  <!-- Lamp shade -->
  <path d="M350 160 Q370 130 390 160 Z" fill="#ffd466" stroke="#172320" stroke-width="3"/>
  ${isDark ? `<ellipse cx="370" cy="200" rx="60" ry="60" fill="url(#lampGlow)" opacity="0.5"/>` : ""}
  ` : ""}

  <!-- Avatar (scaled and translated) -->
  <g transform="translate(${avatarX}, ${avatarY}) scale(${avatarScale})">
    ${buildAvatarSvg(cfg, act.activity)}
  </g>

  <!-- Night overlay -->
  <rect x="0" y="0" width="540" height="400" fill="#0a0f1e" opacity="${ambientOpacity}"/>
</svg>`;

  return { svg, activity: act, period };
}

/** Returns the current day-period label for CSS animation class names. */
export function activityCssClass(activity: AvatarActivity): string {
  const map: Record<AvatarActivity, string> = {
    sleeping: "ag-activity--sleeping",
    waking: "ag-activity--waking",
    coffee: "ag-activity--coffee",
    working: "ag-activity--working",
    reading: "ag-activity--reading",
    stretching: "ag-activity--stretching",
    idle: "ag-activity--idle",
    walking: "ag-activity--walking",
  };
  return map[activity] ?? "ag-activity--idle";
}
