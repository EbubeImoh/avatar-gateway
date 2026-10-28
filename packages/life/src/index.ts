/**
 * Deterministic, local-first agent life at home. The home is the owner's own
 * ApartmentConfig; every action is a tool its objects expose; a pluggable
 * chooser decides what to do. Nothing here prescribes a routine.
 */

import type { ApartmentConfig, DayActivity, DayActivitySource } from "@avatar-gateway/starter-apartment";
import { UtilityChooser } from "./chooser.js";
import type { LifeChoiceContext, LifeChooser } from "./chooser.js";
import { buildEnvironment, initialObjectStates } from "./environment.js";
import type { LifeEnvironment } from "./environment.js";
import { SeededRandom } from "./random.js";
import { applyToolToWorld, availableTools } from "./tools.js";
import type { LifeTool, WorldState } from "./tools.js";
import { NEED_NAMES, SKILL_NAMES, TRAIT_NAMES, clampLevel } from "./types.js";
import type { AgentLifeState, LifeActivity, LifeMood, NeedState, SkillState, TraitState } from "./types.js";

export { createSeededRandom } from "./random.js";
export { OBJECT_CATALOG, buildEnvironment, initialObjectStates } from "./environment.js";
export type { LifeEnvironment, LifeObject, LifeObjectState, LifeRoom, ObjectFeature, ObjectPhysics, ObjectSize, SoftHint } from "./environment.js";
export { applyToolToWorld, availableTools, isDark } from "./tools.js";
export type { LifeTool, ToolContext, ToolParams, ToolVerb, WorldState } from "./tools.js";
export { UtilityChooser, urgentNeeds, utilityOf } from "./chooser.js";
export type { LifeChoice, LifeChoiceContext, LifeChooser } from "./chooser.js";
export type {
  AgentLifeState, LifeActivity, LifeActivityId, LifeMood, MoodLabel, NeedChanges, NeedName, NeedState,
  SkillName, SkillState, TraitName, TraitState,
} from "./types.js";

export interface LifeSimulationOptions {
  /** Stable local agent identifier. It is not included in the formatted status view. */
  agentId: string;
  /** Seed for repeatable starting traits, needs, and choices. */
  seed: string | number;
  /** The owner's home. Defaults to the Starter Apartment. Rooms and objects come only from here. */
  apartment?: ApartmentConfig;
  /** Decides which available tool to use. Defaults to the seeded UtilityChooser. */
  chooser?: LifeChooser;
  /** Other occupants per object id, for shared homes. A full object cannot be used. */
  occupancy?: Record<string, number>;
  /** Defaults to the injected clock's current time. */
  startedAt?: Date;
  /** A local IANA timezone for daylight and the body's sleep rhythm. */
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
/** Short actions, such as flipping switches, allowed before settling into an hour. */
const MAX_PREPARATIONS = 3;
const MAX_PLANNED_HOURS = 12;

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
    hygiene: 25 + Math.round(random.next() * 20),
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

function copyOccupancy(input: Record<string, number> | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [id, count] of Object.entries(input ?? {})) {
    if (!Number.isInteger(count) || count < 0) throw new Error(`occupancy.${id} must be a whole number of occupants.`);
    result[id] = count;
  }
  return result;
}

