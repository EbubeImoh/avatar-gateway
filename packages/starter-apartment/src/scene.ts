/** Configuration validation, current local lighting, and apartment SVG artwork. */

import type {
  ApartmentConfig,
  ApartmentProp,
  ApartmentRoom,
  AvatarActivity,
  AvatarAccessory,
  HomeActivity,
  DayPeriod,
  FurnitureKind,
  ResolvedApartmentConfig,
  RoomId,
} from "./types.js";
import {
  DEFAULT_AVATAR_LOOK,
  DEFAULT_FURNITURE,
  DEFAULT_LAYOUT,
  DEFAULT_LIGHTING,
  DEFAULT_PLACE_NAME,
  DEFAULT_ROOM_THEME,
  DEFAULT_TIME_ZONE,
} from "./types.js";

const ROOM_IDS = new Set<RoomId>(["studio", "living", "kitchen", "bedroom", "bathroom", "gym", "garage"]);
const FURNITURE_KINDS = new Set<FurnitureKind>([
  "desk", "bed", "bookshelf", "plant", "window", "floorLamp", "coffeeTable", "sofa",
  "island", "sink", "shower", "mirror", "weights", "mat", "car", "toolShelf", "phone",
]);
const ACCESSORIES = new Set<AvatarAccessory>(["glasses", "headphones", "hat", "none"]);
const ACTIVITIES = new Set<AvatarActivity>(["sleeping", "waking", "coffee", "working", "reading", "stretching", "idle", "walking"]);
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function assertColor(value: string, label: string): void {
  if (typeof value !== "string" || !COLOR_RE.test(value)) throw new Error(`${label} must be a six-digit hex color.`);
}

function assertRoomId(value: string, label: string): asserts value is RoomId {
  if (!ROOM_IDS.has(value as RoomId)) throw new Error(`${label} is not a supported apartment room.`);
}

function validateRoom(room: ApartmentRoom, index: number): ApartmentRoom {
  assertRoomId(room.id, `layout.rooms[${index}].id`);
  if (!room.name.trim() || room.name.length > 40) throw new Error(`layout.rooms[${index}].name must contain 1–40 characters.`);
  if (!Array.isArray(room.furniture) || room.furniture.some((kind) => !FURNITURE_KINDS.has(kind))) {
    throw new Error(`layout.rooms[${index}].furniture contains an unsupported item.`);
  }
  if (room.wallColor !== undefined) assertColor(room.wallColor, `layout.rooms[${index}].wallColor`);
  if (room.floorColor !== undefined) assertColor(room.floorColor, `layout.rooms[${index}].floorColor`);
  return { ...room, furniture: [...new Set(room.furniture)] };
}

function validateProp(prop: ApartmentProp, index: number, roomIds: Set<RoomId>): ApartmentProp {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(prop.id)) throw new Error(`props[${index}].id must use letters, numbers, underscores, or hyphens.`);
  assertRoomId(prop.room, `props[${index}].room`);
  if (!roomIds.has(prop.room)) throw new Error(`props[${index}] refers to a room that is not in the layout.`);
  if (!FURNITURE_KINDS.has(prop.kind)) throw new Error(`props[${index}].kind is not supported.`);
  if (typeof prop.label !== "string" || !prop.label.trim() || prop.label.length > 60) throw new Error(`props[${index}].label must contain 1–60 characters.`);
  if (!Number.isFinite(prop.x) || prop.x < 0 || prop.x > 100 || !Number.isFinite(prop.y) || prop.y < 0 || prop.y > 100) {
    throw new Error(`props[${index}] x and y must be percentages from 0 to 100.`);
  }
  if (prop.scale !== undefined && (!Number.isFinite(prop.scale) || prop.scale < 0.25 || prop.scale > 2)) {
    throw new Error(`props[${index}].scale must be between 0.25 and 2.`);
  }
  if (prop.color !== undefined) assertColor(prop.color, `props[${index}].color`);
  return { ...prop };
}

function validateTimezone(timezone: string): void {
  try {
    if (typeof timezone !== "string" || !timezone.trim()) throw new Error("invalid");
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  }
  catch { throw new Error("timeZone must be a valid IANA timezone."); }
}

