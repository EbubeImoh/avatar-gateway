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

import { APARTMENT_STYLES, buildSceneSvg, resolveConfig } from "./scene.js";
import type { ApartmentConfig, HomeActivity, HomeActivitySource, DayPeriod, RoomId } from "./types.js";

export { APARTMENT_STYLES, resolveConfig, buildSceneSvg, dayPeriod, localHour, activityCssClass } from "./scene.js";
export {
  DEFAULT_PLACE_NAME,
  DEFAULT_AVATAR_LOOK,
  DEFAULT_ROOM_THEME,
  DEFAULT_FURNITURE,
  DEFAULT_LAYOUT,
  DEFAULT_LIGHTING,
  DEFAULT_TIME_ZONE,
  APARTMENT_TYPES,
  apartmentTypeConfig,
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
  HomeActivity,
  HomeActivitySource,
  DayPeriod,
  GatewayMount,
  ApartmentTypeId,
  ApartmentTypeObject,
  ApartmentTypeDefinition,
} from "./types.js";

export interface ApartmentMount {
  /** Stop scene updates and unmount a connected Avatar widget. */
  destroy(): void;
}

/** What the apartment is showing after a render. */
export interface ApartmentRenderState {
  now: Date;
  activity: HomeActivity;
  period: DayPeriod;
  /** Room currently on screen. */
  room: RoomId;
  /** Room the avatar is in. */
  activityRoom: RoomId;
}

export interface ApartmentMountOptions {
  /** Clock used for current activity updates. Defaults to the system clock. */
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

/**
 * Render an accessible multi-room apartment into a selector or element.
 * If `config.gateway` is supplied and the host page exposes `Avatar.mount`,
 * the widget is mounted there and cleaned up with the returned destroy method.
 */
export function mount(
  target: string | HTMLElement,
  config: ApartmentConfig = {},
  activitySource?: HomeActivitySource,
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
  caption.append(captionText);
  root.append(rooms, stage, caption);
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
    const activity = activitySource?.getCurrentActivity(now);
    const activityRoom = activity?.room && buttonByRoom.has(activity.room) ? activity.room : resolved.layout.startRoom;
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
    const nextCaption = activity
      ? scene.room.id === activityRoom ? activity.caption : `A quiet ${scene.room.name.toLowerCase()}`
      : scene.activity.caption;
    // Rewriting identical text would re-announce it on fast refresh intervals.
    if (captionText.textContent !== nextCaption) captionText.textContent = nextCaption;
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

  const timer = setInterval(() => render(), options.refreshMs);
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
