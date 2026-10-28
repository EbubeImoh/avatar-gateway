/** Typed configuration for the generic Shubur Starter Apartment. */

export interface AvatarLook {
  skinTone: string;
  hairColor: string;
  outfitColor: string;
  trouserColor: string;
  accessories: AvatarAccessory[];
  name: string;
}

export type AvatarAccessory = "glasses" | "headphones" | "hat" | "none";

export interface RoomTheme {
  wallColor: string;
  floorColor: string;
  accentColor: string;
  windowDaytimeColor: string;
  windowNightColor: string;
}

export type RoomId = "studio" | "living" | "kitchen" | "bedroom" | "bathroom" | "gym" | "garage";

export type FurnitureKind =
  | "desk" | "bed" | "bookshelf" | "plant" | "window" | "floorLamp" | "coffeeTable"
  | "sofa" | "island" | "sink" | "shower" | "mirror" | "weights" | "mat" | "car" | "toolShelf" | "phone";

export interface ApartmentRoom {
  id: RoomId;
  name: string;
  /** Furniture and props to draw in this room. Global furniture flags can hide any item. */
  furniture: FurnitureKind[];
  wallColor?: string;
  floorColor?: string;
}

export interface ApartmentLayout {
  /** Room shown when no live activity source is attached. */
  startRoom: RoomId;
  /** Ordered room list shown in the navigation controls. */
  rooms: ApartmentRoom[];
}

export interface ApartmentProp {
  id: string;
  room: RoomId;
  kind: FurnitureKind;
  label: string;
  /** Position inside the room, as a percentage from 0 to 100. */
  x: number;
  y: number;
  scale?: number;
  color?: string;
}

export type ApartmentTypeId = "studio" | "starter-flat" | "one-bedroom" | "high-rise";

/** A physical object placed in one apartment type. It carries no behaviour or routine. */
export interface ApartmentTypeObject extends ApartmentProp {}

export interface ApartmentTypeDefinition {
  id: ApartmentTypeId;
  label: string;
  name: string;
  /** Rooms are physical spaces only; the object's room determines where it exists. */
  rooms: ApartmentRoom[];
  objects: ApartmentTypeObject[];
  startRoom: RoomId;
}

export interface FurnitureConfig extends Record<FurnitureKind, boolean> {
  desk: boolean;
  bed: boolean;
  bookshelf: boolean;
  plant: boolean;
  window: boolean;
  floorLamp: boolean;
  coffeeTable: boolean;
  sofa: boolean;
  island: boolean;
  sink: boolean;
  shower: boolean;
  mirror: boolean;
  weights: boolean;
  mat: boolean;
  car: boolean;
  toolShelf: boolean;
  phone: boolean;
}

export type DayPeriod = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

export interface HomeActivity {
  activity: AvatarActivity;
  caption: string;
  room?: RoomId;
}

/** Supplies the single activity the autonomous life engine chose for now. */
export interface HomeActivitySource {
  getCurrentActivity(now: Date): HomeActivity;
}

export type AvatarActivity = "sleeping" | "waking" | "coffee" | "working" | "reading" | "stretching" | "idle" | "walking";

export interface LightingConfig {
  ambientDayColor: string;
  ambientNightColor: string;
  nightDimOpacity: number;
  glowColor: string;
}

export interface GatewayMount {
  /** Selector for the existing element where Avatar.mount should render. */
  selector: string;
  /** Same-origin backend path passed to Avatar.mount. */
  backendUrl: string;
}

export interface ApartmentConfig {
  /** Display name for this home, such as "Ada's Loft". Defaults to "Starter Apartment". */
  name?: string;
  avatar?: Partial<AvatarLook>;
  room?: Partial<RoomTheme>;
  furniture?: Partial<FurnitureConfig>;
  layout?: Partial<ApartmentLayout>;
  props?: ApartmentProp[];
  timeZone?: string;
  lighting?: Partial<LightingConfig>;
  gateway?: GatewayMount;
  assetCredits?: string;
}