export function resolveConfig(config: ApartmentConfig = {}): ResolvedApartmentConfig {
  const name = config.name ?? DEFAULT_PLACE_NAME;
  if (typeof name !== "string" || !name.trim() || name.length > 60) throw new Error("name must contain 1–60 characters.");

  const avatar = { ...DEFAULT_AVATAR_LOOK, ...config.avatar };
  for (const [key, value] of Object.entries({
    skinTone: avatar.skinTone,
    hairColor: avatar.hairColor,
    outfitColor: avatar.outfitColor,
    trouserColor: avatar.trouserColor,
  })) assertColor(value, `avatar.${key}`);
  if (!avatar.name.trim() || avatar.name.length > 100) throw new Error("avatar.name must contain 1–100 characters.");
  if (!Array.isArray(avatar.accessories) || avatar.accessories.some((item) => !ACCESSORIES.has(item))) throw new Error("avatar.accessories contains an unsupported accessory.");

  const room = { ...DEFAULT_ROOM_THEME, ...config.room };
  for (const [key, value] of Object.entries(room)) assertColor(value, `room.${key}`);

  const furniture = { ...DEFAULT_FURNITURE, ...config.furniture };
  for (const [key, value] of Object.entries(furniture)) {
    if (!FURNITURE_KINDS.has(key as FurnitureKind) || typeof value !== "boolean") throw new Error(`furniture.${key} must be a boolean option.`);
  }

  const suppliedRooms = config.layout?.rooms ?? DEFAULT_LAYOUT.rooms;
  if (!Array.isArray(suppliedRooms) || suppliedRooms.length < 1 || suppliedRooms.length > ROOM_IDS.size) {
    throw new Error(`layout.rooms must contain between 1 and ${ROOM_IDS.size} rooms.`);
  }
  const rooms = suppliedRooms.map(validateRoom);
  const roomIds = new Set(rooms.map((item) => item.id));
  if (roomIds.size !== rooms.length) throw new Error("layout.rooms cannot contain duplicate room ids.");
  const startRoom = config.layout?.startRoom ?? DEFAULT_LAYOUT.startRoom;
  assertRoomId(startRoom, "layout.startRoom");
  if (!roomIds.has(startRoom)) throw new Error("layout.startRoom must be included in layout.rooms.");

  const props = (config.props ?? []).map((prop, index) => validateProp(prop, index, roomIds));
  if (new Set(props.map((prop) => prop.id)).size !== props.length) throw new Error("props ids must be unique.");

  const lighting = { ...DEFAULT_LIGHTING, ...config.lighting };
  assertColor(lighting.ambientDayColor, "lighting.ambientDayColor");
  assertColor(lighting.ambientNightColor, "lighting.ambientNightColor");
  assertColor(lighting.glowColor, "lighting.glowColor");
  if (!Number.isFinite(lighting.nightDimOpacity) || lighting.nightDimOpacity < 0 || lighting.nightDimOpacity > 0.8) {
    throw new Error("lighting.nightDimOpacity must be between 0 and 0.8.");
  }

  const timeZone = config.timeZone ?? DEFAULT_TIME_ZONE;
  validateTimezone(timeZone);

  if (config.gateway) {
    if (!config.gateway.selector.trim() || !config.gateway.backendUrl.startsWith("/") || config.gateway.backendUrl.startsWith("//") || config.gateway.backendUrl.includes("\\")) {
      throw new Error("gateway must provide a selector and same-origin absolute backend path.");
    }
  }
  if (config.assetCredits && config.assetCredits.length > 1000) throw new Error("assetCredits must be at most 1000 characters.");

  return {
    name: name.trim(),
    avatar,
    room,
    furniture,
    layout: { startRoom, rooms },
    props,
    lighting,
    timeZone,
    gateway: config.gateway,
    assetCredits: config.assetCredits,
  };
}

/** Returns the local 24-hour clock value for an IANA timezone. */
export function localHour(timezone: string, now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).formatToParts(now);
    const value = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    return Number.isFinite(value) ? value % 24 : now.getHours();
  } catch {
    return now.getHours();
  }
}

export function dayPeriod(timezone: string, now = new Date()): DayPeriod {
  const hour = localHour(timezone, now);
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "noon";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 21) return "evening";
  return "night";
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function daylight(period: DayPeriod): boolean {
  return period !== "night" && period !== "evening";
}

