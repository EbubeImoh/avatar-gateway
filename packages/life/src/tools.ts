/**
 * Every action is a tool. Tools are derived from the objects present in the
 * home and their physical state, never from a fixed routine: a home with no
 * desk has no desk tools, a carried mat offers stretching wherever it is
 * taken, and bare tools such as resting on the floor are always available.
 *
 * This module only says what is physically possible and what it would do.
 * Deciding which tool to use belongs to a LifeChooser.
 */

import type { AvatarActivity, RoomId } from "@avatar-gateway/starter-apartment";
import type { LifeEnvironment, LifeObject, LifeObjectState, ObjectFeature } from "./environment.js";
import type { NeedChanges, NeedName, SkillName } from "./types.js";

export type ToolVerb =
  | "sleep" | "relax" | "eat" | "work" | "read" | "exercise" | "wash" | "groom"
  | "tend" | "gaze" | "tinker" | "idle" | "switchOn" | "switchOff";

export interface ToolParams {
  /** Carry the object to this room and leave it there. */
  carryTo?: RoomId;
  /** Object the agent settles on, such as a sofa to read a book from the shelf. */
  at?: string;
}

export interface LifeTool {
  /** Stable id, unique among the tools available at one moment. */
  id: string;
  verb: ToolVerb;
  objectId?: string;
  /** Room the agent will be in while using the tool. */
  room: RoomId;
  params: ToolParams;
  /** Minutes the tool takes. Tools shorter than an hour leave time for another choice. */
  minutes: number;
  /** Whether the object's soft hints mention this use. */
  hinted: boolean;
  /** Physical suitability from 0 to 1, after lighting and time of day. */
  quality: number;
  /** Need changes for one hour of use. Negative values relieve a need. */
  effects: NeedChanges;
  skill?: SkillName;
  /** Rooms walked to reach the tool, including fetching a carried object. */
  distance: number;
  /** How pleasant the destination room is right now, from 0 to 1. */
  ambience: number;
  /** Scene label kept compatible with the Starter Apartment's activity poses. */
  activity: AvatarActivity;
  caption: string;
}

/** The physical world a tool acts on: where the agent is and the state of each object. */
export interface WorldState {
  location: RoomId;
  objects: Record<string, LifeObjectState>;
}

export interface ToolContext {
  environment: LifeEnvironment;
  world: WorldState;
  /** Local hour, 0–23. */
  hour: number;
  /** Other occupants per object id; a full object cannot be used. */
  occupancy?: Readonly<Record<string, number>>;
}

interface VerbSpec {
  /** Physical features that make the verb possible, with how well each serves it. */
  uses: Partial<Record<ObjectFeature, number>>;
  /** Quality when done with no object, in any room. Omitted when impossible. */
  bare?: number;
  effects: NeedChanges;
  skill?: SkillName;
  activity: AvatarActivity;
  /** Harder in a dark room at night. */
  needsLight?: boolean;
  caption(target: CaptionTarget | undefined): string;
}

interface CaptionTarget {
  label: string;
  feature: ObjectFeature;
  quality: number;
  /** "in the car", "at the desk", "on the sofa". */
  on: string;
}

const SWITCH_MINUTES = 2;
const HOUR_MINUTES = 60;

