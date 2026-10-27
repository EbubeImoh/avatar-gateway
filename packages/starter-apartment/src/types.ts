/**
 * @avatar-gateway/starter-apartment — typed configuration for the apartment scene.
 *
 * Defaults replicate the "lives its day" apartment from Ebube Imoh's portfolio
 * (https://www.ebubeimoh.com/) — a Lego-style brick avatar at a desk in Lagos.
 * Swap any value through ApartmentConfig to build your own scene.
 *
 * Asset licence: the default avatar SVG and room artwork are original, created
 * for avatar-gateway (Apache-2.0). Any assets you add must be your own or
 * openly licensed; note their licence in your config's `assetCredits` field.
 */

export interface AvatarLook {
  /** Skin-tone hex color (default: warm amber #ffd466 matching the landing page art). */
  skinTone: string;
  /** Hair color hex (default: #172320 dark). */
  hairColor: string;
  /** Primary outfit/shirt color hex (default: #315bff blue). */
  outfitColor: string;
  /** Trousers/lower-body color hex (default: #27352f dark green). */
  trouserColor: string;
  /** Accessories: "glasses" | "headphones" | "hat" | "none". */
  accessories: AvatarAccessory[];
  /** Display name shown in captions. */
  name: string;
}

export type AvatarAccessory = "glasses" | "headphones" | "hat" | "none";

export interface RoomTheme {
  /** Wall color hex (default: #f0ecd8 warm off-white). */
  wallColor: string;
  /** Floor color hex (default: #c9b98a warm wood). */
  floorColor: string;
  /** Accent / trim color hex (default: #315bff blue, matching the avatar). */
  accentColor: string;
  /** Window daylight tint (default: #eafacc pale green-yellow, like the landing art). */
  windowDaytimeColor: string;
  /** Window night tint (default: #1a1f35 deep navy). */
  windowNightColor: string;
}

export interface FurnitureConfig {
  desk: boolean;
  bed: boolean;
  bookshelf: boolean;
  plant: boolean;
  window: boolean;
  /** Floor lamp in the corner. */
  floorLamp: boolean;
  /** Small coffee table. */
  coffeeTable: boolean;
}

export type DayPeriod = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

export interface DayActivity {
  /** 24-hour local time start (0–23). */
  startHour: number;
  /** 24-hour local time end (0–23, exclusive). */
  endHour: number;
  /** Machine-readable activity key. */
  activity: AvatarActivity;
  /** Human-readable caption shown under the scene. */
  caption: string;
}

export type AvatarActivity =
  | "sleeping"
  | "waking"
  | "coffee"
  | "working"
  | "reading"
  | "stretching"
  | "idle"
  | "walking";

export interface DayCycleConfig {
  /** Enable automatic activity switching based on local time. Default: true. */
  enabled: boolean;
  /** IANA timezone for interpreting the local time. Default: "Africa/Lagos". */
  timezone: string;
  /** Activities in order. Earlier startHour wins. */
  activities: DayActivity[];
}

export interface GatewayMount {
  /** If set, Avatar.mount is called after the scene renders with this selector. */
  selector: string;
  /** Backend URL passed to Avatar.mount (e.g. "/avatar-gateway"). */
  backendUrl: string;
}

export interface ApartmentConfig {
  avatar?: Partial<AvatarLook>;
  room?: Partial<RoomTheme>;
  furniture?: Partial<FurnitureConfig>;
  dayCycle?: Partial<DayCycleConfig>;
  /** If provided, Avatar.mount is wired up after the scene renders. */
  gateway?: GatewayMount;
  /** Free-form licence notes for any custom assets you add. */
  assetCredits?: string;
}

/** Fully-resolved config after merging with defaults. */
export interface ResolvedApartmentConfig {
  avatar: AvatarLook;
  room: RoomTheme;
  furniture: FurnitureConfig;
  dayCycle: DayCycleConfig;
  gateway?: GatewayMount;
  assetCredits?: string;
}

/** The ebube-inspired default schedule (WAT = UTC+1, Africa/Lagos). */
export const DEFAULT_ACTIVITIES: DayActivity[] = [
  { startHour: 0, endHour: 6,  activity: "sleeping",   caption: "Sound asleep"           },
  { startHour: 6, endHour: 7,  activity: "waking",     caption: "Rising slowly"           },
  { startHour: 7, endHour: 9,  activity: "coffee",     caption: "Morning coffee"          },
  { startHour: 9, endHour: 13, activity: "working",    caption: "Deep work session"       },
  { startHour: 13, endHour: 14, activity: "idle",      caption: "Lunch break"             },
  { startHour: 14, endHour: 18, activity: "working",   caption: "Building things"         },
  { startHour: 18, endHour: 19, activity: "stretching", caption: "End-of-day stretch"     },
  { startHour: 19, endHour: 21, activity: "reading",   caption: "Reading time"            },
  { startHour: 21, endHour: 23, activity: "idle",      caption: "Winding down"            },
  { startHour: 23, endHour: 24, activity: "sleeping",  caption: "Off to sleep"            },
];

export const DEFAULT_AVATAR_LOOK: AvatarLook = {
  skinTone: "#ffd466",
  hairColor: "#172320",
  outfitColor: "#315bff",
  trouserColor: "#27352f",
  accessories: ["none"],
  name: "Your avatar",
};

export const DEFAULT_ROOM_THEME: RoomTheme = {
  wallColor: "#f0ecd8",
  floorColor: "#c9b98a",
  accentColor: "#315bff",
  windowDaytimeColor: "#eafacc",
  windowNightColor: "#1a1f35",
};

export const DEFAULT_FURNITURE: FurnitureConfig = {
  desk: true,
  bed: true,
  bookshelf: true,
  plant: true,
  window: true,
  floorLamp: true,
  coffeeTable: false,
};

export const DEFAULT_DAY_CYCLE: DayCycleConfig = {
  enabled: true,
  timezone: "Africa/Lagos",
  activities: DEFAULT_ACTIVITIES,
};