function windowSvg(color: string, period: DayPeriod, glow: string): string {
  const sun = daylight(period)
    ? `<circle cx="365" cy="91" r="19" fill="${glow}" opacity=".85"/><path d="M325 139 Q360 120 399 140" fill="none" stroke="#f8faf6" stroke-width="4" opacity=".65"/>`
    : `<circle cx="365" cy="91" r="16" fill="#f6efd3"/><circle cx="372" cy="86" r="16" fill="${color}"/><g fill="#f6efd3"><circle cx="330" cy="74" r="2"/><circle cx="402" cy="108" r="2"/><circle cx="345" cy="126" r="1.7"/></g>`;
  return `<g aria-hidden="true"><rect x="300" y="48" width="130" height="100" rx="5" fill="#364552" stroke="#18242d" stroke-width="5"/><rect x="307" y="55" width="116" height="86" fill="${color}"/><path d="M365 56V141M308 98H422" stroke="#d2cbb7" stroke-width="5"/>${sun}<path d="M292 149H438" stroke="#817663" stroke-width="8" stroke-linecap="round"/></g>`;
}

function furnitureSvg(kind: FurnitureKind, x: number, y: number, scale = 1, accent = "#597b72", color?: string): string {
  const dx = x.toFixed(1);
  const dy = y.toFixed(1);
  const s = scale.toFixed(2);
  const wood = color ?? "#9a7152";
  const ink = "#25333a";
  const shapes: Record<FurnitureKind, string> = {
    desk: `<path d="M5 34H140V45H5zM15 45H24V98H15zM120 45H129V98H120z" fill="${wood}" stroke="${ink}" stroke-width="4"/><rect x="52" y="-14" width="54" height="45" rx="4" fill="#344752" stroke="${ink}" stroke-width="4"/><rect x="57" y="-9" width="44" height="34" rx="2" fill="#b7d7dc"/><path d="M77 33h8v8h-8zM43 36h74" fill="none" stroke="${ink}" stroke-width="3"/><path d="M57 2h31m-31 7h22" stroke="${accent}" stroke-width="3"/>`,
    bed: `<path d="M4 26H144V84H4z" fill="${wood}" stroke="${ink}" stroke-width="4"/><path d="M11 23H137V56H11z" fill="#d7d2c2" stroke="${ink}" stroke-width="3"/><rect x="15" y="26" width="38" height="21" rx="8" fill="#f5f0e2"/><path d="M55 46H137V78H55z" fill="${accent}" opacity=".82"/><path d="M13 84v14m122-14v14" stroke="${ink}" stroke-width="6"/>`,
    bookshelf: `<rect x="3" y="0" width="72" height="102" rx="4" fill="${wood}" stroke="${ink}" stroke-width="4"/><path d="M7 31H71M7 62H71" stroke="#604a3c" stroke-width="5"/><path d="M13 5h12v22H13zm17 4h11v18H30zm16-2h15v20H46zM14 36h11v21H14zm16-1h13v22H30zm18 3h18v18H48zM15 67h13v23H15zm18 4h14v19H33z" fill="#e1b26f" stroke="${ink}" stroke-width="2"/>`,
    plant: `<path d="M24 49h48l-6 42H30z" fill="#ba805a" stroke="${ink}" stroke-width="4"/><path d="M48 49C21 38 17 15 28 10c14 2 21 21 20 39M48 49C53 18 75 8 83 17c-2 16-17 28-35 32M48 49C34 26 41 4 52 3c12 10 10 30-4 46" fill="${accent}" stroke="${ink}" stroke-width="3"/>`,
    window: windowSvg("#b7d7dc", "afternoon", "#ffe7a3"),
    floorLamp: `<path d="M42 92h47m-23 0V22" stroke="${ink}" stroke-width="6" stroke-linecap="round"/><path d="M49 24h35L76 2H57z" fill="#e2bd74" stroke="${ink}" stroke-width="4"/><circle cx="66" cy="36" r="25" fill="#ffe7a3" opacity=".14"/>`,
    coffeeTable: `<path d="M5 18h110v12H5zM16 30h8v35h-8zm80 0h8v35h-8z" fill="${wood}" stroke="${ink}" stroke-width="4"/><path d="M48 13h18v5H48z" fill="#efe4cc" stroke="${ink}" stroke-width="2"/>`,
    sofa: `<path d="M10 28q0-14 14-14h86q14 0 14 14v48H10z" fill="${accent}" stroke="${ink}" stroke-width="4"/><path d="M20 31h42v36H20zm48 0h45v36H68z" fill="#75968c" stroke="${ink}" stroke-width="3"/><path d="M10 66h114v18H10zM19 84v12m96-12v12" stroke="${ink}" stroke-width="5"/>`,
    island: `<path d="M2 12h145v13H2zM10 25h130v63H10z" fill="#d9d2c0" stroke="${ink}" stroke-width="4"/><path d="M15 39h120M21 88v12m107-12v12" stroke="#92745d" stroke-width="4"/><path d="M35 6v6m80-6v6" stroke="${ink}" stroke-width="6"/>`,
    sink: `<rect x="5" y="30" width="120" height="52" rx="4" fill="${wood}" stroke="${ink}" stroke-width="4"/><path d="M17 27q48 37 96 0v18q-48 28-96 0z" fill="#dbe3df" stroke="${ink}" stroke-width="3"/><path d="M65 20V7q0-7 8-7h12" fill="none" stroke="#647d88" stroke-width="5"/>`,
    shower: `<rect x="8" y="5" width="95" height="89" fill="#a9c3c9" fill-opacity=".45" stroke="${ink}" stroke-width="4"/><path d="M18 12h76M19 18v72M92 18v72" stroke="#e6ece9" stroke-width="4"/><path d="M48 6q20 0 20 16M63 24v24m-9-16 9 8 9-8" fill="none" stroke="#647d88" stroke-width="4"/>`,
    mirror: `<rect x="15" y="2" width="65" height="82" rx="24" fill="#c7d9d9" stroke="${ink}" stroke-width="4"/><path d="M28 21q19-14 39-5" stroke="#f7f7ed" stroke-width="5" fill="none"/>`,
    weights: `<path d="M12 35h115M28 18v34m-9-27v20m85-27v34m9-27v20" stroke="${ink}" stroke-width="7" stroke-linecap="round"/><path d="M45 68h54" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`,
    mat: `<rect x="4" y="25" width="115" height="55" rx="25" fill="${accent}" stroke="${ink}" stroke-width="4"/><path d="M27 28v49m67-49v49" stroke="#d3e0d9" stroke-width="3" opacity=".7"/>`,
    car: `<path d="M10 59l12-25q4-9 14-9h49q10 0 16 9l19 25v21H9z" fill="${accent}" stroke="${ink}" stroke-width="4"/><path d="M29 34h26v21H18zm33 0h22q8 0 12 8l8 13H62z" fill="#bed7d8" stroke="${ink}" stroke-width="3"/><circle cx="32" cy="81" r="12" fill="#343c40"/><circle cx="99" cy="81" r="12" fill="#343c40"/><circle cx="32" cy="81" r="5" fill="#bdc7c4"/><circle cx="99" cy="81" r="5" fill="#bdc7c4"/>`,
    toolShelf: `<rect x="4" y="2" width="105" height="92" fill="${wood}" stroke="${ink}" stroke-width="4"/><path d="M8 32h97M8 62h97" stroke="#654c3b" stroke-width="5"/><path d="M18 6v22m18-22v22m25-22v22m22 6v22m-44-22v22m47 8v23m20-23v23" stroke="${accent}" stroke-width="7"/>`,
    phone: `<rect x="35" y="2" width="48" height="96" rx="9" fill="#202a35" stroke="${ink}" stroke-width="4"/><rect x="41" y="12" width="36" height="70" rx="3" fill="#8ad4dc"/><path d="M48 24h23M48 34h20M48 44h23M48 54h16" stroke="#315b68" stroke-width="4" stroke-linecap="round"/><circle cx="59" cy="90" r="3" fill="#a8b7c0"/>`,
  };
  return `<g transform="translate(${dx} ${dy}) scale(${s})" role="img" aria-label="${esc(kind)}">${shapes[kind]}</g>`;
}

