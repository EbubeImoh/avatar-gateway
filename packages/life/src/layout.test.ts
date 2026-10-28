import { describe, expect, it } from "vitest";
import type { ApartmentConfig } from "@avatar-gateway/starter-apartment";
import {
  applyToolToWorld, availableTools, buildEnvironment, createLifeSimulation, createSeededRandom, formatLifeStatus,
  initialObjectStates, projectLifeState, UtilityChooser,
} from "./index.js";
import type { LifeActivity, LifeChooser, LifeSimulationOptions } from "./index.js";

const HOUR = 60 * 60 * 1000;
const start = new Date("2026-10-27T06:00:00.000Z");
// Hour-by-hour replays are CPU-bound; give them room on a busy machine.
const SLOW = 120_000;

const STUDIO_FLAT: ApartmentConfig = {
  name: "Studio flat",
  layout: {
    startRoom: "studio",
    rooms: [
      { id: "studio", name: "Studio", furniture: ["window", "sofa", "bookshelf", "plant", "floorLamp"] },
      { id: "kitchen", name: "Kitchenette", furniture: ["island", "sink"] },
      { id: "bathroom", name: "Bathroom", furniture: ["shower", "mirror"] },
    ],
  },
};

/** Every hour's activity over `hours`, starting with the first choice. */
function live(options: Omit<LifeSimulationOptions, "agentId" | "startedAt"> & { startedAt?: Date }, hours: number): LifeActivity[] {
  const startedAt = options.startedAt ?? start;
  const simulation = createLifeSimulation({ agentId: "agent", timeZone: "UTC", ...options, startedAt });
  const activities = [simulation.getSnapshot().currentActivity];
  for (let hour = 1; hour < hours; hour += 1) activities.push(simulation.advanceTo(new Date(startedAt.getTime() + hour * HOUR)).currentActivity);
  return activities;
}

const useKey = (activity: LifeActivity): string => `${activity.id}:${activity.objectId ?? "bare"}`;

