/**
 * Shubur Starter Apartment: a generic, configurable multi-room avatar home.
 * The scene structure draws on the author's portfolio apartment; personal
 * content has been removed. Package artwork and code are licensed Apache-2.0.
 *
 * React:
 *   import { ApartmentScene } from '@avatar-gateway/starter-apartment/react';
 *
 * Plain DOM:
 *   import { mount } from '@avatar-gateway/starter-apartment';
 *   const apartment = mount('#my-apartment');
 *   apartment.destroy();
 */

import { APARTMENT_STYLES, buildSceneSvg, currentActivity, localHour, resolveConfig } from "./scene.js";
import type { ApartmentConfig, DayActivity, DayActivitySource, DayPeriod, RoomId } from "./types.js";

export { APARTMENT_STYLES, resolveConfig, buildSceneSvg, currentActivity, dayPeriod, localHour, activityCssClass } from "./scene.js";
export {
  DEFAULT_PLACE_NAME,
  DEFAULT_AVATAR_LOOK,
  DEFAULT_ROOM_THEME,
  DEFAULT_FURNITURE,
  DEFAULT_LAYOUT,
  DEFAULT_LIGHTING,
  DEFAULT_DAY_CYCLE,
  DEFAULT_ACTIVITIES,
} from "./types.js";
export type {
  ApartmentConfig,
  ApartmentLayout,
  ApartmentRoom,
  ApartmentProp,
  FurnitureKind,
  ResolvedApartmentConfig,
  AvatarLook,
  AvatarAccessory,
  AvatarActivity,
  RoomId,
  RoomTheme,
  FurnitureConfig,
  LightingConfig,
  DayCycleConfig,
  DayActivity,
  DayActivitySource,
  DayPeriod,
  GatewayMount,
} from "./types.js";

export interface ApartmentMount {
  /** Stop the day-cycle timer and unmount a connected Avatar widget. */
  destroy(): void;
}

/** What the apartment is showing after a render. */
export interface ApartmentRenderState {
  now: Date;
  activity: DayActivity;
  period: DayPeriod;
  /** Room currently on screen. */
  room: RoomId;
  /** Room the avatar is in. */
  activityRoom: RoomId;
}

export interface ApartmentMountOptions {
  /** Clock for the day cycle. Defaults to the system clock; inject one for previews or time-lapses. */
  clock?: () => Date;
  /** Re-render interval in milliseconds, from 250 ms to 1 hour. Defaults to one minute. */
  refreshMs?: number;
  /** Show whichever room the avatar is in until a visitor picks a room themselves. */
  followAvatar?: boolean;
  /** Called after every render. */
  onRender?(state: ApartmentRenderState): void;
}

interface ResolvedMountOptions {
  clock: () => Date;
  refreshMs: number;
  followAvatar: boolean;
  onRender?: ApartmentMountOptions["onRender"];
}

const DEFAULT_REFRESH_MS = 60_000;

interface AvatarGlobal {
  mount(target: string | HTMLElement, options: { backend: string }): { destroy(): void } | void;
}

function ensureStyles(doc: Document): void {
  if (doc.querySelector("style[data-shubur-apartment-styles]")) return;
  const style = doc.createElement("style");
  style.dataset.shuburApartmentStyles = "true";
  style.textContent = APARTMENT_STYLES;
  doc.head.append(style);
}

function resolveMountOptions(options: ApartmentMountOptions): ResolvedMountOptions {
  const refreshMs = options.refreshMs ?? DEFAULT_REFRESH_MS;
  if (!Number.isFinite(refreshMs) || refreshMs < 250 || refreshMs > 3_600_000) throw new Error("refreshMs must be between 250 and 3600000 milliseconds.");
  if (options.clock !== undefined && typeof options.clock !== "function") throw new Error("clock must be a function that returns a Date.");
  if (options.onRender !== undefined && typeof options.onRender !== "function") throw new Error("onRender must be a function.");
  return {
    clock: options.clock ?? (() => new Date()),
    refreshMs,
    followAvatar: options.followAvatar === true,
    onRender: options.onRender,
  };
}

/** Fraction of the local day elapsed, from 0 up to but excluding 1. */
function dayFraction(timezone: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: timezone }).formatToParts(now);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return (localHour(timezone, now) * 60 + (Number.isFinite(minute) ? minute : 0)) / 1440;
}

function scheduleCaption(room: RoomId, activityRoom: RoomId, caption: string, roomName: string): string {
  return room === activityRoom ? caption : `A quiet ${roomName.toLowerCase()}`;
}

/**
 * Render an accessible multi-room apartment into a selector or element.
 * If `config.gateway` is supplied and the host page exposes `Avatar.mount`,
 * the widget is mounted there and cleaned up with the returned destroy method.
 */
