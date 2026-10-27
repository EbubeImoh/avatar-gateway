/** Deterministic, local-first agent needs, mood, skills, and home routine. */

import type { AvatarActivity, DayActivity, DayActivitySource, RoomId } from "@avatar-gateway/starter-apartment";

export type NeedName = "energy" | "hunger" | "social" | "fitness" | "curiosity" | "money" | "fun";
export type NeedState = Record<NeedName, number>;

export type TraitName = "conscientiousness" | "curiosity" | "playfulness" | "resilience" | "sociability";
export type TraitState = Record<TraitName, number>;

export type SkillName = "building" | "cooking" | "fitness" | "reading" | "selfCare";
export type SkillState = Record<SkillName, number>;

export type LifeActivityId = "sleep" | "wake" | "coffee" | "work" | "meal" | "stretch" | "read" | "relax";
export type MoodLabel = "content" | "curious" | "focused" | "hungry" | "lonely" | "restless" | "tired";

export interface LifeMood {
  label: MoodLabel;
  reason: string;
}

export interface LifeActivity extends DayActivity {
  id: LifeActivityId;
  startedAt: string;
  utility: number;
}

export interface AgentLifeState {
  version: 1;
  agentId: string;
  place: { id: "home"; name: "Starter Apartment" };
  needs: NeedState;
  traits: TraitState;
  skills: SkillState;
  mood: LifeMood;
  currentActivity: LifeActivity;
  startedAt: string;
  lastUpdatedAt: string;
  simulatedHours: number;
}

export interface LifeSimulationOptions {
  /** Stable local agent identifier. It is not included in the formatted status view. */
  agentId: string;
  /** Seed for repeatable starting traits, needs, and utility tie-breaks. */
  seed: string | number;
  /** Defaults to the injected clock's current time. */
  startedAt?: Date;
  /** A local IANA timezone used for daily schedule utility. */
  timeZone?: string;
  /** Defaults to the system clock. */
  clock?: () => Date;
  initialNeeds?: Partial<NeedState>;
  traits?: Partial<TraitState>;
}

export interface LifeProjectionOptions extends LifeSimulationOptions {
  now: Date;
}

const HOUR_MS = 60 * 60 * 1000;
const MAX_REPLAY_HOURS = 24 * 365 * 10;
const DEFAULT_TIME_ZONE = "Africa/Lagos";
const NEED_NAMES: NeedName[] = ["energy", "hunger", "social", "fitness", "curiosity", "money", "fun"];
const TRAIT_NAMES: TraitName[] = ["conscientiousness", "curiosity", "playfulness", "resilience", "sociability"];
const SKILL_NAMES: SkillName[] = ["building", "cooking", "fitness", "reading", "selfCare"];

type NeedChanges = Partial<Record<NeedName, number>>;

interface HomeAction {
  id: LifeActivityId;
  activity: AvatarActivity;
  caption: string;
  room: RoomId;
  changes: NeedChanges;
  skill?: SkillName;
  skillGain?: number;
  scheduleBonus(hour: number): number;
  traitBonus(traits: TraitState): number;
}

function hashSeed(seed: string | number): number {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed)) throw new Error("Life seed must be a finite number or non-empty string.");
    const value = Math.trunc(seed) >>> 0;
    return value === 0 ? 0x6d2b79f5 : value;
  }
  if (!seed.trim() || seed.length > 1_000) throw new Error("Life seed must be a finite number or non-empty string.");
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash === 0 ? 0x6d2b79f5 : hash;
}

class SeededRandom {
  private state: number;

  constructor(seed: string | number) {
    this.state = hashSeed(seed);
  }