const VERBS: Record<Exclude<ToolVerb, "read" | "switchOn" | "switchOff">, VerbSpec> = {
  sleep: {
    uses: { bed: 1, seat: 0.55, padding: 0.4 }, bare: 0.35,
    effects: { energy: -11, fun: -1 }, skill: "selfCare", activity: "sleeping",
    caption: (target) => !target ? "Sleeping on the floor" : target.feature === "bed" && target.quality >= 0.9 ? `Sleeping in the ${target.label}` : `Sleeping ${target.on}`,
  },
  relax: {
    uses: { seat: 1, bed: 0.8, surface: 0.45 }, bare: 0.4,
    effects: { fun: -18 }, skill: "selfCare", activity: "idle",
    caption: (target) => !target ? "Lounging on the floor" : `Relaxing ${target.on}`,
  },
  eat: {
    uses: { food: 1 },
    effects: { hunger: -40, fun: -3, hygiene: 2 }, skill: "cooking", activity: "idle",
    caption: (target) => `Having a meal ${target?.on}`,
  },
  work: {
    uses: { surface: 0.85, seat: 0.55 },
    effects: { money: -18, curiosity: -3, energy: 2, fun: 2 }, skill: "building", activity: "working", needsLight: true,
    caption: (target) => target?.feature === "seat" ? `Working on a laptop ${target.on}` : `Working ${target?.on}`,
  },
  exercise: {
    uses: { load: 1, padding: 0.85 }, bare: 0.5,
    effects: { fitness: -28, energy: 4, hygiene: 8, fun: -3 }, skill: "fitness", activity: "stretching",
    caption: (target) => !target ? "Doing a bodyweight workout" : target.feature === "load" ? `Training with the ${target.label}` : `Stretching ${target.on}`,
  },
  wash: {
    uses: { water: 1 },
    effects: { hygiene: -45, energy: -2, fun: -2 }, skill: "selfCare", activity: "idle",
    caption: (target) => `Freshening up ${(target?.quality ?? 0) >= 0.9 ? "in" : "at"} the ${target?.label}`,
  },
  groom: {
    uses: { reflection: 1 },
    effects: { hygiene: -15, fun: -3 }, skill: "selfCare", activity: "idle",
    caption: (target) => `Getting ready at the ${target?.label}`,
  },
  tend: {
    uses: { greenery: 1 },
    effects: { fun: -8, curiosity: -5 }, skill: "selfCare", activity: "idle",
    caption: (target) => `Tending the ${target?.label}`,
  },
  gaze: {
    uses: { view: 1 },
    effects: { fun: -8, curiosity: -8 }, activity: "idle",
    caption: (target) => `Looking out of the ${target?.label}`,
  },
  tinker: {
    uses: { tools: 1, vehicle: 0.8 },
    effects: { curiosity: -14, money: -6, fun: -8, hygiene: 3 }, skill: "building", activity: "working", needsLight: true,
    caption: (target) => target?.feature === "vehicle" ? `Tinkering with the ${target.label}` : `Tinkering at the ${target?.label}`,
  },
  idle: {
    uses: {}, bare: 1,
    effects: { fun: -4 }, activity: "idle",
    caption: () => "Having a quiet moment",
  },
};

const READ: Omit<VerbSpec, "uses" | "caption"> = {
  effects: { curiosity: -20, fun: -6 }, skill: "reading", activity: "reading", needsLight: true,
};
/** Places to settle with a book, by feature. Standing at the shelf is always possible. */
const READ_SEATS: Partial<Record<ObjectFeature, number>> = { seat: 1, bed: 0.9, surface: 0.6 };
const READ_AT_SHELF = 0.5;

/** Dark outside: lamps matter and daylight is gone. */
export function isDark(hour: number): boolean {
  return hour < 7 || hour >= 19;
}

/** The body sleeps more deeply in the small hours than in the afternoon. */
function sleepDepth(hour: number): number {
  return hour >= 21 || hour < 7 ? 1 : 0.4;
}

function objectRoom(object: LifeObject, world: WorldState): RoomId {
  return world.objects[object.id]?.room ?? object.room;
}

/** Facts about each room computed once per listing: lighting, pleasantness, and walking distance. */
interface RoomFacts {
  hour: number;
  dark: boolean;
  lit: Set<RoomId>;
  ambience: Map<RoomId, number>;
  index: Map<RoomId, number>;
  names: Map<RoomId, string>;
}

