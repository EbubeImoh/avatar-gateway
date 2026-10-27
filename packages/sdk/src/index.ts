/**
 * @avatar-gateway/sdk — placeholder one-import core SDK. See SPEC.md §5.7–5.8.
 *
 *   import { Avatar } from '@avatar-gateway/sdk';
 *   Avatar.mount('#avatar', { backend: '/avatar-gateway' });
 */

export type PresenceState = "home" | "idle" | "busy" | "travelling" | "asleep";

export interface AvatarOptions {
  /** Same-origin path of the site's avatar backend (holds keys; never the browser). */
  backend: string;
  look?: "brick-minifig";
  /** Community plugins (UI or behaviour), each with its own manifest & permissions. */
  plugins?: Array<{ manifest: { name: string } }>;
}

export const Avatar = {
  mount(selector: string, options: AvatarOptions): { state: PresenceState } {
    if (typeof document !== "undefined") {
      const el = document.querySelector(selector);
      if (el) el.textContent = `🧱 avatar (backend: ${options.backend}) — coming soon`;
    }
    return { state: "home" };
  },
};