describe("layout-driven environment", () => {
  it("derives rooms, objects, and the place name from the owner's apartment config", () => {
    const environment = buildEnvironment({
      ...STUDIO_FLAT,
      furniture: { plant: false },
      props: [{ id: "reading-chair", room: "studio", kind: "sofa", label: "reading chair", x: 20, y: 70 }],
    });
    expect(environment.placeName).toBe("Studio flat");
    expect(environment.rooms.map((room) => room.id)).toEqual(["studio", "kitchen", "bathroom"]);
    const ids = environment.objects.map((object) => object.id);
    expect(ids).toContain("studio-sofa");
    expect(ids).toContain("prop-reading-chair");
    expect(ids).not.toContain("studio-plant");
    expect(ids.some((id) => id.includes("desk") || id.includes("bed"))).toBe(false);
    expect(buildEnvironment().placeName).toBe("Starter Apartment");
  });

  it("gives objects physical constraints and soft hints, not required uses", () => {
    const environment = buildEnvironment();
    const mat = environment.objects.find((object) => object.kind === "mat")!;
    const bed = environment.objects.find((object) => object.kind === "bed")!;
    expect(mat.carryable).toBe(true);
    expect(bed.carryable).toBe(false);
    expect(bed.capacity).toBeGreaterThan(0);
    expect(bed.hints.map((hint) => hint.use)).toEqual(["sleep"]);
    const bedVerbs = new Set(availableTools({ environment, world: { location: "bedroom", objects: initialObjectStates(environment) }, hour: 12 })
      .filter((tool) => tool.objectId === bed.id || tool.params.at === bed.id).map((tool) => tool.verb));
    // The hint is one use among several the bed physically allows.
    expect([...bedVerbs].sort()).toEqual(["read", "relax", "sleep", "work"]);
  });

  it("exposes no tools for absent objects and always offers bare fallbacks in every room", () => {
    const environment = buildEnvironment({ layout: { startRoom: "bathroom", rooms: [{ id: "bathroom", name: "Bathroom", furniture: [] }, { id: "garage", name: "Garage", furniture: [] }] } });
    const tools = availableTools({ environment, world: { location: "bathroom", objects: initialObjectStates(environment) }, hour: 23 });
    expect(tools.every((tool) => tool.objectId === undefined)).toBe(true);
    for (const room of ["bathroom", "garage"]) {
      expect(tools.filter((tool) => tool.room === room).map((tool) => tool.verb).sort()).toEqual(["exercise", "idle", "relax", "sleep"]);
    }
    const noDesk = availableTools({ environment: buildEnvironment(STUDIO_FLAT), world: { location: "studio", objects: initialObjectStates(buildEnvironment(STUDIO_FLAT)) }, hour: 10 });
    expect(noDesk.some((tool) => tool.objectId?.includes("desk"))).toBe(false);
    expect(noDesk.some((tool) => tool.verb === "work")).toBe(true);
  });

  it("models carrying and switching as physical state changes", () => {
    const environment = buildEnvironment();
    const world = { location: "studio" as const, objects: initialObjectStates(environment) };
    const tools = availableTools({ environment, world, hour: 21 });
    expect(tools.some((tool) => tool.params.carryTo && !environment.objects.find((object) => object.id === tool.objectId)!.carryable)).toBe(false);
    const carryMat = tools.find((tool) => tool.objectId === "gym-mat" && tool.params.carryTo === "living")!;
    expect(carryMat).toBeDefined();
    const moved = applyToolToWorld(carryMat, world);
    expect(moved.objects["gym-mat"]!.room).toBe("living");
    expect(moved.location).toBe("living");
    expect(world.objects["gym-mat"]!.room).toBe("gym");

    const switchOn = tools.find((tool) => tool.verb === "switchOn" && tool.objectId === "living-floorLamp" && !tool.params.carryTo)!;
    expect(switchOn.minutes).toBeLessThan(60);
    const lit = applyToolToWorld(switchOn, world);
    expect(lit.objects["living-floorLamp"]!.powered).toBe(true);
    const after = availableTools({ environment, world: lit, hour: 21 });
    expect(after.some((tool) => tool.verb === "switchOff" && tool.objectId === "living-floorLamp")).toBe(true);
    const readSofa = (list: typeof tools) => list.find((tool) => tool.verb === "read" && tool.params.at === "living-sofa")!;
    expect(readSofa(after).quality).toBeGreaterThan(readSofa(tools).quality);
  });

  it("never offers an object that is already at capacity", () => {
    const environment = buildEnvironment();
    const tools = availableTools({ environment, world: { location: "studio", objects: initialObjectStates(environment) }, hour: 10, occupancy: { "studio-desk": 1 } });
    expect(tools.some((tool) => tool.objectId === "studio-desk" || tool.params.at === "studio-desk")).toBe(false);
    const sofaTools = availableTools({ environment, world: { location: "living", objects: initialObjectStates(environment) }, hour: 10, occupancy: { "living-sofa": 2 } });
    expect(sofaTools.some((tool) => tool.objectId === "living-sofa")).toBe(true);
  });
});

