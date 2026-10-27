/**
 * @avatar-gateway/starter-apartment
 *
 * Drop in the apartment scene from Ebube Imoh's portfolio — a Lego-style
 * brick avatar living its day at a desk in Lagos. One command, fully
 * customisable via ApartmentConfig.
 *
 * Quick start (React):
 *   import { ApartmentScene } from '@avatar-gateway/starter-apartment/react';
 *   <ApartmentScene config={{ avatar: { name: 'My Bot' } }} />
 *
 * Quick start (plain script tag):
 *   <script src="dist/apartment.iife.js"></script>
 *   AvatarApartment.mount('#my-div', { avatar: { name: 'My Bot' } });
 *
 * Assets: original brick-art SVG created for avatar-gateway, Apache-2.0.
 * "LEGO" is a trademark of the LEGO Group, which does not sponsor or endorse
 * this project. The avatar art is original and brick-inspired.
 */

import { resolveConfig, buildSceneSvg } from "./scene.js";
import type { ApartmentConfig } from "./types.js";

export { resolveConfig, buildSceneSvg, currentActivity, dayPeriod, localHour, activityCssClass } from "./scene.js";
export {
  DEFAULT_AVATAR_LOOK,
  DEFAULT_ROOM_THEME,
  DEFAULT_FURNITURE,
  DEFAULT_DAY_CYCLE,
  DEFAULT_ACTIVITIES,
} from "./types.js";
export type {
  ApartmentConfig,
  ResolvedApartmentConfig,
  AvatarLook,
  AvatarAccessory,
  AvatarActivity,
  RoomTheme,
  FurnitureConfig,
  DayCycleConfig,
  DayActivity,
  DayPeriod,
  GatewayMount,
} from "./types.js";

/**
 * Plain-DOM mount function (no React required).
 * Renders the SVG scene into `selector`, updates every minute, and
 * optionally calls Avatar.mount via the gateway config.
 *
 * Returns a cleanup function that stops the update interval.
 */
export function mount(
  selector: string,
  config: ApartmentConfig = {},
): () => void {
  if (typeof document === "undefined") {
    throw new Error("mount() requires a DOM environment");
  }
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`ApartmentScene: no element found for "${selector}"`);
  const container: HTMLElement = el;

  const resolved = resolveConfig(config);

  function render(now = new Date()): void {
    const { svg, activity, period } = buildSceneSvg(resolved, now);
    container.setAttribute("data-period", period);
    container.setAttribute("data-activity", activity.activity);
    container.innerHTML = `${svg}<p class="ag-apartment__caption">${activity.caption}<span class="ag-apartment__time"> · ${resolved.dayCycle.timezone}</span></p>`;
  }

  render();

  let intervalId: ReturnType<typeof setInterval> | undefined;
  if (resolved.dayCycle.enabled) {
    intervalId = setInterval(() => render(), 60_000);
  }

  if (resolved.gateway) {
    const { selector: avatarSelector, backendUrl } = resolved.gateway;
    requestAnimationFrame(() => {
      // @ts-expect-error — Avatar is loaded from the host page
      if (typeof Avatar !== "undefined") Avatar.mount(avatarSelector, { backend: backendUrl });
    });
  }

  return () => { if (intervalId !== undefined) clearInterval(intervalId); };
}