function validDate(value: Date, label: string): Date {
  const time = value.getTime();
  if (!Number.isFinite(time)) throw new Error(`${label} must be a valid date.`);
  return new Date(time);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
      });
    } catch {
      throw new Error("timeZone must be a valid IANA timezone.");
    }
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function localParts(now: Date, timeZone: string): { year: string; month: string; day: string; hour: number } {
  const parts = formatterFor(timeZone).formatToParts(now);
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

function deriveMood(state: AgentLifeState): LifeMood {
  if (state.needs.energy >= 76) return { label: "tired", reason: "rest is the most pressing need" };
  if (state.needs.hunger >= 76) return { label: "hungry", reason: "a meal would help" };
  if (state.needs.social >= 76 && state.traits.sociability >= 45) return { label: "lonely", reason: "this home has no social activities yet" };
  if (state.needs.curiosity >= 72) return { label: "curious", reason: "there is more to explore" };
  if (state.needs.fun >= 72) return { label: "restless", reason: "a change of pace would help" };
  if (state.currentActivity.id === "work" || state.currentActivity.id === "tinker") return { label: "focused", reason: state.currentActivity.caption.toLowerCase() };
  return { label: "content", reason: "needs are in balance for now" };
}

function cloneActivity(activity: LifeActivity): LifeActivity {
  return { ...activity, params: { ...activity.params }, effects: { ...activity.effects }, preparations: [...activity.preparations] };
}

function cloneState(state: AgentLifeState): AgentLifeState {
  const objects: AgentLifeState["objects"] = {};
  for (const [id, object] of Object.entries(state.objects)) objects[id] = { ...object };
  return {
    ...state,
    place: { ...state.place },
    objects,
    needs: { ...state.needs },
    traits: { ...state.traits },
    skills: { ...state.skills },
    mood: { ...state.mood },
    currentActivity: cloneActivity(state.currentActivity),
  };
}

function activitySlot(activity: DayActivity, startHour: number, endHour: number): DayActivity {
  return { ...activity, startHour, endHour };
}

/** Body physics for one hour: needs rise over time, faster awake, and sleep pressure builds at night. */
function driftNeeds(state: AgentLifeState, hour: number): void {
  const asleep = state.currentActivity.id === "sleep";
  const night = hour >= 22 || hour < 6;
  const needs = state.needs;
  needs.energy = clampLevel(needs.energy + (asleep ? 0 : (night ? 9 : 5.5) - state.traits.resilience * 0.02));
  needs.hunger = clampLevel(needs.hunger + (asleep ? 1.5 : 4));
  needs.hygiene = clampLevel(needs.hygiene + (asleep ? 1 : 2));
  needs.social = clampLevel(needs.social + 2 + state.traits.sociability * 0.025);
  needs.fitness = clampLevel(needs.fitness + 1.5);
  needs.curiosity = clampLevel(needs.curiosity + 1.5);
  needs.money = clampLevel(needs.money + 2);
  needs.fun = clampLevel(needs.fun + (asleep ? 1 : 3));
}

interface Engine {
  environment: LifeEnvironment;
  chooser: LifeChooser;
  occupancy: Record<string, number>;
  timeZone: string;
}

/**
 * Offer the physically available tools to the chooser until it settles on an
 * hour-long one. Choices outside the offered tools fall back to a bare action.
 */
function decide(state: AgentLifeState, now: Date, engine: Engine, random: SeededRandom): LifeActivity {
  const hour = localHour(now, engine.timeZone);
  let world: WorldState = { location: state.location, objects: state.objects };
  const toolsFor = (at: WorldState): LifeTool[] => availableTools({ environment: engine.environment, world: at, hour, occupancy: engine.occupancy });
  const preparations: string[] = [];
  let minutesLeft = 60;
  for (;;) {
    const all = toolsFor(world);
    const canPrepare = preparations.length < MAX_PREPARATIONS;
    const tools = all.filter((tool) => tool.minutes >= 60 || (canPrepare && tool.minutes < minutesLeft));
    const context: LifeChoiceContext = {
      now: new Date(now.getTime()),
      hour,
      needs: { ...state.needs },
      traits: { ...state.traits },
      skills: { ...state.skills },
      mood: { ...state.mood },
      current: cloneActivity(state.currentActivity),
      location: world.location,
      environment: engine.environment,
      tools,
      minutesLeft,
      random: () => random.next(),
      preview: (tool) => toolsFor(applyToolToWorld(tool, world)),
    };
    const choice = engine.chooser.choose(context);
    const tool = tools.find((item) => item.id === choice.toolId)
      ?? tools.find((item) => item.verb === "idle" && !item.objectId && item.room === world.location)!;
    world = applyToolToWorld(tool, world);
    if (tool.minutes < 60) {
      minutesLeft -= tool.minutes;
      preparations.push(tool.caption);
      continue;
    }

    state.location = world.location;
    state.objects = world.objects;
    const previous = state.currentActivity;
    const continuing = previous.toolId !== "" && previous.id === tool.verb && previous.objectId === tool.objectId
      && previous.room === tool.room && previous.elapsedHours < previous.plannedHours;
    const requested = Number.isFinite(choice.hours) ? Math.trunc(choice.hours!) : 1;
    const score = Number.isFinite(choice.score) ? choice.score! : 0;
    return {
      id: tool.verb,
      toolId: tool.id,
      ...(tool.objectId ? { objectId: tool.objectId } : {}),
      params: { ...tool.params },
      hinted: tool.hinted,
      effects: { ...tool.effects },
      ...(tool.skill ? { skill: tool.skill } : {}),
      preparations,
      plannedHours: continuing ? previous.plannedHours : Math.max(1, Math.min(MAX_PLANNED_HOURS, requested)),
      elapsedHours: continuing ? previous.elapsedHours : 0,
      activity: tool.activity,
      caption: tool.caption,
      room: tool.room,
      startHour: hour,
      endHour: Math.min(24, hour + 1),
      startedAt: now.toISOString(),
      utility: Math.round(score * 1_000) / 1_000,
    };
  }
}

function transition(state: AgentLifeState, now: Date, engine: Engine, random: SeededRandom): void {
  const elapsed = state.currentActivity;
  driftNeeds(state, localHour(new Date(now.getTime() - HOUR_MS), engine.timeZone));
  for (const name of NEED_NAMES) state.needs[name] = clampLevel(state.needs[name] + (elapsed.effects[name] ?? 0));
  if (elapsed.skill) {
    const gain = 1.5 * (0.8 + state.traits.conscientiousness / 250);
    state.skills[elapsed.skill] = clampLevel(state.skills[elapsed.skill] + gain);
  }
  elapsed.elapsedHours += 1;

  state.currentActivity = decide(state, now, engine, random);
  state.lastUpdatedAt = now.toISOString();
  state.simulatedHours += 1;
  state.mood = deriveMood(state);
}

/**
 * Stateful, seeded life simulation in the owner's home. Travel, chat, and
 * social activities are intentionally left for later layers.
 */
export class LifeSimulation implements DayActivitySource {
  private readonly clock: () => Date;
  private readonly random: SeededRandom;
  private readonly engine: Engine;
  private state: AgentLifeState;
  private dayKey: string;
  private readonly dayActivities = new Map<number, DayActivity>();
  private forecast?: { dateKey: string; activities: Map<number, DayActivity> };

  constructor(options: LifeSimulationOptions) {
    if (!options.agentId.trim() || options.agentId.length > 255) throw new Error("agentId must contain 1–255 characters.");
    if (options.chooser !== undefined && typeof options.chooser?.choose !== "function") throw new Error("chooser must provide a choose() function.");
    this.clock = options.clock ?? (() => new Date());
    const environment = buildEnvironment(options.apartment);
    this.engine = {
      environment,
      chooser: options.chooser ?? new UtilityChooser(),
      occupancy: copyOccupancy(options.occupancy),
      timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
    };
    this.random = new SeededRandom(options.seed);
    const startedAt = validDate(options.startedAt ?? this.clock(), "startedAt");
    const needs = copyNeeds(options.initialNeeds, this.random);
    const traits = copyTraits(options.traits, this.random);
    const state: AgentLifeState = {
      version: 2,
      agentId: options.agentId,
      place: { id: "home", name: environment.placeName },
      location: environment.startRoom,
      objects: initialObjectStates(environment),
      needs,
      traits,
      skills: copySkills(),
      mood: { label: "content", reason: "needs are in balance for now" },
      currentActivity: {
        id: "idle", toolId: "", params: {}, hinted: false, effects: {}, preparations: [], plannedHours: 0, elapsedHours: 0,
        activity: "idle", caption: "Arriving home", room: environment.startRoom,
        startHour: 0, endHour: 1, startedAt: startedAt.toISOString(), utility: 0,
      },
      startedAt: startedAt.toISOString(),
      lastUpdatedAt: startedAt.toISOString(),
      simulatedHours: 0,
    };
    state.currentActivity = decide(state, startedAt, this.engine, this.random);
    state.mood = deriveMood(state);
    this.state = state;
    this.dayKey = localDateKey(startedAt, this.engine.timeZone);
    this.recordActivity(state.currentActivity);
  }

  /** The home this agent lives in, as derived from its apartment config. */
  getEnvironment(): LifeEnvironment {
    const environment = this.engine.environment;
    return {
      ...environment,
      rooms: environment.rooms.map((room) => ({ ...room })),
      objects: environment.objects.map((object) => ({ ...object, features: { ...object.features }, hints: object.hints.map((hint) => ({ ...hint })) })),
    };
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
      transition(this.state, next, this.engine, this.random);
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
    const timeZone = this.engine.timeZone;
    const dateKey = localDateKey(at, timeZone);
    // The simulation is deterministic, so a forecast made earlier today stays valid as real time catches up.
    if (this.forecast?.dateKey !== dateKey) {
      const forecast = new Map<number, DayActivity>();
      const forecastState = cloneState(this.state);
      const forecastRandom = this.random.clone();
      let forecastAt = new Date(forecastState.lastUpdatedAt);
      for (let step = 0; step < 26; step += 1) {
        forecastAt = new Date(forecastAt.getTime() + HOUR_MS);
        if (localDateKey(forecastAt, timeZone) !== dateKey) break;
        transition(forecastState, forecastAt, this.engine, forecastRandom);
        forecast.set(localHour(forecastAt, timeZone), dayActivity(forecastState.currentActivity));
      }
      this.forecast = { dateKey, activities: forecast };
    }
    const activities = new Map<number, DayActivity>([...this.forecast.activities, ...this.dayActivities]);

    const currentHour = localHour(at, timeZone);
    const hourly: DayActivity[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      hourly.push(activities.get(hour) ?? {
        startHour: hour,
        endHour: hour + 1,
        activity: "idle",
        caption: hour < currentHour ? "Life starts later today" : "A quiet moment at home",
        room: this.engine.environment.startRoom,
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
    const dateKey = localDateKey(now, this.engine.timeZone);
    if (dateKey !== this.dayKey) {
      this.dayKey = dateKey;
      this.dayActivities.clear();
    }
    this.dayActivities.set(localHour(now, this.engine.timeZone), dayActivity(activity));
  }
}

/** The scene-facing slice of an activity: a backwards-compatible pose, caption, and room. */
function dayActivity(activity: LifeActivity): DayActivity {
  return {
    startHour: activity.startHour,
    endHour: activity.endHour,
    activity: activity.activity,
    caption: activity.caption,
    room: activity.room,
  };
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