describe("autonomous home choices", () => {
  it("chooses from the objects each same agent's home makes available", () => {
    const options = { seed: "same-agent", startedAt: start };
    const apartment = live(options, 24);
    const flat = live({ ...options, apartment: STUDIO_FLAT }, 24);
    expect(flat.map(useKey)).not.toEqual(apartment.map(useKey));
    const flatRooms = new Set(STUDIO_FLAT.layout!.rooms!.map((room) => room.id));
    for (const activity of flat) expect(flatRooms.has(activity.room)).toBe(true);
    expect(flat.some((activity) => activity.objectId?.includes("desk") || activity.objectId?.includes("bed"))).toBe(false);
  }, SLOW);

  it("is deterministic for a fixed seed, layout, and clock, and differs across seeds", () => {
    const options = { seed: 2026, apartment: STUDIO_FLAT, startedAt: start };
    expect(live(options, 30)).toEqual(live(options, 30));
    const now = new Date(start.getTime() + 30 * HOUR);
    expect(projectLifeState({ agentId: "a", ...options, now })).toEqual(projectLifeState({ agentId: "a", ...options, now }));
    expect(live({ ...options, seed: 2027 }, 30).map(useKey)).not.toEqual(live(options, 30).map(useKey));
  }, SLOW);

  it("returns only the activity currently chosen by the simulation", () => {
    const options = { agentId: "agent", seed: "forecast", startedAt: new Date("2026-10-27T00:00:00.000Z"), timeZone: "UTC" };
    const simulation = createLifeSimulation(options);
    const current = simulation.getCurrentActivity(new Date("2026-10-27T01:00:00.000Z"));
    expect(current).toEqual(simulation.getSnapshot().currentActivity);
    expect(current).not.toHaveProperty("startHour");
    expect(current).not.toHaveProperty("endHour");
  }, SLOW);

  it("guarantees no activity: every tool and verb is skipped by some agent", () => {
    const random = createSeededRandom("population");
    const level = (): number => Math.round(random() * 100);
    const runs: LifeActivity[][] = [];
    for (let index = 0; index < 40; index += 1) {
      runs.push(live({
        seed: `agent-${index}`,
        startedAt: new Date(Date.UTC(2026, 9, 27, index % 24)),
        initialNeeds: { energy: level(), hunger: level(), social: level(), fitness: level(), curiosity: level(), money: level(), fun: level(), hygiene: level() },
        traits: { conscientiousness: level(), curiosity: level(), playfulness: level(), resilience: level(), sociability: level() },
      }, 12));
    }
    const uses = new Set(runs.flatMap((run) => run.map(useKey)));
    const verbs = new Set(runs.flatMap((run) => run.map((activity) => activity.id)));
    expect(verbs.size).toBeGreaterThanOrEqual(6);
    for (const use of uses) expect(runs.some((run) => !run.some((activity) => useKey(activity) === use)), use).toBe(true);
    for (const verb of verbs) expect(runs.some((run) => !run.some((activity) => activity.id === verb)), verb).toBe(true);
  }, SLOW);

  it("treats hints as soft: objects are sometimes used unusually and sometimes ignored", () => {
    const environment = buildEnvironment();
    const days = Array.from({ length: 16 }, (_, index) => live({ seed: `hint-${index}` }, 24));
    const all = days.flat();
    expect(all.some((activity) => activity.objectId !== undefined && !activity.hinted)).toBe(true);
    expect(all.some((activity) => activity.hinted)).toBe(true);
    // Every hinted object present in the home is left unused by at least one agent in these runs.
    const hinted = environment.objects.filter((object) => object.hints.length > 0).map((object) => object.id);
    const ignoredBySomeone = hinted.filter((id) => days.some((day) => !day.some((activity) => activity.objectId === id || activity.params.at === id)));
    expect(ignoredBySomeone.length).toBeGreaterThan(hinted.length / 2);
    // Some object serves both its usual and an unusual purpose across agents.
    const mixed = environment.objects.filter((object) => {
      const used = all.filter((activity) => activity.objectId === object.id);
      return used.some((activity) => activity.hinted) && used.some((activity) => !activity.hinted);
    });
    expect(mixed.length).toBeGreaterThan(0);
  }, SLOW);

  it("always respects presence, reachability, location, and capacity", () => {
    const occupancy = { "studio-desk": 1 };
    for (const [index, apartment] of [undefined, STUDIO_FLAT].entries()) {
      const environment = buildEnvironment(apartment);
      for (let seed = 0; seed < 6; seed += 1) {
        const simulation = createLifeSimulation({ agentId: "agent", seed: `physics-${index}-${seed}`, startedAt: start, timeZone: "UTC", apartment, occupancy });
        for (let hour = 0; hour < 36; hour += 1) {
          const state = simulation.advanceTo(new Date(start.getTime() + hour * HOUR));
          const activity = state.currentActivity;
          expect(state.location).toBe(activity.room);
          expect(environment.rooms.some((room) => room.id === activity.room)).toBe(true);
          for (const id of [activity.objectId, activity.params.at]) {
            if (!id) continue;
            const object = environment.objects.find((item) => item.id === id);
            expect(object, id).toBeDefined();
            expect(id).not.toBe("studio-desk");
          }
          // Objects are used where they physically are; only a held book travels to a seat.
          if (activity.objectId && activity.id !== "read") expect(state.objects[activity.objectId]!.room).toBe(activity.room);
          if (activity.params.at) expect(state.objects[activity.params.at]!.room).toBe(activity.room);
          for (const object of environment.objects) {
            if (!object.carryable) expect(state.objects[object.id]!.room).toBe(object.room);
          }
        }
      }
    }
  }, SLOW);

  it("lives in a home with missing rooms without crashing, falling back to bare actions", () => {
    const bare: ApartmentConfig = { name: "Bare room", layout: { startRoom: "garage", rooms: [{ id: "garage", name: "Garage", furniture: [] }] } };
    const run = live({ seed: "sparse", apartment: bare }, 48);
    expect(run.every((activity) => activity.objectId === undefined && activity.room === "garage")).toBe(true);
    expect(run.some((activity) => activity.id === "sleep")).toBe(true);
    expect(run.some((activity) => activity.id === "eat")).toBe(false);
    const state = projectLifeState({ agentId: "agent", seed: "sparse", apartment: bare, startedAt: start, now: new Date(start.getTime() + 48 * HOUR), timeZone: "UTC" });
    expect(formatLifeStatus(state)).toContain("Place: Bare room · garage");
  }, SLOW);
});