function buildAvatarSvg(cfg: ResolvedApartmentConfig, activity: AvatarActivity, x: number, y: number): string {
  const { skinTone, hairColor, outfitColor, trouserColor, accessories, name } = cfg.avatar;
  const sleeping = activity === "sleeping";
  const stretch = activity === "stretching";
  const work = activity === "working";
  const raised = stretch
    ? `<path d="M54 98L38 66q-3-7 4-11 6-3 10 4l15 27m45 12 16-32q3-7-4-11-7-3-10 4l-14 27" fill="${skinTone}" stroke="#25333a" stroke-width="5" stroke-linejoin="round"/>`
    : work
    ? `<path d="M55 105l-13 28q-3 7 4 11 7 3 11-4l15-25m41-10 15 25q4 7 10 3 6-4 2-11l-19-28" fill="${skinTone}" stroke="#25333a" stroke-width="5" stroke-linejoin="round"/>`
    : `<path d="M55 104l-16 27q-4 7 3 11 7 4 11-3l19-26m38-9 18 26q5 7 11 2 6-5 1-11l-21-27" fill="${skinTone}" stroke="#25333a" stroke-width="5" stroke-linejoin="round"/>`;
  const accessory = accessories.includes("glasses")
    ? `<path d="M48 45h19m24 0h19" stroke="#25333a" stroke-width="4"/><rect x="53" y="38" width="18" height="15" rx="4" fill="none" stroke="#25333a" stroke-width="3"/><rect x="87" y="38" width="18" height="15" rx="4" fill="none" stroke="#25333a" stroke-width="3"/>`
    : accessories.includes("headphones")
    ? `<path d="M45 47V37q0-31 36-31t36 31v10" fill="none" stroke="#25333a" stroke-width="6"/><rect x="41" y="41" width="12" height="24" rx="5" fill="#8da0b2" stroke="#25333a" stroke-width="3"/><rect x="109" y="41" width="12" height="24" rx="5" fill="#8da0b2" stroke="#25333a" stroke-width="3"/>`
    : accessories.includes("hat")
    ? `<path d="M43 25q2-19 38-19t38 19v6H43zM33 30h96v8H33z" fill="#e2bd74" stroke="#25333a" stroke-width="4"/>`
    : "";
  const transform = sleeping
    ? `translate(${x} ${y}) scale(.68) rotate(-78 80 104) translate(-24 4)`
    : `translate(${x} ${y}) scale(.68)`;
  // Position on an outer group: CSS transform-origin on the animated group would otherwise re-base this transform.
  return `<g transform="${transform}"><g class="ag-apartment__avatar" role="img" aria-label="${esc(name)} is ${activity}">
    <rect x="51" y="15" width="58" height="55" rx="18" fill="${skinTone}" stroke="#25333a" stroke-width="5"/>
    <path d="M52 29q-2-24 28-26 28 1 30 24-20-12-58 2" fill="${hairColor}" stroke="#25333a" stroke-width="4"/>
    <circle cx="68" cy="45" r="3.5" fill="#25333a"/><circle cx="93" cy="45" r="3.5" fill="#25333a"/>
    <path d="M71 56q10 9 20 0" fill="none" stroke="#25333a" stroke-width="3" stroke-linecap="round"/>${accessory}
    <path d="M52 83q0-11 12-11h37q12 0 12 11v48H52z" fill="${outfitColor}" stroke="#25333a" stroke-width="5"/>
    <circle cx="68" cy="81" r="5" fill="#e9e3d4"/><circle cx="83" cy="78" r="5" fill="#e9e3d4"/><circle cx="98" cy="81" r="5" fill="#e9e3d4"/>
    ${raised}
    <path d="M61 131v30q0 7 7 7h18v-37zm28 0v37h18q7 0 7-7v-30z" fill="${trouserColor}" stroke="#25333a" stroke-width="5"/>
    <path d="M62 166h23m6 0h22" stroke="#25333a" stroke-width="8" stroke-linecap="round"/>
  </g></g>`;
}