  next(): number {
    let value = (this.state += 0x6d2b79f5) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  clone(): SeededRandom {
    return new SeededRandom(this.state);
  }
}

/** Create a repeatable random source without relying on global Math.random. */
export function createSeededRandom(seed: string | number): () => number {
  const random = new SeededRandom(seed);
  return () => random.next();
}

function assertLevel(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${label} must be a number from 0 to 100.`);
  return value;
}

function copyNeeds(input: Partial<NeedState> | undefined, random: SeededRandom): NeedState {
  const defaults: NeedState = {
    energy: 45 + Math.round(random.next() * 16),
    hunger: 35 + Math.round(random.next() * 18),
    social: 35 + Math.round(random.next() * 18),
    fitness: 35 + Math.round(random.next() * 18),
    curiosity: 30 + Math.round(random.next() * 20),
    money: 30 + Math.round(random.next() * 20),
    fun: 30 + Math.round(random.next() * 20),
  };
  const result = { ...defaults, ...input };
  for (const key of NEED_NAMES) result[key] = assertLevel(result[key], `needs.${key}`);
  return result;
}

function copyTraits(input: Partial<TraitState> | undefined, random: SeededRandom): TraitState {
  const defaults: TraitState = {
    conscientiousness: 35 + Math.round(random.next() * 50),
    curiosity: 35 + Math.round(random.next() * 50),
    playfulness: 35 + Math.round(random.next() * 50),
    resilience: 35 + Math.round(random.next() * 50),
    sociability: 35 + Math.round(random.next() * 50),
  };
  const result = { ...defaults, ...input };
  for (const key of TRAIT_NAMES) result[key] = assertLevel(result[key], `traits.${key}`);
  return result;
}

function copySkills(input?: SkillState): SkillState {
  const result = input ? { ...input } : { building: 0, cooking: 0, fitness: 0, reading: 0, selfCare: 0 };
  for (const key of SKILL_NAMES) result[key] = assertLevel(result[key], `skills.${key}`);
  return result;
}

function validDate(value: Date, label: string): Date {
  const time = value.getTime();
  if (!Number.isFinite(time)) throw new Error(`${label} must be a valid date.`);
  return new Date(time);
}

function localParts(now: Date, timeZone: string): { year: string; month: string; day: string; hour: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    throw new Error("timeZone must be a valid IANA timezone.");
  }
  const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  return { year: value("year"), month: value("month"), day: value("day"), hour: Number(value("hour")) };
}

function localHour(now: Date, timeZone: string): number {
  const hour = localParts(now, timeZone).hour;
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 0;
}

function localDateKey(now: Date, timeZone: string): string {
  const parts = localParts(now, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

const HOME_ACTIONS: HomeAction[] = [
  {
    id: "sleep", activity: "sleeping", caption: "Getting some rest", room: "bedroom",
    changes: { energy: -29, fun: -2, hunger: 4 }, skill: "selfCare", skillGain: 1.4,
    scheduleBonus: (hour) => hour >= 22 || hour < 6 ? 8 : 0,
    traitBonus: (traits) => traits.resilience * 0.025,
  },
  {
    id: "wake", activity: "waking", caption: "Waking up slowly", room: "bedroom",
    changes: { energy: -3, fun: -1 }, skill: "selfCare", skillGain: 0.5,
    scheduleBonus: (hour) => hour >= 6 && hour < 8 ? 7 : 0,
    traitBonus: (traits) => traits.conscientiousness * 0.018,
  },
  {
    id: "coffee", activity: "coffee", caption: "Making a cup of coffee", room: "kitchen",
    changes: { energy: -8, fun: -4, hunger: 2 }, skill: "cooking", skillGain: 1.1,
    scheduleBonus: (hour) => hour >= 7 && hour < 10 ? 5 : 0,
    traitBonus: (traits) => traits.playfulness * 0.018,
  },
  {
    id: "work", activity: "working", caption: "Working on a personal project", room: "studio",
    changes: { money: -16, curiosity: -4, energy: 5, hunger: 4, fun: 1 }, skill: "building", skillGain: 1.8,
    scheduleBonus: (hour) => hour >= 9 && hour < 17 ? 7 : 0,
    traitBonus: (traits) => traits.conscientiousness * 0.035 + traits.curiosity * 0.012,
  },
  {
    id: "meal", activity: "idle", caption: "Taking a meal break", room: "kitchen",
    changes: { hunger: -30, fun: -2, energy: -1 }, skill: "cooking", skillGain: 0.8,
    scheduleBonus: (hour) => hour >= 11 && hour < 14 ? 5 : 0,
    traitBonus: (traits) => traits.conscientiousness * 0.01,
  },
  {
    id: "stretch", activity: "stretching", caption: "Stretching at home", room: "gym",
    changes: { fitness: -28, fun: -2, energy: 4 }, skill: "fitness", skillGain: 1.8,
    scheduleBonus: (hour) => hour >= 17 && hour < 20 ? 5 : 0,
    traitBonus: (traits) => traits.conscientiousness * 0.02 + traits.playfulness * 0.008,
  },
  {
    id: "read", activity: "reading", caption: "Reading for a while", room: "living",
    changes: { curiosity: -24, fun: -7, energy: 2 }, skill: "reading", skillGain: 1.8,
    scheduleBonus: (hour) => hour >= 18 && hour < 22 ? 5 : 0,
    traitBonus: (traits) => traits.curiosity * 0.04,
  },
  {
    id: "relax", activity: "idle", caption: "Winding down at home", room: "living",
    changes: { fun: -25, energy: -5 }, skill: "selfCare", skillGain: 1,
    scheduleBonus: (hour) => hour >= 20 || hour < 6 ? 3 : 0,
    traitBonus: (traits) => traits.playfulness * 0.025 + traits.resilience * 0.01,
  },
];

function utility(action: HomeAction, state: AgentLifeState, hour: number, random: SeededRandom): number {
  const needRelief = NEED_NAMES.reduce((total, name) => {
    const relief = Math.max(0, -(action.changes[name] ?? 0));
    return total + state.needs[name] * (relief / 100) * 0.34;
  }, 0);
  return 2 + needRelief + action.scheduleBonus(hour) + action.traitBonus(state.traits) + random.next() * 0.05;
}

function chooseAction(state: AgentLifeState, now: Date, timeZone: string, random: SeededRandom): { action: HomeAction; score: number } {
  const hour = localHour(now, timeZone);
  let chosen = HOME_ACTIONS[0]!;
  let best = Number.NEGATIVE_INFINITY;
  for (const action of HOME_ACTIONS) {
    const score = utility(action, state, hour, random);
    if (score > best) {
      chosen = action;
      best = score;
    }
  }
  return { action: chosen, score: best };
}

function makeActivity(action: HomeAction, now: Date, utilityScore: number, timeZone: string): LifeActivity {
  const hour = localHour(now, timeZone);
  return {
    id: action.id,
    activity: action.activity,
    caption: action.caption,
    room: action.room,
    startHour: hour,
    endHour: Math.min(24, hour + 1),
    startedAt: now.toISOString(),
    utility: Math.round(utilityScore * 1_000) / 1_000,
  };
}

function deriveMood(state: AgentLifeState): LifeMood {
  if (state.needs.energy >= 76) return { label: "tired", reason: "rest is the most pressing need" };
  if (state.needs.hunger >= 76) return { label: "hungry", reason: "a meal would help" };
  if (state.needs.social >= 76 && state.traits.sociability >= 45) return { label: "lonely", reason: "this home has no social activities yet" };
  if (state.needs.curiosity >= 72) return { label: "curious", reason: "there is more to explore" };
  if (state.needs.fun >= 72) return { label: "restless", reason: "a change of pace would help" };
  if (state.currentActivity.id === "work") return { label: "focused", reason: "working on a personal project" };
  return { label: "content", reason: "needs are in balance for now" };
}

function cloneState(state: AgentLifeState): AgentLifeState {
  return {
    ...state,
    place: { ...state.place },
    needs: { ...state.needs },
    traits: { ...state.traits },
    skills: { ...state.skills },
    mood: { ...state.mood },
    currentActivity: { ...state.currentActivity },
  };
}

function activitySlot(activity: DayActivity, startHour: number, endHour: number): DayActivity {
  return { ...activity, startHour, endHour };
}

function transition(state: AgentLifeState, now: Date, timeZone: string, random: SeededRandom): void {
  const elapsed = HOME_ACTIONS.find((action) => action.id === state.currentActivity.id);
  const sleeping = elapsed?.id === "sleep";
  state.needs.energy = clamp(state.needs.energy + (sleeping ? -12 : 7 - state.traits.resilience * 0.035));
  state.needs.hunger = clamp(state.needs.hunger + (sleeping ? 5 : 7));
  state.needs.social = clamp(state.needs.social + 2 + state.traits.sociability * 0.025);
  state.needs.fitness = clamp(state.needs.fitness + 1.5);
  state.needs.curiosity = clamp(state.needs.curiosity + 1.5);
  state.needs.money = clamp(state.needs.money + 2);
  state.needs.fun = clamp(state.needs.fun + (sleeping ? 1 : 3));

  if (elapsed) {
    for (const name of NEED_NAMES) state.needs[name] = clamp(state.needs[name] + (elapsed.changes[name] ?? 0));
    if (elapsed.skill && elapsed.skillGain) {
      const gain = elapsed.skillGain * (0.8 + state.traits.conscientiousness / 250);
      state.skills[elapsed.skill] = clamp(state.skills[elapsed.skill] + gain);
    }
  }

  const next = chooseAction(state, now, timeZone, random);
  state.currentActivity = makeActivity(next.action, now, next.score, timeZone);
  state.lastUpdatedAt = now.toISOString();
  state.simulatedHours += 1;
  state.mood = deriveMood(state);
}

/**
 * Stateful, seeded life simulation. It only has a home in this layer; travel,
 * chat, and social activities are intentionally left for later layers.
 */
export class LifeSimulation implements DayActivitySource {
  private readonly clock: () => Date;
  private readonly timeZone: string;
  private readonly random: SeededRandom;
  private state: AgentLifeState;
  private dayKey: string;
  private readonly dayActivities = new Map<number, DayActivity>();

  constructor(options: LifeSimulationOptions) {
    if (!options.agentId.trim() || options.agentId.length > 255) throw new Error("agentId must contain 1–255 characters.");
    this.clock = options.clock ?? (() => new Date());
    this.timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
    this.random = new SeededRandom(options.seed);
    const startedAt = validDate(options.startedAt ?? this.clock(), "startedAt");
    const needs = copyNeeds(options.initialNeeds, this.random);
    const traits = copyTraits(options.traits, this.random);
    const state: AgentLifeState = {
      version: 1,
      agentId: options.agentId,
      place: { id: "home", name: "Starter Apartment" },
      needs,
      traits,
      skills: copySkills(),
      mood: { label: "content", reason: "needs are in balance for now" },
      currentActivity: {
        id: "relax", activity: "idle", caption: "Winding down at home", room: "living",
        startHour: 0, endHour: 1, startedAt: startedAt.toISOString(), utility: 0,
      },
      startedAt: startedAt.toISOString(),
      lastUpdatedAt: startedAt.toISOString(),
      simulatedHours: 0,
    };
    const first = chooseAction(state, startedAt, this.timeZone, this.random);
    state.currentActivity = makeActivity(first.action, startedAt, first.score, this.timeZone);
    state.mood = deriveMood(state);
    this.state = state;
    this.dayKey = localDateKey(startedAt, this.timeZone);
    this.recordActivity(state.currentActivity);
  }

  /** Return a defensive copy of the current state. Mutating it never changes the simulation. */
  getSnapshot(): AgentLifeState {
    return cloneState(this.state);
  }

  /** Advance whole simulated hours up to the injected clock or an explicit time. */
  advanceTo(target: Date = this.clock()): AgentLifeState {
    const now = validDate(target, "clock time");
    const lastUpdated = new Date(this.state.lastUpdatedAt);
    if (now.getTime() < lastUpdated.getTime()) throw new Error("Life clock cannot move backwards.");
    const hoursToAdvance = Math.floor((now.getTime() - lastUpdated.getTime()) / HOUR_MS);
    if (hoursToAdvance > MAX_REPLAY_HOURS) throw new Error("Life projection is more than 10 years behind; rerun Shubur init to reset its local start time.");
    for (let step = 0; step < hoursToAdvance; step += 1) {
      const next = new Date(new Date(this.state.lastUpdatedAt).getTime() + HOUR_MS);
      transition(this.state, next, this.timeZone, this.random);
      this.recordActivity(this.state.currentActivity);
    }
    return this.getSnapshot();
  }

  /**
   * Return today's realized and near-term projected home routine. The projection
   * is in-memory only and never writes activity or owner data to disk.
   */
  getDayActivities(now: Date = this.clock()): DayActivity[] {
    const at = validDate(now, "activity time");
    this.advanceTo(at);
    const dateKey = localDateKey(at, this.timeZone);
    const activities = new Map<number, DayActivity>(this.dayActivities);
    const forecastState = cloneState(this.state);
    const forecastRandom = this.random.clone();
    let forecastAt = new Date(forecastState.lastUpdatedAt);
    for (let step = 0; step < 26; step += 1) {
      forecastAt = new Date(forecastAt.getTime() + HOUR_MS);
      if (localDateKey(forecastAt, this.timeZone) !== dateKey) break;
      transition(forecastState, forecastAt, this.timeZone, forecastRandom);
      const hour = localHour(forecastAt, this.timeZone);
      activities.set(hour, forecastState.currentActivity);
    }

    const currentHour = localHour(at, this.timeZone);
    const hourly: DayActivity[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      hourly.push(activities.get(hour) ?? {
        startHour: hour,
        endHour: hour + 1,
        activity: "idle",
        caption: hour < currentHour ? "Life starts later today" : "A quiet moment at home",
        room: "living",
      });
    }

    const merged: DayActivity[] = [];
    for (const activity of hourly) {
      const previous = merged.at(-1);
      if (previous && previous.activity === activity.activity && previous.caption === activity.caption && previous.room === activity.room) {
        merged[merged.length - 1] = activitySlot(previous, previous.startHour, activity.endHour);
      } else {
        merged.push({ ...activity });
      }
    }
    return merged;
  }

  private recordActivity(activity: LifeActivity): void {
    const now = new Date(activity.startedAt);
    const dateKey = localDateKey(now, this.timeZone);
    if (dateKey !== this.dayKey) {
      this.dayKey = dateKey;
      this.dayActivities.clear();
    }
    this.dayActivities.set(localHour(now, this.timeZone), {
      startHour: activity.startHour,
      endHour: activity.endHour,
      activity: activity.activity,
      caption: activity.caption,
      room: activity.room,
    });
  }
}

export function createLifeSimulation(options: LifeSimulationOptions): LifeSimulation {
  return new LifeSimulation(options);
}

/** Build the same local projection used by the CLI and MCP read-only views. */
export function projectLifeState(options: LifeProjectionOptions): AgentLifeState {
  const simulation = new LifeSimulation({ ...options, clock: () => new Date(options.now.getTime()) });
  return simulation.advanceTo(options.now);
}

export function formatLifeStatus(state: AgentLifeState): string {
  const needLines = NEED_NAMES.map((name) => `  ${name}: ${Math.round(state.needs[name])}/100`).join("\n");
  const skillLines = SKILL_NAMES.map((name) => `  ${name}: ${Math.round(state.skills[name])}/100`).join("\n");
  return [
    `Current activity: ${state.currentActivity.caption}`,
    `Place: ${state.place.name} · ${state.currentActivity.room}`,
    `Mood: ${state.mood.label} (${state.mood.reason})`,
    "Needs (0 = satisfied, 100 = urgent):",
    needLines,
    "Skills:",
    skillLines,
    `Last simulated: ${state.lastUpdatedAt}`,
    "This local view uses no LLM, network request, or persistent activity log.",
  ].join("\n");
}
