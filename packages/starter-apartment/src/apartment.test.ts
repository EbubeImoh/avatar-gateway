import { describe, it, expect, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { mount } from "./index.js";
import {
  resolveConfig,
  buildSceneSvg,
  dayPeriod,
  localHour,
  activityCssClass,
} from "./scene.js";
import {
  DEFAULT_AVATAR_LOOK,
  DEFAULT_ROOM_THEME,
  DEFAULT_FURNITURE,
  DEFAULT_LAYOUT,
} from "./types.js";
import type { HomeActivity } from "./types.js";
import type { ApartmentRenderState } from "./index.js";

// ── resolveConfig ──────────────────────────────────────────────────────────

describe("resolveConfig", () => {
  it("fills every field with defaults when config is empty", () => {
    const cfg = resolveConfig({});
    expect(cfg.avatar).toMatchObject(DEFAULT_AVATAR_LOOK);
    expect(cfg.room).toMatchObject(DEFAULT_ROOM_THEME);
    expect(cfg.furniture).toMatchObject(DEFAULT_FURNITURE);
    expect(cfg.layout.rooms.map(({ id }) => id)).toEqual(DEFAULT_LAYOUT.rooms.map(({ id }) => id));
    expect(cfg.timeZone).toBe("Africa/Lagos");
  });

  it("names the home from config, defaulting to the Starter Apartment", () => {
    expect(resolveConfig({}).name).toBe("Starter Apartment");
    expect(resolveConfig({ name: "  Ada's Loft " }).name).toBe("Ada's Loft");
    expect(() => resolveConfig({ name: "" })).toThrow("name must contain");
    expect(() => resolveConfig({ name: "x".repeat(61) })).toThrow("name must contain");
  });

  it("merges partial avatar overrides without touching other fields", () => {
    const cfg = resolveConfig({ avatar: { name: "Test Bot", outfitColor: "#ff0000" } });
    expect(cfg.avatar.name).toBe("Test Bot");
    expect(cfg.avatar.outfitColor).toBe("#ff0000");
    expect(cfg.avatar.skinTone).toBe(DEFAULT_AVATAR_LOOK.skinTone);
  });

  it("validates the timezone independently from agent activity", () => {
    expect(resolveConfig({ timeZone: "Europe/London" }).timeZone).toBe("Europe/London");
    expect(() => resolveConfig({ timeZone: "Not/AZone" })).toThrow("timeZone must be a valid IANA timezone");
  });

  it("preserves gateway config", () => {
    const cfg = resolveConfig({ gateway: { selector: "#av", backendUrl: "/api" } });
    expect(cfg.gateway?.selector).toBe("#av");
    expect(cfg.gateway?.backendUrl).toBe("/api");
  });

  it("escapes live status before it enters SVG attributes", () => {
    const svg = buildSceneSvg(resolveConfig({}), new Date(), "studio", {
      activity: "working", caption: '<safe> "caption"', room: "studio",
    }).svg;
    expect(svg).toContain("&lt;safe&gt; &quot;caption&quot;");
    expect(svg).not.toContain('<safe> "caption"');
  });

  it("rejects unsafe lighting, invalid room references, and unsupported furniture", () => {
    expect(() => resolveConfig({ lighting: { ambientNightColor: "url(javascript:alert(1))" } })).toThrow("six-digit hex");
    expect(() => resolveConfig({ props: [{ id: "lamp", room: "studio", kind: "floorLamp", label: "Lamp", x: 50, y: 50 }] })).not.toThrow();
    expect(() => resolveConfig({ props: [{ id: "lamp", room: "bathroom", kind: "floorLamp", label: "Lamp", x: 50, y: 50 }], layout: { rooms: [DEFAULT_LAYOUT.rooms[0]!], startRoom: "studio" } })).toThrow("not in the layout");
    expect(() => resolveConfig({ layout: { rooms: [{ id: "studio", name: "Studio", furniture: ["script" as never] }], startRoom: "studio" } })).toThrow("unsupported item");
  });
});

// ── dayPeriod ──────────────────────────────────────────────────────────────

describe("dayPeriod", () => {
  const tz = "UTC"; // makes hour math trivial
  const at = (h: number) => { const d = new Date("2026-01-01T00:00:00Z"); d.setUTCHours(h); return d; };

  it.each([
    [0, "night"],
    [5, "dawn"],
    [6, "dawn"],
    [7, "morning"],
    [11, "morning"],
    [12, "noon"],
    [13, "noon"],
    [14, "afternoon"],
    [17, "afternoon"],
    [18, "evening"],
    [20, "evening"],
    [21, "night"],
    [23, "night"],
  ] as const)("hour %i → %s", (h, expected) => {
    expect(dayPeriod(tz, at(h))).toBe(expected);
  });
});

// ── localHour ──────────────────────────────────────────────────────────────

describe("localHour", () => {
  it("returns a number 0–23", () => {
    const h = localHour("Africa/Lagos");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(24);
  });

  it("falls back to local getHours() for invalid timezone", () => {
    const d = new Date("2026-01-01T10:00:00Z");
    const h = localHour("Invalid/Zone", d);
    // Falls back to d.getHours() which is system-local — just check it's in range.
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(24);
  });
});

// ── buildSceneSvg ──────────────────────────────────────────────────────────

describe("buildSceneSvg", () => {
  const cfg = resolveConfig({});

  it("returns valid SVG string", () => {
    const { svg } = buildSceneSvg(cfg);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("viewBox");
  });

  it("embeds avatar look colors from config", () => {
    const custom = resolveConfig({ avatar: { outfitColor: "#abcdef" } });
    const { svg } = buildSceneSvg(custom, new Date(), "studio", { activity: "working", caption: "Building", room: "studio" });
    expect(svg).toContain("#abcdef");
  });

  it("returns a dayPeriod string", () => {
    const { period } = buildSceneSvg(cfg);
    expect(["dawn", "morning", "noon", "afternoon", "evening", "night"]).toContain(period);
  });

  it("does not invent an activity when no autonomous source is connected", () => {
    const { activity, svg } = buildSceneSvg(cfg);
    expect(activity.caption).toBe("The room is ready for your agent");
    expect(svg).not.toContain('class="ag-apartment__avatar"');
  });

  it("renders the single current activity supplied by the life engine", () => {
    const current: HomeActivity = { activity: "working", caption: "Building from the desk", room: "studio" };
    const { activity, svg } = buildSceneSvg(cfg, new Date(), "studio", current);
    expect(activity).toEqual(current);
    expect(svg).toContain("Building from the desk");
  });

  it("includes desk SVG when desk furniture is enabled", () => {
    const withDesk = resolveConfig({ furniture: { desk: true } });
    const { svg } = buildSceneSvg(withDesk, new Date("2026-01-01T12:00:00Z"), "studio");
    expect(svg).toContain("Desk");
  });

  it("excludes desk SVG when desk furniture is disabled", () => {
    const noDesk = resolveConfig({ furniture: { desk: false } });
    const { svg } = buildSceneSvg(noDesk, new Date("2026-01-01T12:00:00Z"), "studio");
    expect(svg).not.toContain("Desk");
  });

  it("renders each selected room with its props and layout colors", () => {
    const custom = resolveConfig({
      layout: {
        startRoom: "living",
        rooms: [{ id: "living", name: "My living room", furniture: ["sofa"], wallColor: "#abcdef" }],
      },
      props: [{ id: "my-plant", room: "living", kind: "plant", label: "A <safe> plant", x: 40, y: 65, color: "#123456" }],
    });
    const result = buildSceneSvg(custom, new Date("2026-01-01T12:00:00Z"), "living");
    expect(result.room.name).toBe("My living room");
    expect(result.svg).toContain("#abcdef");
    expect(result.svg).toContain("data-furniture=\"sofa\"");
    expect(result.svg).toContain("A &lt;safe&gt; plant");
    expect(result.svg).not.toContain("A <safe> plant");
  });

  it("does not render a room that is absent from the validated layout", () => {
    const custom = resolveConfig({ layout: { startRoom: "studio", rooms: [DEFAULT_LAYOUT.rooms[0]!] } });
    expect(() => buildSceneSvg(custom, new Date("2026-01-01T12:00:00Z"), "garage")).toThrow("not in the apartment layout");
  });

  it("keeps the avatar's position transform off the animated group", () => {
    // The stylesheet sets transform-origin on .ag-apartment__avatar for its bob animation; in SVG that
    // also re-bases a transform attribute on the same element and pushed the sleeping avatar off-screen.
    const sleeping = { activity: "sleeping" as const, caption: "Asleep", room: "bedroom" as const };
    const { svg } = buildSceneSvg(resolveConfig({ timeZone: "UTC" }), new Date("2026-01-01T02:00:00Z"), "bedroom", sleeping);
    const dom = new JSDOM(`<!doctype html><body>${svg}</body>`);
    const animated = dom.window.document.querySelector(".ag-apartment__avatar")!;
    expect(animated.hasAttribute("transform")).toBe(false);
    expect(animated.parentElement?.getAttribute("transform")).toContain("rotate(-78 80 104)");
    dom.window.close();
  });

  it("includes night overlay at night", () => {
    const nightTime = new Date("2026-01-01T02:00:00Z"); // 2 AM UTC
    const { svg } = buildSceneSvg(cfg, nightTime);
    // night overlay rectangle has non-zero opacity
    expect(svg).toMatch(/opacity="0\.[1-9]/);
  });
});

// ── activityCssClass ───────────────────────────────────────────────────────

describe("activityCssClass", () => {
  it("returns ag-activity--working for working", () => {
    expect(activityCssClass("working")).toBe("ag-activity--working");
  });

  it("returns ag-activity--sleeping for sleeping", () => {
    expect(activityCssClass("sleeping")).toBe("ag-activity--sleeping");
  });
});

// ── default configuration ──────────────────────────────────────────────────

describe("defaults", () => {
  it("mounts an accessible multi-room plain-DOM apartment and cleans it up", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body><div id=home><p>Replace me</p></div></body></html>");
    const host = dom.window.document.querySelector<HTMLElement>("#home")!;
    const apartment = mount(host);
    expect(host.querySelectorAll(".ag-apartment__room")).toHaveLength(7);
    expect(host.querySelector(".ag-apartment__stage svg")?.getAttribute("aria-label")).toContain("Studio");
    const bedroom = [...host.querySelectorAll<HTMLButtonElement>(".ag-apartment__room")].find((button) => button.textContent === "Bedroom")!;
    bedroom.click();
    expect(bedroom.getAttribute("aria-pressed")).toBe("true");
    expect(host.querySelector(".ag-apartment__stage svg")?.getAttribute("aria-label")).toContain("Bedroom");
    expect(dom.window.document.querySelector("style[data-shubur-apartment-styles]")).not.toBeNull();
    apartment.destroy();
    expect(host.childElementCount).toBe(0);
    dom.window.close();
  });

  it("shows one current life activity and never renders a day timeline", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body><div id=home></div></body></html>");
    const host = dom.window.document.querySelector<HTMLElement>("#home")!;
    const source = {
      getCurrentActivity: () => ({ activity: "working" as const, caption: "A needs-driven studio session", room: "studio" as const }),
    };
    const apartment = mount(host, { timeZone: "UTC" }, source);
    expect(host.querySelector(".ag-apartment")?.getAttribute("data-activity")).toBe("working");
    expect(host.querySelector(".ag-apartment__stage svg")?.getAttribute("aria-label")).toContain("A needs-driven studio session");
    expect(host.querySelector(".ag-apartment__day, .ag-apartment__time, .ag-apartment__now")).toBeNull();
    apartment.destroy();
    dom.window.close();
  });

});