function roomFacts(context: ToolContext): RoomFacts {
  const dark = isDark(context.hour);
  const lit = new Set<RoomId>();
  const views = new Set<RoomId>();
  const greenery = new Map<RoomId, number>();
  for (const object of context.environment.objects) {
    const room = objectRoom(object, context.world);
    if ((object.features.light ?? 0) > 0 && context.world.objects[object.id]?.powered === true) lit.add(room);
    if ((object.features.view ?? 0) > 0) views.add(room);
    if ((object.features.greenery ?? 0) > 0) greenery.set(room, (greenery.get(room) ?? 0) + 1);
  }
  const ambience = new Map<RoomId, number>();
  const index = new Map<RoomId, number>();
  const names = new Map<RoomId, string>();
  for (const room of context.environment.rooms) {
    const daylight = !dark && views.has(room.id) ? 0.5 : 0;
    const plants = Math.min(0.3, (greenery.get(room.id) ?? 0) * 0.15);
    const lamp = dark && lit.has(room.id) ? 0.2 : 0;
    ambience.set(room.id, Math.min(1, daylight + plants + lamp));
    index.set(room.id, room.index);
    names.set(room.id, room.name.toLowerCase());
  }
  return { hour: context.hour, dark, lit, ambience, index, names };
}

function distance(facts: RoomFacts, from: RoomId, to: RoomId): number {
  return Math.abs((facts.index.get(from) ?? 0) - (facts.index.get(to) ?? 0));
}

function hasRoom(object: LifeObject, context: ToolContext): boolean {
  return (context.occupancy?.[object.id] ?? 0) < object.capacity;
}

function bestFeature(object: LifeObject, uses: Partial<Record<ObjectFeature, number>>): { feature: ObjectFeature; quality: number } | undefined {
  let best: { feature: ObjectFeature; quality: number } | undefined;
  for (const [feature, weight] of Object.entries(uses) as [ObjectFeature, number][]) {
    const quality = (object.features[feature] ?? 0) * weight;
    if (quality > 0 && (!best || quality > best.quality)) best = { feature, quality };
  }
  return best;
}

function captionTarget(object: LifeObject, feature: ObjectFeature, quality: number): CaptionTarget {
  // Prepositions follow the object's form: in a car, at a desk or counter, on a sofa or bed.
  const preposition = (object.features.vehicle ?? 0) > 0 ? "in" : (object.features.surface ?? 0) > 0 ? "at" : "on";
  return { label: object.label, feature, quality, on: `${preposition} the ${object.label}` };
}

function scaledEffects(effects: NeedChanges, quality: number, reliefScale = 1): NeedChanges {
  const result: NeedChanges = {};
  for (const [name, change] of Object.entries(effects) as [NeedName, number][]) {
    result[name] = change < 0 ? Math.round(change * quality * reliefScale * 100) / 100 : change;
  }
  return result;
}

interface ToolDraft {
  verb: ToolVerb;
  spec: Omit<VerbSpec, "uses" | "caption">;
  object?: LifeObject;
  room: RoomId;
  params: ToolParams;
  quality: number;
  distance: number;
  caption: string;
}

function finish(draft: ToolDraft, facts: RoomFacts): LifeTool {
  const lit = facts.lit.has(draft.room);
  let quality = draft.quality;
  if (draft.spec.needsLight && facts.dark && !lit) quality *= 0.7;
  if (draft.verb === "gaze" && facts.dark) quality *= 0.5;
  // A lit lamp makes it harder to sleep; deep night sleep restores more energy.
  const reliefScale = draft.verb === "sleep" ? sleepDepth(facts.hour) * (lit ? 0.8 : 1) : 1;
  let id = `${draft.verb}:${draft.object?.id ?? `here-${draft.room}`}`;
  if (draft.params.at) id += `:at-${draft.params.at}`;
  if (draft.params.carryTo) id += `:to-${draft.params.carryTo}`;
  const caption = draft.params.carryTo ? `${draft.caption} in the ${facts.names.get(draft.params.carryTo) ?? draft.params.carryTo}` : draft.caption;
  return {
    id,
    verb: draft.verb,
    ...(draft.object ? { objectId: draft.object.id } : {}),
    room: draft.room,
    params: { ...draft.params },
    minutes: draft.verb === "switchOn" || draft.verb === "switchOff" ? SWITCH_MINUTES : HOUR_MINUTES,
    hinted: draft.object ? draft.object.hints.some((hint) => hint.use === draft.verb) : false,
    quality: Math.round(quality * 1_000) / 1_000,
    effects: scaledEffects(draft.spec.effects, quality, reliefScale),
    ...(draft.spec.skill ? { skill: draft.spec.skill } : {}),
    distance: draft.distance,
    ambience: facts.ambience.get(draft.room) ?? 0,
    activity: draft.spec.activity,
    caption,
  };
}

