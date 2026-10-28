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
  | "sofa" | "island" | "sink" | "shower" | "mirror" | "weights" | "mat" | "car" | "toolShelf";

export interface ApartmentRoom {
  id: RoomId;
  name: string;
  /** Furniture and props to draw in this room. Global furniture flags can hide any item. */
  furniture: FurnitureKind[];
  wallColor?: string;
  floorColor?: string;
}

export interface ApartmentLayout {
  /** Room shown when no routine activity specifies a room. */
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
}

export type DayPeriod = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

export interface DayActivity {
  /** 24-hour local start time, inclusive. */
  startHour: number;
  /** 24-hour local end time, exclusive; 24 is allowed for the final interval. */
  endHour: number;
  activity: AvatarActivity;
  caption: string;
  room?: RoomId;
}

/** Supplies a complete, validated daily routine from an autonomous life engine. */
export interface DayActivitySource {
  getDayActivities(now: Date): DayActivity[];
}

export type AvatarActivity = "sleeping" | "waking" | "coffee" | "working" | "reading" | "stretching" | "idle" | "walking";

export interface DayCycleConfig {
  enabled: boolean;
  timezone: string;
  activities: DayActivity[];
}

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
  lighting?: Partial<LightingConfig>;
  dayCycle?: Partial<DayCycleConfig>;
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
  dayCycle: DayCycleConfig;
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
};

export const DEFAULT_LAYOUT: ApartmentLayout = {
  startRoom: "studio",
  rooms: [
    { id: "studio", name: "Studio", furniture: ["window", "plant", "desk", "bookshelf"] },
    { id: "living", name: "Living room", furniture: ["window", "plant", "sofa", "coffeeTable", "floorLamp"] },
    { id: "kitchen", name: "Kitchen", furniture: ["window", "island", "plant"] },
    { id: "bedroom", name: "Bedroom", furniture: ["window", "bed", "bookshelf", "floorLamp"] },
    { id: "bathroom", name: "Bathroom", furniture: ["sink", "shower", "mirror"] },
    { id: "gym", name: "Gym", furniture: ["window", "weights", "mat"] },
    { id: "garage", name: "Garage", furniture: ["car", "toolShelf"] },
  ],
};

export const DEFAULT_LIGHTING: LightingConfig = {
  ambientDayColor: "#fff3d2",
  ambientNightColor: "#182036",
  nightDimOpacity: 0.42,
  glowColor: "#ffe7a3",
};

/** A generic daily routine inspired by the author's portfolio apartment. */
export const DEFAULT_ACTIVITIES: DayActivity[] = [
  { startHour: 0, endHour: 6, activity: "sleeping", caption: "Sound asleep", room: "bedroom" },
  { startHour: 6, endHour: 7, activity: "waking", caption: "Waking up slowly", room: "bedroom" },
  { startHour: 7, endHour: 9, activity: "coffee", caption: "Making a cup of coffee", room: "kitchen" },
  { startHour: 9, endHour: 13, activity: "working", caption: "A focused work session", room: "studio" },
  { startHour: 13, endHour: 14, activity: "idle", caption: "Taking a lunch break", room: "kitchen" },
  { startHour: 14, endHour: 18, activity: "working", caption: "Back to building things", room: "studio" },
  { startHour: 18, endHour: 19, activity: "stretching", caption: "Time to stretch", room: "gym" },
  { startHour: 19, endHour: 21, activity: "reading", caption: "Reading for a while", room: "living" },
  { startHour: 21, endHour: 23, activity: "idle", caption: "Winding down for the day", room: "living" },
  { startHour: 23, endHour: 24, activity: "sleeping", caption: "Heading to bed", room: "bedroom" },
];

export const DEFAULT_DAY_CYCLE: DayCycleConfig = {
  enabled: true,
  timezone: "Africa/Lagos",
  activities: DEFAULT_ACTIVITIES,
};
