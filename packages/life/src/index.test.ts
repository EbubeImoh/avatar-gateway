import { describe, expect, it } from "vitest";
import { createLifeSimulation, createSeededRandom, formatLifeStatus, projectLifeState } from "./index.js";

const start = new Date("2026-10-27T09:00:00.000Z");
const at = (hours: number): Date => new Date(start.getTime() + hours * 60 * 60 * 1000);

describe("seeded life simulation", () => {
  it("generates repeatable random sequences for the same seed", () => {
    const first = createSeededRandom("did:key:agent-one");
    const second = createSeededRandom("did:key:agent-one");
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
    expect(createSeededRandom("agent-two")()).not.toBe(createSeededRandom("agent-one")());
  });

  it("projects the same needs, traits, skills, mood, and activity for the same seed and clock", () => {
    const first = projectLifeState({ agentId: "agent-1", seed: "stable", startedAt: start, now: at(24), timeZone: "Africa/Lagos" });
    const second = projectLifeState({ agentId: "agent-1", seed: "stable", startedAt: start, now: at(24), timeZone: "Africa/Lagos" });
    expect(first).toEqual(second);
    expect(first.place).toEqual({ id: "home", name: "Starter Apartment" });
    expect(first.simulatedHours).toBe(24);
  });

  it("uses agent traits and need pressure to select an activity, then grows practiced skills", () => {
    const simulation = createLifeSimulation({
      agentId: "agent-work",
      seed: "work-seed",
      startedAt: start,
      timeZone: "Africa/Lagos",
      initialNeeds: { energy: 0, hunger: 0, social: 0, fitness: 0, curiosity: 0, money: 100, fun: 0 },
      traits: { conscientiousness: 100, curiosity: 0, playfulness: 0, resilience: 0, sociability: 0 },
    });
    expect(simulation.getSnapshot().currentActivity.id).toBe("work");
    const after = simulation.advanceTo(at(1));
    expect(after.skills.building).toBeGreaterThan(0);
    expect(after.needs.money).toBeLessThan(100);
  });

  it("lets sleep relieve urgent energy and keeps needs within their bounds", () => {
    const night = new Date("2026-10-27T01:00:00.000Z");
    const simulation = createLifeSimulation({
      agentId: "agent-rest",
      seed: "rest-seed",
      startedAt: night,
      timeZone: "Africa/Lagos",
      initialNeeds: { energy: 100, hunger: 0, social: 0, fitness: 0, curiosity: 0, money: 0, fun: 0 },
      traits: { conscientiousness: 50, curiosity: 50, playfulness: 50, resilience: 100, sociability: 0 },
    });
    expect(simulation.getSnapshot().currentActivity.id).toBe("sleep");
    const after = simulation.advanceTo(new Date(night.getTime() + 60 * 60 * 1000));
    expect(after.needs.energy).toBeLessThan(100);
    expect(after.skills.selfCare).toBeGreaterThan(0);
    for (const value of Object.values(after.needs)) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of Object.values(after.needs)) expect(value).toBeLessThanOrEqual(100);
  });

  it("derives mood from unmet social need without inventing social activity", () => {
    const state = projectLifeState({
      agentId: "agent-home-alone",
      seed: "alone",
      startedAt: start,
      now: start,
      initialNeeds: { energy: 0, hunger: 0, social: 100, fitness: 0, curiosity: 0, money: 0, fun: 0 },
      traits: { sociability: 100, conscientiousness: 30, curiosity: 30, playfulness: 30, resilience: 30 },
    });
    expect(state.mood.label).toBe("lonely");
    expect(state.currentActivity.room).toBeTruthy();
    expect(state.place.id).toBe("home");
  });

  it("returns a complete validated apartment day cycle without mutating its state when read twice", () => {
    const simulation = createLifeSimulation({ agentId: "agent-cycle", seed: 71, startedAt: start, timeZone: "Africa/Lagos" });
    const first = simulation.getDayActivities(at(8));
    const snapshot = simulation.getSnapshot();
    const second = simulation.getDayActivities(at(8));
    expect(first).toEqual(second);
    expect(first[0]?.startHour).toBe(0);
    expect(first.at(-1)?.endHour).toBe(24);
    expect(first.reduce((total, activity) => total + activity.endHour - activity.startHour, 0)).toBe(24);
    for (const activity of first) {
      expect(activity.room).toBeTruthy();
      expect(activity.startHour).toBeGreaterThanOrEqual(0);
      expect(activity.endHour).toBeLessThanOrEqual(24);
    }
    expect(simulation.getSnapshot()).toEqual(snapshot);
  });

  it("returns defensive snapshots and a local status that does not reveal the agent id", () => {
    const simulation = createLifeSimulation({ agentId: "private-local-id", seed: 23, startedAt: start });
    const snapshot = simulation.getSnapshot();
    snapshot.needs.energy = 0;
    expect(simulation.getSnapshot().needs.energy).not.toBe(0);
    const status = formatLifeStatus(simulation.getSnapshot());
    expect(status).toContain("Current activity:");
    expect(status).toContain("Needs (0 = satisfied, 100 = urgent):");
    expect(status).not.toContain("private-local-id");
  });

  it("accepts an injected clock and rejects invalid or backwards time", () => {
    let now = new Date(start);
    const simulation = createLifeSimulation({ agentId: "agent-clock", seed: 4, startedAt: start, clock: () => new Date(now) });
    now = at(2);
    expect(simulation.advanceTo().simulatedHours).toBe(2);
    expect(() => simulation.advanceTo(at(1))).toThrow("cannot move backwards");
    expect(() => simulation.advanceTo(new Date(Number.NaN))).toThrow("valid date");
  });

  it("rejects malformed seeds, levels, timezones, and unbounded replay windows", () => {
    expect(() => createSeededRandom(" ")).toThrow("seed");
    expect(() => createLifeSimulation({ agentId: "", seed: 1 })).toThrow("agentId");
    expect(() => createLifeSimulation({ agentId: "agent", seed: 1, initialNeeds: { hunger: 101 } })).toThrow("needs.hunger");
    expect(() => createLifeSimulation({ agentId: "agent", seed: 1, timeZone: "Not/AZone" })).toThrow("IANA timezone");
    const old = new Date(start.getTime() - 11 * 365 * 24 * 60 * 60 * 1000);
    const stale = createLifeSimulation({ agentId: "agent", seed: 1, startedAt: old });
    expect(() => stale.advanceTo(start)).toThrow("more than 10 years");
  });
});
