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

import { APARTMENT_STYLES, buildSceneSvg, localHour, resolveConfig } from "./scene.js";
import type { ApartmentConfig, RoomId } from "./types.js";

export { APARTMENT_STYLES, resolveConfig, buildSceneSvg, currentActivity, dayPeriod, localHour, activityCssClass } from "./scene.js";
export {
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
  DayPeriod,
  GatewayMount,
} from "./types.js";

export interface ApartmentMount {
  /** Stop the day-cycle timer and unmount a connected Avatar widget. */
  destroy(): void;
}

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

function scheduleCaption(room: RoomId, activityRoom: RoomId, caption: string, roomName: string): string {
  return room === activityRoom ? caption : `A quiet ${roomName.toLowerCase()}`;
}

/**
 * Render an accessible multi-room apartment into a selector or element.
 * If `config.gateway` is supplied and the host page exposes `Avatar.mount`,
 * the widget is mounted there and cleaned up with the returned destroy method.
 */
export function mount(target: string | HTMLElement, config: ApartmentConfig = {}): ApartmentMount {
  if (typeof target === "string" && typeof document === "undefined") throw new Error("mount() requires a DOM environment");
  const container = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!container) throw new Error(`ApartmentScene: no element found for "${String(target)}"`);

  const resolved = resolveConfig(config);
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
  caption.setAttribute("aria-live", "polite");
  const captionText = container.ownerDocument.createElement("span");
  const timeText = container.ownerDocument.createElement("time");
  timeText.className = "ag-apartment__time";
  caption.append(captionText, timeText);
  const day = container.ownerDocument.createElement("div");
  day.className = "ag-apartment__day";
  day.setAttribute("role", "img");
  root.append(rooms, stage, caption, day);
  container.replaceChildren(root);

  let selectedRoom = resolved.layout.startRoom;
  const buttonByRoom = new Map<RoomId, HTMLButtonElement>();
  for (const room of resolved.layout.rooms) {
    const button = container.ownerDocument.createElement("button");
    button.className = "ag-apartment__room";
    button.type = "button";
    button.textContent = room.name;
    button.setAttribute("aria-pressed", String(room.id === selectedRoom));
    button.addEventListener("click", () => {
      selectedRoom = room.id;
      render();
    });
    rooms.append(button);
    buttonByRoom.set(room.id, button);
  }

  const updateTime = (now: Date): void => {
    const hour = localHour(resolved.dayCycle.timezone, now);
    const activity = resolved.dayCycle.activities.find((item) => hour >= item.startHour && hour < item.endHour)
      ?? resolved.dayCycle.activities[0]!;
    const activityRoom = activity.room ?? resolved.layout.startRoom;
    const scene = buildSceneSvg(resolved, now, selectedRoom);
    root.dataset.period = scene.period;
    root.dataset.activity = scene.activity.activity;
    stage.innerHTML = scene.svg;
    captionText.textContent = scheduleCaption(scene.room.id, activityRoom, scene.activity.caption, scene.room.name);
    const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: resolved.dayCycle.timezone }).format(now);
    timeText.textContent = `${time} · ${resolved.dayCycle.timezone}`;
    timeText.dateTime = now.toISOString();
    day.setAttribute("aria-label", `Daily routine. Current local hour ${hour}.`);
    day.replaceChildren(...resolved.dayCycle.activities.map((item) => {
      const segment = container.ownerDocument.createElement("span");
      segment.style.width = `${((item.endHour - item.startHour) / 24 * 100).toFixed(3)}%`;
      segment.style.background = "#597b72";
      segment.title = `${item.caption} · ${String(item.startHour).padStart(2, "0")}:00–${String(item.endHour).padStart(2, "0")}:00`;
      segment.setAttribute("aria-hidden", "true");
      return segment;
    }));
    for (const [id, button] of buttonByRoom) button.setAttribute("aria-pressed", String(id === selectedRoom));
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = resolved.layout.rooms.findIndex((room) => room.id === selectedRoom);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    selectedRoom = resolved.layout.rooms[(index + offset + resolved.layout.rooms.length) % resolved.layout.rooms.length]!.id;
    event.preventDefault();
    render();
  };
  function render(now = new Date()): void { updateTime(now); }
  root.addEventListener("keydown", handleKeyDown);
  render();

  const timer = resolved.dayCycle.enabled ? setInterval(() => render(), 60_000) : undefined;
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