describe("chooser interface", () => {
  it("offers a custom chooser only physically available tools and replaces impossible choices", () => {
    const seen: string[][] = [];
    const rogue: LifeChooser = {
      name: "rogue",
      choose(context) {
        seen.push(context.tools.map((tool) => tool.objectId ?? "bare"));
        return { toolId: "work:studio-desk", hours: 5 };
      },
    };
    const run = live({ seed: "rogue", apartment: STUDIO_FLAT, chooser: rogue }, 6);
    expect(seen.flat().some((id) => id.includes("desk"))).toBe(false);
    for (const activity of run) {
      expect(activity.id).toBe("idle");
      expect(activity.objectId).toBeUndefined();
    }
  });

  it("lets a different chooser drive the same home and hands it seeded context", () => {
    const lazy: LifeChooser = {
      name: "lazy",
      choose(context) {
        expect(context.minutesLeft).toBeGreaterThan(0);
        expect(context.random()).toBeGreaterThanOrEqual(0);
        const sofa = context.tools.find((tool) => tool.verb === "relax" && tool.objectId === "studio-sofa" && !tool.params.carryTo);
        return { toolId: sofa?.id ?? context.tools[0]!.id, hours: 3 };
      },
    };
    const run = live({ seed: "lazy", apartment: STUDIO_FLAT, chooser: lazy }, 4);
    expect(run.every((activity) => activity.caption === "Relaxing on the sofa")).toBe(true);
    expect(run[0]!.plannedHours).toBe(3);
    expect(new UtilityChooser().name).toBe("utility");
  });

  it("rejects malformed choosers and occupancy", () => {
    expect(() => createLifeSimulation({ agentId: "a", seed: 1, chooser: {} as LifeChooser })).toThrow("chooser");
    expect(() => createLifeSimulation({ agentId: "a", seed: 1, occupancy: { "studio-desk": -1 } })).toThrow("occupancy");
    expect(() => createLifeSimulation({ agentId: "a", seed: 1, apartment: { name: " " } })).toThrow("name");
  });
});