/** Rooms a tool can happen in: where the object is, or anywhere it can be carried. */
function placements(object: LifeObject, context: ToolContext, facts: RoomFacts): { room: RoomId; params: ToolParams; distance: number }[] {
  const { environment, world } = context;
  const here = objectRoom(object, world);
  const reach = distance(facts, world.location, here);
  const result = [{ room: here, params: {}, distance: reach }];
  if (!object.carryable) return result;
  for (const room of environment.rooms) {
    if (room.id !== here) result.push({ room: room.id, params: { carryTo: room.id }, distance: reach + distance(facts, here, room.id) });
  }
  return result;
}

/**
 * List every tool the home physically allows right now. Objects that are absent,
 * full, or lack the needed feature expose nothing; bare tools, such as resting
 * on the floor or a quiet moment, are available in every room.
 */
export function availableTools(context: ToolContext): LifeTool[] {
  const { environment, world } = context;
  const facts = roomFacts(context);
  const tools: LifeTool[] = [];
  const usable = environment.objects.filter((object) => hasRoom(object, context));

  for (const [verb, spec] of Object.entries(VERBS) as [keyof typeof VERBS, VerbSpec][]) {
    for (const object of usable) {
      const best = bestFeature(object, spec.uses);
      if (!best) continue;
      for (const place of placements(object, context, facts)) {
        tools.push(finish({ verb, spec, object, ...place, quality: best.quality, caption: spec.caption(captionTarget(object, best.feature, best.quality)) }, facts));
      }
    }
    if (spec.bare !== undefined) {
      for (const room of environment.rooms) {
        tools.push(finish({
          verb, spec, room: room.id, params: {}, quality: spec.bare, distance: distance(facts, world.location, room.id), caption: spec.caption(undefined),
        }, facts));
      }
    }
  }

  for (const shelf of usable.filter((object) => (object.features.books ?? 0) > 0)) {
    const shelfRoom = objectRoom(shelf, world);
    const toShelf = distance(facts, world.location, shelfRoom);
    tools.push(finish({
      verb: "read", spec: READ, object: shelf, room: shelfRoom, params: {}, quality: READ_AT_SHELF * (shelf.features.books ?? 0),
      distance: toShelf, caption: `Browsing the ${shelf.label}`,
    }, facts));
    for (const seat of usable) {
      const best = bestFeature(seat, READ_SEATS);
      if (!best || seat.id === shelf.id) continue;
      const seatRoom = objectRoom(seat, world);
      tools.push(finish({
        verb: "read", spec: READ, object: shelf, room: seatRoom, params: { at: seat.id }, quality: best.quality * (shelf.features.books ?? 0),
        distance: toShelf + distance(facts, shelfRoom, seatRoom), caption: `Reading ${captionTarget(seat, best.feature, best.quality).on}`,
      }, facts));
    }
  }

  for (const object of usable.filter((item) => item.switchable)) {
    const powered = world.objects[object.id]?.powered === true;
    const verb: ToolVerb = powered ? "switchOff" : "switchOn";
    const spec = { effects: {}, activity: "idle" as const };
    const places = powered ? placements(object, context, facts).slice(0, 1) : placements(object, context, facts);
    for (const place of places) {
      tools.push(finish({ verb, spec, object, ...place, quality: 1, caption: `${powered ? "Switching off" : "Switching on"} the ${object.label}` }, facts));
    }
  }
  return tools;
}

/** Apply a tool's physical effects: the agent walks there, carried objects move, switches flip. */
export function applyToolToWorld(tool: LifeTool, world: WorldState): WorldState {
  const objects = { ...world.objects };
  if (tool.objectId) {
    const current = objects[tool.objectId];
    if (current) {
      const next = { ...current };
      if (tool.params.carryTo) next.room = tool.params.carryTo;
      if (tool.verb === "switchOn") next.powered = true;
      if (tool.verb === "switchOff") next.powered = false;
      objects[tool.objectId] = next;
    }
  }
  return { location: tool.room, objects };
}