function defaultFurniturePosition(kind: FurnitureKind): { x: number; y: number; scale: number } {
  const positions: Record<FurnitureKind, { x: number; y: number; scale: number }> = {
    desk: { x: 52, y: 198, scale: 1.1 }, bed: { x: 395, y: 210, scale: 1.15 }, bookshelf: { x: 485, y: 92, scale: 0.9 },
    plant: { x: 115, y: 130, scale: 0.8 }, window: { x: 0, y: 0, scale: 1 }, floorLamp: { x: 465, y: 190, scale: 0.85 },
    coffeeTable: { x: 290, y: 264, scale: 1 }, sofa: { x: 160, y: 205, scale: 1 }, island: { x: 218, y: 214, scale: 1 },
    sink: { x: 100, y: 201, scale: 0.9 }, shower: { x: 407, y: 92, scale: 0.88 }, mirror: { x: 286, y: 87, scale: 0.9 },
    weights: { x: 365, y: 229, scale: 1 }, mat: { x: 183, y: 279, scale: 0.9 }, car: { x: 181, y: 189, scale: 1.45 },
    toolShelf: { x: 425, y: 104, scale: 0.9 }, phone: { x: 320, y: 208, scale: 0.55 },
  };
  return positions[kind];
}

function renderFurniture(room: ApartmentRoom, cfg: ResolvedApartmentConfig): string {
  return room.furniture
    .filter((kind) => cfg.furniture[kind])
    .filter((kind) => kind !== "window")
    .map((kind) => {
      const position = defaultFurniturePosition(kind);
      const label = kind.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/^./, (letter) => letter.toUpperCase());
      return `<g class="ag-apartment__furniture-item" data-furniture="${kind}" role="img" aria-label="${label}">${furnitureSvg(kind, position.x, position.y, position.scale, cfg.room.accentColor)}</g>`;
    }).join("");
}