export function mount(
  target: string | HTMLElement,
  config: ApartmentConfig = {},
  activitySource?: DayActivitySource,
  mountOptions: ApartmentMountOptions = {},
): ApartmentMount {
  if (typeof target === "string" && typeof document === "undefined") throw new Error("mount() requires a DOM environment");
  const container = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!container) throw new Error(`ApartmentScene: no element found for "${String(target)}"`);

  const resolved = resolveConfig(config);
  const options = resolveMountOptions(mountOptions);
  ensureStyles(container.ownerDocument);

  const root = container.ownerDocument.createElement("div");
  root.className = "ag-apartment";
  root.tabIndex = 0;
  const rooms = container.ownerDocument.createElement("nav");
  rooms.className = "ag-apartment__rooms";
  rooms.setAttribute("aria-label", "Apartment rooms");
  const stage = container.ownerDocument.createElement("div");
  stage.className = "ag-apartment__stage";
  const caption = container.ownerDocument.createElement("p");
  caption.className = "ag-apartment__caption";
  const captionText = container.ownerDocument.createElement("span");
  captionText.setAttribute("aria-live", "polite");
  const timeText = container.ownerDocument.createElement("time");
  timeText.className = "ag-apartment__time";
  caption.append(captionText, timeText);
  const day = container.ownerDocument.createElement("div");
  day.className = "ag-apartment__day";
  day.setAttribute("role", "img");
  root.append(rooms, stage, caption, day);
  container.replaceChildren(root);

  let selectedRoom = resolved.layout.startRoom;
  let following = options.followAvatar;
  let lastSvg = "";
  const buttonByRoom = new Map<RoomId, HTMLButtonElement>();
  for (const room of resolved.layout.rooms) {
    const button = container.ownerDocument.createElement("button");
    button.className = "ag-apartment__room";
    button.type = "button";
    button.textContent = room.name;
    button.setAttribute("aria-pressed", String(room.id === selectedRoom));
    button.addEventListener("click", () => {
      selectedRoom = room.id;
      following = false;
      render();
    });
    rooms.append(button);
    buttonByRoom.set(room.id, button);
  }

  const updateTime = (now: Date): void => {
    const hour = localHour(resolved.dayCycle.timezone, now);
    const activities = activitySource
      ? resolveConfig({ dayCycle: { timezone: resolved.dayCycle.timezone, activities: activitySource.getDayActivities(now) } }).dayCycle.activities
      : resolved.dayCycle.activities;
    const activity = currentActivity(activities, resolved.dayCycle.timezone, now);
    const activityRoom = activity.room && buttonByRoom.has(activity.room) ? activity.room : resolved.layout.startRoom;
    if (following) selectedRoom = activityRoom;
    const scene = buildSceneSvg(resolved, now, selectedRoom, activity);
    root.dataset.period = scene.period;
    root.dataset.activity = scene.activity.activity;
    root.dataset.room = scene.room.id;
    // Only swap the artwork when it changes so idle animations are not restarted on every tick.
    if (scene.svg !== lastSvg) {
      stage.innerHTML = scene.svg;
      lastSvg = scene.svg;
    }
    const nextCaption = scheduleCaption(scene.room.id, activityRoom, scene.activity.caption, scene.room.name);
    // Rewriting identical text would re-announce it on fast refresh intervals.
    if (captionText.textContent !== nextCaption) captionText.textContent = nextCaption;
    const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: resolved.dayCycle.timezone }).format(now);
    timeText.textContent = `${time} · ${resolved.dayCycle.timezone}`;
    timeText.dateTime = now.toISOString();
    day.setAttribute("aria-label", `Daily routine. Current local hour ${hour}.`);
    day.replaceChildren(...activities.map((item) => {
      const segment = container.ownerDocument.createElement("span");
      segment.style.width = `${((item.endHour - item.startHour) / 24 * 100).toFixed(3)}%`;
      segment.style.background = "#597b72";
      segment.title = `${item.caption} · ${String(item.startHour).padStart(2, "0")}:00–${String(item.endHour).padStart(2, "0")}:00`;
      segment.setAttribute("aria-hidden", "true");
      return segment;
    }));
    const marker = container.ownerDocument.createElement("i");
    marker.className = "ag-apartment__now";
    marker.style.left = `${(dayFraction(resolved.dayCycle.timezone, now) * 100).toFixed(3)}%`;
    marker.setAttribute("aria-hidden", "true");
    day.append(marker);
    for (const [id, button] of buttonByRoom) button.setAttribute("aria-pressed", String(id === selectedRoom));
    options.onRender?.({ now, activity: scene.activity, period: scene.period, room: scene.room.id, activityRoom });
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = resolved.layout.rooms.findIndex((room) => room.id === selectedRoom);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    selectedRoom = resolved.layout.rooms[(index + offset + resolved.layout.rooms.length) % resolved.layout.rooms.length]!.id;
    following = false;
    event.preventDefault();
    render();
  };
  function render(now = options.clock()): void { updateTime(now); }
  root.addEventListener("keydown", handleKeyDown);
  render();

  const timer = resolved.dayCycle.enabled || activitySource ? setInterval(() => render(), options.refreshMs) : undefined;
  let avatar: { destroy(): void } | void;
  if (resolved.gateway) {
    const globalAvatar = (globalThis as typeof globalThis & { Avatar?: AvatarGlobal }).Avatar;
    avatar = globalAvatar?.mount(resolved.gateway.selector, { backend: resolved.gateway.backendUrl });
  }

  return {
    destroy(): void {
      if (timer !== undefined) clearInterval(timer);
      root.removeEventListener("keydown", handleKeyDown);
      avatar?.destroy();
      if (root.parentElement === container) container.replaceChildren();
    },
  };
}
