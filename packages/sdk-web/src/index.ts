/**
 * @avatar-gateway/sdk-web — placeholder entry point.
 * See SPEC.md §5.2. Private keys never reach the browser.
 */

/** Capabilities exposed to a visiting avatar's sandboxed iframe. Nothing else exists. */
export interface VisitorCapabilities {
  chatSend(text: string): Promise<void>;
  onChatMessage(handler: (msg: { from: string; text: string }) => void): () => void;
  presenceAnnounce(state: "arrived" | "idle" | "leaving"): Promise<void>;
  readPublicPage(path: string): Promise<{ title: string; text: string }>;
}

export interface AvatarLook {
  style: "brick-minifig";
  head: string;
  torso: string;
  legs: string;
  accessory?: string;
}

export const ELEMENT_NAME = "avatar-host";

/** Registers the <avatar-host> custom element (browser only). */
export function defineAvatarHost(): void {
  if (typeof customElements === "undefined" || customElements.get(ELEMENT_NAME)) return;
  customElements.define(
    ELEMENT_NAME,
    class extends HTMLElement {
      connectedCallback() {
        const root = this.attachShadow({ mode: "closed" });
        root.textContent = "🧱 avatar coming soon";
      }
    },
  );
}