function renderProps(room: ApartmentRoom, props: ApartmentProp[], accent: string): string {
  return props.filter((prop) => prop.room === room.id).map((prop) => {
    const x = 54 + prop.x * 5.25;
    const y = 52 + prop.y * 2.55;
    const color = prop.color ?? accent;
    return `<g class="ag-apartment__prop" aria-label="${esc(prop.label)}">${furnitureSvg(prop.kind, x, y, prop.scale ?? 0.65, color, color)}</g>`;
  }).join("");
}

export interface BuiltScene {
  svg: string;
  activity: HomeActivity;
  period: DayPeriod;
  room: ApartmentRoom;
}

export function buildSceneSvg(cfg: ResolvedApartmentConfig, now = new Date(), selectedRoom?: RoomId, activityOverride?: HomeActivity): BuiltScene {
  const period = dayPeriod(cfg.timeZone, now);
  const activity = activityOverride ?? { activity: "idle" as const, caption: "The room is ready for your agent", room: cfg.layout.startRoom };
  const activityRoom = activity.room && cfg.layout.rooms.some((room) => room.id === activity.room)
    ? activity.room
    : cfg.layout.startRoom;
  const roomId = selectedRoom ?? activityRoom;
  const currentRoom = cfg.layout.rooms.find((item) => item.id === roomId);
  if (!currentRoom) throw new Error(`Room ${roomId} is not in the apartment layout.`);

  const wallColor = currentRoom.wallColor ?? cfg.room.wallColor;
  const floorColor = currentRoom.floorColor ?? cfg.room.floorColor;
  const windowColor = daylight(period) ? cfg.room.windowDaytimeColor : cfg.room.windowNightColor;
  const isNight = !daylight(period);
  const tint = isNight ? cfg.lighting.ambientNightColor : cfg.lighting.ambientDayColor;
  const roomFurniture = renderFurniture(currentRoom, cfg);
  const props = renderProps(currentRoom, cfg.props, cfg.room.accentColor);
  const showWindow = currentRoom.furniture.includes("window") && cfg.furniture.window;
  const avatarInRoom = activityOverride !== undefined && currentRoom.id === activityRoom;
  const avatarX = activity.activity === "working" ? 212 : activity.activity === "sleeping" ? 362 : 265;
  const avatarY = activity.activity === "sleeping" ? 202 : 195;
  const currentCaption = avatarInRoom ? activity.caption : `A quiet ${currentRoom.name.toLowerCase()} · avatar is in the ${cfg.layout.rooms.find((item) => item.id === activityRoom)?.name.toLowerCase() ?? "home"}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 390" role="img" aria-label="${esc(currentRoom.name)} in the Shubur Starter Apartment. ${esc(currentCaption)}">
    <defs>
      <linearGradient id="ag-wall" x2="0" y2="1"><stop offset="0" stop-color="${wallColor}"/><stop offset="1" stop-color="#bdb8aa"/></linearGradient>
      <linearGradient id="ag-floor" x2="0" y2="1"><stop offset="0" stop-color="${floorColor}"/><stop offset="1" stop-color="#786752"/></linearGradient>
      <pattern id="ag-boards" width="68" height="28" patternUnits="userSpaceOnUse"><path d="M0 0H68M0 14H68M33 0v14M10 14v14" stroke="#473d34" stroke-opacity=".2" stroke-width="1.5"/></pattern>
      <radialGradient id="ag-light"><stop offset="0" stop-color="${cfg.lighting.glowColor}" stop-opacity=".42"/><stop offset="1" stop-color="${cfg.lighting.glowColor}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="640" height="390" rx="18" fill="#39464a"/>
    <path d="M0 0H640V205L530 250H110L0 205z" fill="url(#ag-wall)"/>
    <path d="M0 0l110 205v93L0 245z" fill="#a9a698"/>
    <path d="M640 0 530 205v93l110-53z" fill="#b5b0a4"/>
    <path d="M110 205H530L640 390H0z" fill="url(#ag-floor)"/>
    <path d="M110 205H530L640 390H0z" fill="url(#ag-boards)" opacity=".8"/>
    <path d="M0 242l110-37v9L0 253zm640 0-110-37v9l110 44z" fill="${cfg.room.accentColor}" opacity=".85"/>
    ${showWindow ? windowSvg(windowColor, period, cfg.lighting.glowColor) : ""}
    <ellipse cx="320" cy="257" rx="245" ry="146" fill="url(#ag-light)" opacity="${isNight ? ".28" : ".58"}"/>
    <g class="ag-apartment__furniture">${roomFurniture}${props}</g>
    ${avatarInRoom ? buildAvatarSvg(cfg, activity.activity, avatarX, avatarY) : `<text x="320" y="340" text-anchor="middle" fill="#f5f0e2" font-family="system-ui,sans-serif" font-size="15" opacity=".9">The room is quiet right now</text>`}
    <rect width="640" height="390" rx="18" fill="${tint}" opacity="${isNight ? cfg.lighting.nightDimOpacity : ".06"}" pointer-events="none"/>
    <path d="M0 0H640V205L530 250H110L0 205z" fill="none" stroke="#293438" stroke-width="3" opacity=".65"/>
    <text x="24" y="31" fill="#293438" font-family="system-ui,sans-serif" font-size="13" font-weight="700" letter-spacing="1.3">${esc(currentRoom.name.toUpperCase())}</text>
  </svg>`;
  return { svg, activity, period, room: currentRoom };
}

