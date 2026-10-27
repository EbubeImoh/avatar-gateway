import { describe, it, expect } from "vitest";
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
import type { ApartmentConfig } from "./types.js";

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
});
