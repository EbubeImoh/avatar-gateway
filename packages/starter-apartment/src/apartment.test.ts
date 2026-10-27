import { describe, it, expect, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { mount } from "./index.js";
import {
  resolveConfig,
  buildSceneSvg,
  currentActivity,
  dayPeriod,
  localHour,
  activityCssClass,
} from "./scene.js";
import {
  DEFAULT_ACTIVITIES,
  DEFAULT_AVATAR_LOOK,
  DEFAULT_ROOM_THEME,
  DEFAULT_FURNITURE,
  DEFAULT_DAY_CYCLE,
  DEFAULT_LAYOUT,
} from "./types.js";
import type { ApartmentConfig, DayActivity } from "./types.js";
import type { ApartmentRenderState } from "./index.js";

// ── resolveConfig ──────────────────────────────────────────────────────────

describe("resolveConfig", () => {
  it("fills every field with defaults when config is empty", () => {
    const cfg = resolveConfig({});
    expect(cfg.avatar).toMatchObject(DEFAULT_AVATAR_LOOK);
    expect(cfg.room).toMatchObject(DEFAULT_ROOM_THEME);
    expect(cfg.furniture).toMatchObject(DEFAULT_FURNITURE);
    expect(cfg.layout.rooms.map(({ id }) => id)).toEqual(DEFAULT_LAYOUT.rooms.map(({ id }) => id));
    expect(cfg.dayCycle.timezone).toBe("Africa/Lagos");
    expect(cfg.dayCycle.activities.length).toBeGreaterThan(0);
  });

  it("merges partial avatar overrides without touching other fields", () => {
    const cfg = resolveConfig({ avatar: { name: "Test Bot", outfitColor: "#ff0000" } });
    expect(cfg.avatar.name).toBe("Test Bot");
    expect(cfg.avatar.outfitColor).toBe("#ff0000");
    expect(cfg.avatar.skinTone).toBe(DEFAULT_AVATAR_LOOK.skinTone);
  });

  it("replaces dayCycle.activities when provided", () => {
    const activities = [{ startHour: 0, endHour: 24, activity: "working" as const, caption: "Always working" }];
    const cfg = resolveConfig({ dayCycle: { activities } });
    expect(cfg.dayCycle.activities).toHaveLength(1);
    expect(cfg.dayCycle.activities[0].activity).toBe("working");
  });

  it("preserves gateway config", () => {
    const cfg = resolveConfig({ gateway: { selector: "#av", backendUrl: "/api" } });
    expect(cfg.gateway?.selector).toBe("#av");
    expect(cfg.gateway?.backendUrl).toBe("/api");
  });

  it("rejects an unsupported activity before it can enter SVG attributes", () => {
    const unsafe = {
      dayCycle: {
        activities: [{ startHour: 0, endHour: 24, activity: 'idle" onload="alert(1)' as never, caption: "Safe" }],
      },
    } satisfies ApartmentConfig;
    expect(() => resolveConfig(unsafe)).toThrow("activity is not supported");
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

// ── currentActivity ────────────────────────────────────────────────────────

describe("currentActivity", () => {
  const at = (h: number) => { const d = new Date("2026-01-01T00:00:00Z"); d.setUTCHours(h); return d; };

  it("returns correct activity for 9 AM UTC (working hours in defaults)", () => {
    const act = currentActivity(DEFAULT_ACTIVITIES, "UTC", at(9));
    expect(act.activity).toBe("working");
  });

  it("returns sleeping for 3 AM UTC", () => {
    const act = currentActivity(DEFAULT_ACTIVITIES, "UTC", at(3));
    expect(act.activity).toBe("sleeping");
  });

  it("falls back to first activity when no range matches", () => {
    const act = currentActivity(
      [{ startHour: 5, endHour: 6, activity: "coffee", caption: "Coffee" }],
      "UTC",
      at(10),
    );
    expect(act.activity).toBe("coffee");
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
    const { svg } = buildSceneSvg(custom);
    expect(svg).toContain("#abcdef");
  });

  it("returns a dayPeriod string", () => {
    const { period } = buildSceneSvg(cfg);
    expect(["dawn", "morning", "noon", "afternoon", "evening", "night"]).toContain(period);
  });

  it("returns the matched activity", () => {
    const at8am = new Date("2026-01-01T08:00:00Z");
    const { activity } = buildSceneSvg(cfg, at8am);
    expect(["coffee", "working", "waking", "idle", "sleeping"]).toContain(activity.activity);
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
    const sleeping = { startHour: 0, endHour: 24, activity: "sleeping" as const, caption: "Asleep", room: "bedroom" as const };
    const { svg } = buildSceneSvg(resolveConfig({ dayCycle: { timezone: "UTC" } }), new Date("2026-01-01T02:00:00Z"), "bedroom", sleeping);
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

// ── default constants ──────────────────────────────────────────────────────

describe("defaults", () => {
  it("DEFAULT_ACTIVITIES covers full 24h day", () => {
    let covered = 0;
    for (const a of DEFAULT_ACTIVITIES) {
      covered += a.endHour - a.startHour;
    }
    expect(covered).toBe(24);
  });

  it("DEFAULT_DAY_CYCLE timezone is Africa/Lagos", () => {
    expect(DEFAULT_DAY_CYCLE.timezone).toBe("Africa/Lagos");
  });

  it("mounts an accessible multi-room plain-DOM apartment and cleans it up", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body><div id=home><p>Replace me</p></div></body></html>");
    const host = dom.window.document.querySelector<HTMLElement>("#home")!;
    const apartment = mount(host, { dayCycle: { enabled: false } });
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

  it("uses a validated life activity source to drive the current apartment scene", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body><div id=home></div></body></html>");
    const host = dom.window.document.querySelector<HTMLElement>("#home")!;
    const source = {
      getDayActivities: () => [{ startHour: 0, endHour: 24, activity: "working" as const, caption: "A needs-driven studio session", room: "studio" as const }],
    };
    const apartment = mount(host, { dayCycle: { timezone: "UTC" } }, source);
    expect(host.querySelector(".ag-apartment")?.getAttribute("data-activity")).toBe("working");
    expect(host.querySelector(".ag-apartment__stage svg")?.getAttribute("aria-label")).toContain("A needs-driven studio session");
    expect(host.querySelectorAll(".ag-apartment__day span")).toHaveLength(1);
    apartment.destroy();
    dom.window.close();
  });

  it("rejects an invalid activity source before accepting it as a day cycle", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body><div id=home></div></body></html>");
    const host = dom.window.document.querySelector<HTMLElement>("#home")!;
    const source = {
      getDayActivities: () => [{ startHour: 0, endHour: 23, activity: "working" as const, caption: "Incomplete day", room: "studio" as const }],
    };
    expect(() => mount(host, {}, source)).toThrow("cover the entire 24-hour day");
    dom.window.close();
  });
});

// ── mount options ──────────────────────────────────────────────────────────

describe("mount options", () => {
  afterEach(() => { vi.useRealTimers(); });

  const routine: DayActivity[] = [
    { startHour: 0, endHour: 7, activity: "sleeping", caption: "Sound asleep", room: "bedroom" },
    { startHour: 7, endHour: 9, activity: "coffee", caption: "Making a cup of coffee", room: "kitchen" },
    { startHour: 9, endHour: 24, activity: "working", caption: "A focused work session", room: "studio" },
  ];
  const setup = () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body><div id=home></div></body></html>");
    return { dom, host: dom.window.document.querySelector<HTMLElement>("#home")! };
  };

  it("renders from an injected clock and refresh interval instead of the system clock", () => {
    vi.useFakeTimers();
    const { dom, host } = setup();
    let now = new Date("2026-03-02T03:00:00Z");
    const renders: ApartmentRenderState[] = [];
    const apartment = mount(host, { dayCycle: { timezone: "UTC", activities: routine } }, undefined, {
      clock: () => now,
      refreshMs: 1_000,
      followAvatar: true,
      onRender: (state) => renders.push(state),
    });
    expect(renders.at(-1)).toMatchObject({ room: "bedroom", activityRoom: "bedroom", period: "night" });
    expect(renders.at(-1)?.activity.activity).toBe("sleeping");
    expect(host.querySelector(".ag-apartment__time")?.getAttribute("datetime")).toBe("2026-03-02T03:00:00.000Z");

    now = new Date("2026-03-02T07:30:00Z");
    vi.advanceTimersByTime(999);
    expect(renders).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(renders).toHaveLength(2);
    expect(renders.at(-1)).toMatchObject({ room: "kitchen", activityRoom: "kitchen", period: "morning" });
    expect(host.querySelector(".ag-apartment")?.getAttribute("data-room")).toBe("kitchen");
    expect(host.querySelector(".ag-apartment__stage svg")?.getAttribute("aria-label")).toContain("Kitchen");

    apartment.destroy();
    vi.advanceTimersByTime(5_000);
    expect(renders).toHaveLength(2);
    dom.window.close();
  });

  it("follows the avatar between rooms until a visitor picks a room", () => {
    vi.useFakeTimers();
    const { dom, host } = setup();
    let now = new Date("2026-03-02T08:00:00Z");
    const apartment = mount(host, { dayCycle: { timezone: "UTC", activities: routine } }, undefined, { clock: () => now, refreshMs: 1_000, followAvatar: true });
    const pressed = () => host.querySelector('.ag-apartment__room[aria-pressed="true"]')?.textContent;
    expect(pressed()).toBe("Kitchen");

    now = new Date("2026-03-02T10:00:00Z");
    vi.advanceTimersByTime(1_000);
    expect(pressed()).toBe("Studio");

    const gym = [...host.querySelectorAll<HTMLButtonElement>(".ag-apartment__room")].find((button) => button.textContent === "Gym")!;
    gym.click();
    now = new Date("2026-03-02T23:00:00Z");
    vi.advanceTimersByTime(1_000);
    expect(pressed()).toBe("Gym");
    expect(host.querySelector(".ag-apartment__caption span")?.textContent).toBe("A quiet gym");
    apartment.destroy();
    dom.window.close();
  });

  it("keeps the default studio view when not following the avatar", () => {
    const { dom, host } = setup();
    const apartment = mount(host, { dayCycle: { timezone: "UTC", activities: routine } }, undefined, { clock: () => new Date("2026-03-02T03:00:00Z") });
    expect(host.querySelector(".ag-apartment")?.getAttribute("data-room")).toBe("studio");
    expect(host.querySelector(".ag-apartment__caption span")?.textContent).toBe("A quiet studio");
    apartment.destroy();
    dom.window.close();
  });

  it("only replaces the scene artwork when the scene changes", () => {
    vi.useFakeTimers();
    const { dom, host } = setup();
    let now = new Date("2026-03-02T10:00:00Z");
    const apartment = mount(host, { dayCycle: { timezone: "UTC", activities: routine } }, undefined, { clock: () => now, refreshMs: 1_000, followAvatar: true });
    const first = host.querySelector(".ag-apartment__stage svg");
    now = new Date("2026-03-02T10:20:00Z");
    vi.advanceTimersByTime(1_000);
    expect(host.querySelector(".ag-apartment__stage svg")).toBe(first);
    expect(host.querySelector(".ag-apartment__time")?.getAttribute("datetime")).toBe("2026-03-02T10:20:00.000Z");
    now = new Date("2026-03-02T20:00:00Z");
    vi.advanceTimersByTime(1_000);
    expect(host.querySelector(".ag-apartment__stage svg")).not.toBe(first);
    apartment.destroy();
    dom.window.close();
  });

  it("marks the current local time on the day bar", () => {
    const { dom, host } = setup();
    const apartment = mount(host, { dayCycle: { timezone: "Asia/Kolkata", activities: routine } }, undefined, { clock: () => new Date("2026-03-02T00:00:00Z") });
    // 00:00 UTC is 05:30 in Kolkata: 330 of 1440 minutes.
    expect((host.querySelector(".ag-apartment__now") as HTMLElement).style.left).toBe("22.917%");
    expect(host.querySelectorAll(".ag-apartment__day span")).toHaveLength(3);
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
