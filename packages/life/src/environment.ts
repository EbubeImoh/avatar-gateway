/**
 * The physical home an agent lives in, derived from the owner's ApartmentConfig.
 *
 * Only object physics are fixed here: size, capacity, whether it can be carried,
 * which physical features it has, and switchable state. Each object may also
 * carry soft hints about what it is usually for. Hints never require or forbid a
 * use; the chooser is free to use any object for anything its features allow,
 * or to ignore it entirely.
 */

import { resolveConfig } from "@avatar-gateway/starter-apartment";
import type { ApartmentConfig, FurnitureKind, RoomId } from "@avatar-gateway/starter-apartment";
import type { ToolVerb } from "./tools.js";

/** Physical features an object offers. Values are 0–1 suitability. */
export type ObjectFeature =
  | "bed" | "seat" | "surface" | "food" | "water" | "books" | "light" | "view"
  | "load" | "padding" | "vehicle" | "tools" | "greenery" | "reflection";

export type ObjectSize = "small" | "medium" | "large";

/** A soft, overridable note about what an object is usually used for. */
export interface SoftHint {
  use: ToolVerb;
  note: string;
}

export interface ObjectPhysics {
  size: ObjectSize;
  /** How many agents can use the object at the same time. */
  capacity: number;
  /** Small enough to pick up, take to another room, and put down there. */
  carryable: boolean;
  /** Has an on/off switch. */
  switchable: boolean;
  features: Partial<Record<ObjectFeature, number>>;
}

export interface LifeObject extends ObjectPhysics {
  id: string;
  kind: FurnitureKind;
  label: string;
  /** Room the object starts in. Carryable objects may move; see the world state. */
  room: RoomId;
  hints: SoftHint[];
}

export interface LifeRoom {
  id: RoomId;
  name: string;
  /** Position in the layout. Rooms are treated as a corridor in this order for walking distance. */
  index: number;
}

export interface LifeEnvironment {
  placeName: string;
  startRoom: RoomId;
  rooms: LifeRoom[];
  objects: LifeObject[];
}

/** Mutable physical state of objects in the home. */
export interface LifeObjectState {
  room: RoomId;
  powered?: boolean;
}

interface CatalogEntry extends ObjectPhysics {
  label: string;
  hints: SoftHint[];
}

/** Physics and soft hints for each furniture kind the Starter Apartment can draw. */
export const OBJECT_CATALOG: Readonly<Record<FurnitureKind, Readonly<CatalogEntry>>> = {
  desk: {
    label: "desk", size: "large", capacity: 1, carryable: false, switchable: false,
    features: { surface: 1, seat: 0.8 },
    hints: [{ use: "work", note: "usually where focused work happens" }],
  },
  bed: {
    label: "bed", size: "large", capacity: 2, carryable: false, switchable: false,
    features: { bed: 1, seat: 0.6 },
    hints: [{ use: "sleep", note: "usually for a night's sleep" }],
  },
  bookshelf: {
    label: "bookshelf", size: "medium", capacity: 1, carryable: false, switchable: false,
    features: { books: 1 },
    hints: [{ use: "read", note: "usually holds books to read" }],
  },
  plant: {
    label: "plant", size: "small", capacity: 1, carryable: true, switchable: false,
    features: { greenery: 1 },
    hints: [{ use: "tend", note: "usually watered and looked after" }],
  },
  window: {
    label: "window", size: "medium", capacity: 2, carryable: false, switchable: false,
    features: { view: 1 },
    hints: [{ use: "gaze", note: "usually for light and a view outside" }],
  },
  floorLamp: {
    label: "floor lamp", size: "medium", capacity: 1, carryable: true, switchable: true,
    features: { light: 1 },
    hints: [],
  },
  coffeeTable: {
    label: "coffee table", size: "medium", capacity: 2, carryable: false, switchable: false,
    features: { surface: 0.55 },
    hints: [{ use: "relax", note: "usually holds drinks while relaxing" }],
  },
  sofa: {
    label: "sofa", size: "large", capacity: 3, carryable: false, switchable: false,
    features: { seat: 1, bed: 0.7 },
    hints: [{ use: "relax", note: "usually for sitting back and relaxing" }],
  },
  island: {
    label: "kitchen island", size: "large", capacity: 2, carryable: false, switchable: false,
    features: { surface: 0.75, food: 1, water: 0.4 },
    hints: [{ use: "eat", note: "usually where meals are made and eaten" }],
  },
  sink: {
    label: "sink", size: "small", capacity: 1, carryable: false, switchable: false,
    features: { water: 0.5 },
    hints: [{ use: "wash", note: "usually for washing up" }],
  },
  shower: {
    label: "shower", size: "medium", capacity: 1, carryable: false, switchable: false,
    features: { water: 1 },
    hints: [{ use: "wash", note: "usually for a shower" }],
  },
  mirror: {
    label: "mirror", size: "small", capacity: 1, carryable: false, switchable: false,
    features: { reflection: 1 },
    hints: [{ use: "groom", note: "usually for getting ready" }],
  },
  weights: {
    label: "weights", size: "small", capacity: 1, carryable: true, switchable: false,
    features: { load: 1 },
    hints: [{ use: "exercise", note: "usually for strength training" }],
  },
  mat: {
    label: "exercise mat", size: "small", capacity: 1, carryable: true, switchable: false,
    features: { padding: 0.85, bed: 0.45 },
    hints: [{ use: "exercise", note: "usually for stretching" }],
  },
  car: {
    label: "car", size: "large", capacity: 4, carryable: false, switchable: false,
    features: { seat: 0.6, vehicle: 1 },
    hints: [{ use: "tinker", note: "usually driven; trips away from home arrive in a later layer" }],
  },
  toolShelf: {
    label: "tool shelf", size: "medium", capacity: 1, carryable: false, switchable: false,
    features: { tools: 1 },
    hints: [{ use: "tinker", note: "usually for fixing and building things" }],
  },
};

function fromCatalog(id: string, kind: FurnitureKind, room: RoomId, label?: string): LifeObject {
  const entry = OBJECT_CATALOG[kind];
  return {
    id,
    kind,
    label: label ?? entry.label,
    room,
    size: entry.size,
    capacity: entry.capacity,
    carryable: entry.carryable,
    switchable: entry.switchable,
    features: { ...entry.features },
    hints: entry.hints.map((hint) => ({ ...hint })),
  };
}

/**
 * Build the agent's home from the same ApartmentConfig that draws the apartment.
 * Rooms and furniture the owner removed simply do not exist for the agent.
 */
export function buildEnvironment(config: ApartmentConfig = {}): LifeEnvironment {
  const resolved = resolveConfig(config);
  const rooms = resolved.layout.rooms.map((room, index) => ({ id: room.id, name: room.name, index }));
  const objects: LifeObject[] = [];
  for (const room of resolved.layout.rooms) {
    for (const kind of room.furniture) {
      if (resolved.furniture[kind]) objects.push(fromCatalog(`${room.id}-${kind}`, kind, room.id));
    }
  }
  for (const prop of resolved.props) objects.push(fromCatalog(`prop-${prop.id}`, prop.kind, prop.room, prop.label));
  return { placeName: resolved.name, startRoom: resolved.layout.startRoom, rooms, objects };
}

export function initialObjectStates(environment: LifeEnvironment): Record<string, LifeObjectState> {
  const states: Record<string, LifeObjectState> = {};
  for (const object of environment.objects) {
    states[object.id] = object.switchable ? { room: object.room, powered: false } : { room: object.room };
  }
  return states;
}