export const APARTMENT_STYLES = `
.ag-apartment{max-width:760px;color:#25333a;font-family:ui-rounded,"Avenir Next",system-ui,sans-serif}
.ag-apartment__rooms{display:flex;gap:7px;overflow-x:auto;padding:8px 3px 12px;scrollbar-width:thin}
.ag-apartment__room{flex:0 0 auto;border:1.5px solid #25333a;border-radius:999px;padding:7px 12px;background:#f5f0e2;color:#25333a;font:inherit;font-size:12px;line-height:1.2;font-weight:650;cursor:pointer}
.ag-apartment__room[aria-pressed=true]{background:#cfe477;box-shadow:2px 2px 0 #25333a}
.ag-apartment__room:focus-visible{outline:3px solid #597b72;outline-offset:2px}
.ag-apartment__stage{overflow:hidden;border:2px solid #25333a;border-radius:18px;background:#39464a;box-shadow:5px 5px 0 #25333a}
.ag-apartment__stage svg{display:block;width:100%;height:auto;animation:ag-enter .5s ease-out}
.ag-apartment__avatar{transform-box:fill-box;transform-origin:center bottom;animation:ag-bob 2.8s ease-in-out infinite}
.ag-apartment[data-activity=walking] .ag-apartment__avatar{animation-duration:.55s}
.ag-apartment__caption{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:12px 2px 5px;font-size:13px;font-weight:650}
@keyframes ag-bob{50%{translate:0 -3px}}
@keyframes ag-enter{from{opacity:.35}}
@media(prefers-reduced-motion:reduce){.ag-apartment__avatar,.ag-apartment__stage svg{animation:none}}
`;

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
  return map[activity];
}