export interface ResolvedApartmentConfig {
  name: string;
  avatar: AvatarLook;
  room: RoomTheme;
  furniture: FurnitureConfig;
  layout: ApartmentLayout;
  props: ApartmentProp[];
  lighting: LightingConfig;
  timeZone: string;
  gateway?: GatewayMount;
  assetCredits?: string;
}

export const DEFAULT_PLACE_NAME = "Starter Apartment";

export const DEFAULT_AVATAR_LOOK: AvatarLook = {
  skinTone: "#d99b63",
  hairColor: "#252b31",
  outfitColor: "#4361b5",
  trouserColor: "#34464d",
  accessories: [],
  name: "My Avatar",
};

export const DEFAULT_ROOM_THEME: RoomTheme = {
  wallColor: "#ddd9cb",
  floorColor: "#ad9875",
  accentColor: "#597b72",
  windowDaytimeColor: "#b7d7dc",
  windowNightColor: "#222f4d",
};

export const DEFAULT_FURNITURE: FurnitureConfig = {
  desk: true,
  bed: true,
  bookshelf: true,
  plant: true,
  window: true,
  floorLamp: true,
  coffeeTable: true,
  sofa: true,
  island: true,
  sink: true,
  shower: true,
  mirror: true,
  weights: true,
  mat: true,
  car: true,
  toolShelf: true,
  phone: true,
};

export const DEFAULT_LAYOUT: ApartmentLayout = {
  startRoom: "studio",
  rooms: [
    { id: "studio", name: "Studio", furniture: ["window", "plant", "desk", "bookshelf", "phone"] },
    { id: "living", name: "Living room", furniture: ["window", "plant", "sofa", "coffeeTable", "floorLamp"] },
    { id: "kitchen", name: "Kitchen", furniture: ["window", "island", "plant"] },
    { id: "bedroom", name: "Bedroom", furniture: ["window", "bed", "bookshelf", "floorLamp"] },
    { id: "bathroom", name: "Bathroom", furniture: ["sink", "shower", "mirror"] },
    { id: "gym", name: "Gym", furniture: ["window", "weights", "mat"] },
    { id: "garage", name: "Garage", furniture: ["car", "toolShelf"] },
  ],
};