// ── mount options ──────────────────────────────────────────────────────────

describe("mount options", () => {
  afterEach(() => { vi.useRealTimers(); });

  const setup = () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body><div id=home></div></body></html>");
    return { dom, host: dom.window.document.querySelector<HTMLElement>("#home")! };
  };

  it("refreshes the single current activity from an injected life engine", () => {
    vi.useFakeTimers();
    const { dom, host } = setup();
    let now = new Date("2026-03-02T03:00:00Z");
    let current: HomeActivity = { activity: "sleeping", caption: "Resting in the bedroom", room: "bedroom" };
    const renders: ApartmentRenderState[] = [];
    const apartment = mount(host, { timeZone: "UTC" }, { getCurrentActivity: () => current }, {
      clock: () => now,
      refreshMs: 1_000,
      followAvatar: true,
      onRender: (state) => renders.push(state),
    });
    expect(renders.at(-1)).toMatchObject({ room: "bedroom", activityRoom: "bedroom", period: "night" });
    expect(renders.at(-1)?.activity.activity).toBe("sleeping");
    expect(host.querySelector(".ag-apartment__caption")?.textContent).toContain("Resting in the bedroom");

    now = new Date("2026-03-02T07:30:00Z");
    current = { activity: "working", caption: "Working at the desk", room: "studio" };
    vi.advanceTimersByTime(999);
    expect(renders).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(renders).toHaveLength(2);
    expect(renders.at(-1)).toMatchObject({ room: "studio", activityRoom: "studio", period: "morning" });
    expect(host.querySelector(".ag-apartment")?.getAttribute("data-room")).toBe("studio");
    expect(host.querySelector(".ag-apartment__caption")?.textContent).toContain("Working at the desk");

    apartment.destroy();
    vi.advanceTimersByTime(5_000);
    expect(renders).toHaveLength(2);
    dom.window.close();
  });

  it("follows the current activity's room until a visitor picks a room", () => {
    vi.useFakeTimers();
    const { dom, host } = setup();
    let now = new Date("2026-03-02T08:00:00Z");
    let current: HomeActivity = { activity: "coffee", caption: "Making coffee", room: "kitchen" };
    const apartment = mount(host, { timeZone: "UTC" }, { getCurrentActivity: () => current }, { clock: () => now, refreshMs: 1_000, followAvatar: true });
    const pressed = () => host.querySelector('.ag-apartment__room[aria-pressed="true"]')?.textContent;
    expect(pressed()).toBe("Kitchen");

    now = new Date("2026-03-02T10:00:00Z");
    current = { activity: "working", caption: "Building at the desk", room: "studio" };
    vi.advanceTimersByTime(1_000);
    expect(pressed()).toBe("Studio");

    const gym = [...host.querySelectorAll<HTMLButtonElement>(".ag-apartment__room")].find((button) => button.textContent === "Gym")!;
    gym.click();
    now = new Date("2026-03-02T23:00:00Z");
    current = { activity: "sleeping", caption: "Resting in bed", room: "bedroom" };
    vi.advanceTimersByTime(1_000);
    expect(pressed()).toBe("Gym");
    expect(host.querySelector(".ag-apartment__caption span")?.textContent).toBe("A quiet gym");
    apartment.destroy();
    dom.window.close();
  });

  it("keeps the visitor's selected room while reporting the current activity", () => {
    const { dom, host } = setup();
    const current: HomeActivity = { activity: "sleeping", caption: "Resting in the bedroom", room: "bedroom" };
    const apartment = mount(host, { timeZone: "UTC" }, { getCurrentActivity: () => current }, { clock: () => new Date("2026-03-02T03:00:00Z") });
    expect(host.querySelector(".ag-apartment")?.getAttribute("data-room")).toBe("studio");
    expect(host.querySelector(".ag-apartment__caption span")?.textContent).toBe("A quiet studio");
    apartment.destroy();
    dom.window.close();
  });

  it("only replaces the scene artwork when the scene changes", () => {
    vi.useFakeTimers();
    const { dom, host } = setup();
    let now = new Date("2026-03-02T10:00:00Z");
    const apartment = mount(host, { timeZone: "UTC" }, { getCurrentActivity: () => ({ activity: "working", caption: "Working", room: "studio" }) }, { clock: () => now, refreshMs: 1_000, followAvatar: true });
    const first = host.querySelector(".ag-apartment__stage svg");
    now = new Date("2026-03-02T10:20:00Z");
    vi.advanceTimersByTime(1_000);
    expect(host.querySelector(".ag-apartment__stage svg")).toBe(first);
    now = new Date("2026-03-02T20:00:00Z");
    vi.advanceTimersByTime(1_000);
    expect(host.querySelector(".ag-apartment__stage svg")).not.toBe(first);
    apartment.destroy();
    dom.window.close();
  });

  it("never renders schedule bars, clock labels, or hour ranges", () => {
    const { dom, host } = setup();
    const apartment = mount(host, { timeZone: "Asia/Kolkata" });
    expect(host.querySelector(".ag-apartment__day, .ag-apartment__time, .ag-apartment__now")).toBeNull();
    expect(host.textContent).not.toMatch(/\b\d{1,2}\s*(?:AM|PM)\s*[–-]\s*\d{1,2}\s*(?:AM|PM)\b/i);
    apartment.destroy();
    dom.window.close();
  });

  it("rejects unsafe refresh intervals and non-function hooks", () => {
    const { dom, host } = setup();
    expect(() => mount(host, {}, undefined, { refreshMs: 10 })).toThrow("refreshMs");
    expect(() => mount(host, {}, undefined, { refreshMs: Number.NaN })).toThrow("refreshMs");
    expect(() => mount(host, {}, undefined, { clock: "now" as never })).toThrow("clock");
    expect(() => mount(host, {}, undefined, { onRender: {} as never })).toThrow("onRender");
    dom.window.close();
  });
});
