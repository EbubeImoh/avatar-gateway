/** One-import browser widget for adding an original brick-style avatar to a site. */

export type PresenceState = "home" | "idle" | "busy" | "travelling" | "asleep";

export interface AvatarOptions {
  /** Same-origin backend path. Private keys and provider API keys stay on that backend. */
  backend: string;
  look?: "brick-minifig";
  name?: string;
  initialState?: PresenceState;
}

export interface MountedAvatar {
  readonly element: HTMLElement;
  readonly state: PresenceState;
  setState(state: PresenceState): void;
  destroy(): void;
}

const WIDGET_STYLES = `
  :host { all: initial; font-family: ui-rounded, "Avenir Next", system-ui, sans-serif; color: #172320; }
  * { box-sizing: border-box; }
  .card { display: flex; align-items: center; gap: 11px; width: max-content; max-width: 100%; padding: 10px 13px 10px 10px; border: 2px solid #172320; border-radius: 17px; background: #fffef9; box-shadow: 4px 4px 0 #172320; }
  .toggle { display: grid; place-items: center; width: 57px; height: 57px; padding: 0; border: 1.5px solid #172320; border-radius: 15px; background: #c9f36a; cursor: pointer; }
  .toggle:focus-visible { outline: 3px solid #315bff; outline-offset: 3px; }
  .figure { position: relative; width: 30px; height: 45px; }
  .head { position: absolute; top: 0; left: 6px; width: 19px; height: 19px; border: 2px solid #172320; border-radius: 7px 7px 6px 6px; background: #ffd466; }
  .head::before { content: ""; position: absolute; top: -6px; left: 4px; width: 7px; height: 5px; border: 2px solid #172320; border-bottom: 0; border-radius: 5px 5px 0 0; }
  .head::after { content: "•  •"; position: absolute; top: 4px; left: 3px; font: 7px/1 system-ui; white-space: pre; }
  .torso { position: absolute; top: 20px; left: 2px; width: 28px; height: 17px; border: 2px solid #172320; border-radius: 6px 6px 3px 3px; background: #315bff; }
  .legs { position: absolute; top: 35px; left: 5px; width: 22px; height: 10px; border: 2px solid #172320; border-radius: 2px 2px 5px 5px; background: #26342e; }
  .copy { min-width: 105px; }
  .name { display: block; margin: 0; font: 800 14px/1.25 ui-rounded, "Avenir Next", system-ui, sans-serif; }
  .status { display: inline-flex; align-items: center; gap: 6px; margin-top: 3px; color: #5d6a61; font: 600 11px/1.3 ui-rounded, "Avenir Next", system-ui, sans-serif; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #8cc442; }
  .message { display: none; max-width: 270px; margin: 10px 0 0; padding: 11px 13px; border: 1.5px solid #172320; border-radius: 13px 13px 13px 4px; background: #f0ecff; color: #172320; font: 500 13px/1.45 ui-rounded, "Avenir Next", system-ui, sans-serif; }
  .message[data-open="true"] { display: block; }
  .wrap { width: max-content; max-width: 100%; }
`;

const STATE_LABELS: Record<PresenceState, string> = {
  home: "at home",
  idle: "taking a little break",
  busy: "busy building",
  travelling: "out visiting",
  asleep: "resting",
};

export const Avatar = {
  mount(target: string | HTMLElement, options: AvatarOptions): MountedAvatar {
    if (typeof document === "undefined") throw new Error("Avatar.mount() requires a browser document.");
    if (!isSameOriginPath(options.backend)) throw new TypeError("backend must be a same-origin absolute path such as /avatar-gateway.");

    const host = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (!host) throw new Error(`Avatar.mount() could not find target: ${String(target)}`);

    const widget = document.createElement("div");
    widget.setAttribute("data-avatar-gateway-widget", "");
    widget.dataset.backend = options.backend;
    const shadow = widget.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>${WIDGET_STYLES}</style>
      <div class="wrap">
        <div class="card">
          <button class="toggle" type="button" aria-label="Talk with ${escapeForAttribute(options.name ?? "your avatar")}" aria-expanded="false">
            <span class="figure" aria-hidden="true"><span class="head"></span><span class="torso"></span><span class="legs"></span></span>
          </button>
          <div class="copy"><span class="name"></span><span class="status" aria-live="polite"><span class="dot" aria-hidden="true"></span><span class="state"></span></span></div>
        </div>
        <p class="message" role="status" data-open="false"></p>
      </div>`;

    const name = options.name ?? "your avatar";
    const nameNode = shadow.querySelector<HTMLElement>(".name");
    const stateNode = shadow.querySelector<HTMLElement>(".state");
    const messageNode = shadow.querySelector<HTMLElement>(".message");
    const toggle = shadow.querySelector<HTMLButtonElement>(".toggle");
    if (!nameNode || !stateNode || !messageNode || !toggle) throw new Error("Could not initialize avatar widget.");
    nameNode.textContent = name;
    messageNode.textContent = `Hi, I'm ${name}, an AI avatar. I'm here to talk about the public things on this site.`;

    let state = options.initialState ?? "home";
    const updateState = (nextState: PresenceState) => {
      state = nextState;
      stateNode.textContent = STATE_LABELS[nextState];
      widget.dataset.presence = nextState;
    };
    updateState(state);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(expanded));
      messageNode.dataset.open = String(expanded);
    });
    host.append(widget);

    return {
      element: widget,
      get state() { return state; },
      setState: updateState,
      destroy() { widget.remove(); },
    };
  },
};

function isSameOriginPath(path: string): boolean {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/^[a-z][a-z0-9+.-]*:/i.test(path);
}

function escapeForAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