/** Four object-only home types. Life tools are derived from these objects by @shubur/life. */
export const APARTMENT_TYPES: Readonly<Record<ApartmentTypeId, Readonly<ApartmentTypeDefinition>>> = {
  studio: {
    id: "studio", label: "Studio", name: "Studio apartment", startRoom: "studio",
    rooms: [
      { id: "studio", name: "Main room", furniture: [] },
      { id: "bathroom", name: "Bathroom", furniture: [] },
    ],
    objects: [
      { id: "bed-area", room: "studio", kind: "bed", label: "Bed area", x: 20, y: 68 },
      { id: "kitchenette", room: "studio", kind: "island", label: "Kitchenette", x: 68, y: 24 },
      { id: "sofa", room: "studio", kind: "sofa", label: "Sofa", x: 68, y: 70 },
      { id: "desk", room: "studio", kind: "desk", label: "Desk", x: 25, y: 24 },
      { id: "phone", room: "studio", kind: "phone", label: "Phone", x: 48, y: 46 },
      { id: "shower", room: "bathroom", kind: "shower", label: "Shower", x: 40, y: 30 },
      { id: "bathroom-sink", room: "bathroom", kind: "sink", label: "Sink", x: 65, y: 60 },
    ],
  },
  "starter-flat": {
    id: "starter-flat", label: "Starter flat", name: "Starter flat", startRoom: "living",
    rooms: [
      { id: "living", name: "Living room", furniture: [] },
      { id: "kitchen", name: "Kitchenette", furniture: [] },
      { id: "bathroom", name: "Bathroom", furniture: [] },
    ],
    objects: [
      { id: "sofa", room: "living", kind: "sofa", label: "Sofa", x: 52, y: 62 },
      { id: "bed-area", room: "living", kind: "bed", label: "Bed area", x: 23, y: 35 },
      { id: "phone", room: "living", kind: "phone", label: "Phone", x: 71, y: 42 },
      { id: "kitchen-counter", room: "kitchen", kind: "island", label: "Kitchen counter", x: 48, y: 45 },
      { id: "kitchen-sink", room: "kitchen", kind: "sink", label: "Sink", x: 70, y: 28 },
      { id: "shower", room: "bathroom", kind: "shower", label: "Shower", x: 38, y: 36 },
    ],
  },
  "one-bedroom": {
    id: "one-bedroom", label: "One-bedroom", name: "One-bedroom apartment", startRoom: "living",
    rooms: [
      { id: "living", name: "Living room", furniture: [] },
      { id: "bedroom", name: "Bedroom", furniture: [] },
      { id: "kitchen", name: "Kitchen", furniture: [] },
      { id: "bathroom", name: "Bathroom", furniture: [] },
    ],
    objects: [
      { id: "sofa", room: "living", kind: "sofa", label: "Sofa", x: 50, y: 58 },
      { id: "phone", room: "living", kind: "phone", label: "Phone", x: 72, y: 40 },
      { id: "bed", room: "bedroom", kind: "bed", label: "Bed", x: 46, y: 52 },
      { id: "desk", room: "bedroom", kind: "desk", label: "Desk", x: 72, y: 25 },
      { id: "kitchen-counter", room: "kitchen", kind: "island", label: "Kitchen counter", x: 48, y: 45 },
      { id: "shower", room: "bathroom", kind: "shower", label: "Shower", x: 38, y: 36 },
      { id: "bathroom-sink", room: "bathroom", kind: "sink", label: "Sink", x: 70, y: 62 },
    ],
  },
  "high-rise": {
    id: "high-rise", label: "High-rise", name: "High-rise apartment", startRoom: "living",
    rooms: [
      { id: "living", name: "Living room", furniture: [] },
      { id: "bedroom", name: "Bedroom", furniture: [] },
      { id: "kitchen", name: "Kitchen", furniture: [] },
      { id: "bathroom", name: "Bathroom", furniture: [] },
      { id: "gym", name: "Fitness room", furniture: [] },
    ],
    objects: [
      { id: "sofa", room: "living", kind: "sofa", label: "Sofa", x: 46, y: 58 },
      { id: "phone", room: "living", kind: "phone", label: "Phone", x: 72, y: 40 },
      { id: "bed", room: "bedroom", kind: "bed", label: "Bed", x: 46, y: 52 },
      { id: "desk", room: "bedroom", kind: "desk", label: "Desk", x: 72, y: 25 },
      { id: "bookshelf", room: "living", kind: "bookshelf", label: "Bookshelf", x: 23, y: 35 },
      { id: "kitchen-counter", room: "kitchen", kind: "island", label: "Kitchen counter", x: 48, y: 45 },
      { id: "shower", room: "bathroom", kind: "shower", label: "Shower", x: 38, y: 36 },
      { id: "weights", room: "gym", kind: "weights", label: "Weights", x: 50, y: 55 },
      { id: "exercise-mat", room: "gym", kind: "mat", label: "Exercise mat", x: 58, y: 68 },
    ],
  },
};

export function apartmentTypeConfig(id: ApartmentTypeId): ApartmentConfig {
  const type = APARTMENT_TYPES[id];
  return {
    name: type.name,
    layout: { startRoom: type.startRoom, rooms: type.rooms.map((room) => ({ ...room, furniture: [...room.furniture] })) },
    props: type.objects.map((object) => ({ ...object })),
  };
}

export const DEFAULT_LIGHTING: LightingConfig = {
  ambientDayColor: "#fff3d2",
  ambientNightColor: "#182036",
  nightDimOpacity: 0.42,
  glowColor: "#ffe7a3",
};

/** Local timezone used for ambient lighting. */
export const DEFAULT_TIME_ZONE = "Africa/Lagos";
