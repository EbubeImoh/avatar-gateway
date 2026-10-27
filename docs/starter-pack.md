# Starter Apartment

`@avatar-gateway/starter-apartment` is a drop-in apartment scene for your portfolio site — a Lego-style brick avatar living its day at a desk, recreating the "lives its day" concept from [Ebube Imoh's portfolio](https://www.ebubeimoh.com/).

The scene is fully customisable via a typed `ApartmentConfig`: change the avatar look, room colours, furniture, lighting, timezone, and day-cycle activities. It ships with a React component and a plain `mount()` function, and is designed to wire directly into `Avatar.mount` from `@avatar-gateway/sdk`.

## Installation

```bash
npm install @avatar-gateway/starter-apartment
```

React peer dependency is optional — the package works without React via the plain `mount()` API.

## Quick start

### React

```tsx
import { ApartmentScene } from '@avatar-gateway/starter-apartment/react';

export function MyPortfolio() {
  return (
    <ApartmentScene
      config={{
        avatar: { name: 'Mira', outfitColor: '#9b5de5' },
        dayCycle: { timezone: 'America/New_York' },
      }}
    />
  );
}
```

### Plain script tag

```html
<div id="my-apartment"></div>
<script src="node_modules/@avatar-gateway/starter-apartment/dist/index.js" type="module"></script>
<script type="module">
  import { mount } from '@avatar-gateway/starter-apartment';
  mount('#my-apartment', {
    avatar: { name: 'Mira' },
    dayCycle: { timezone: 'America/New_York' },
  });
</script>
```

### Wired to Avatar.mount

```ts
import { mount } from '@avatar-gateway/starter-apartment';

mount('#my-apartment', {
  avatar: { name: 'My Bot' },
  gateway: {
    selector: '#avatar-widget',
    backendUrl: '/avatar-gateway',
  },
});
```

## Configuration reference

### `ApartmentConfig`

All fields are optional — defaults reproduce Ebube's apartment (Lagos timezone, blue shirt, brick avatar at a desk).

| Field | Type | Description |
|-------|------|-------------|
| `avatar` | `Partial<AvatarLook>` | Avatar appearance |
| `room` | `Partial<RoomTheme>` | Wall/floor/accent colors |
| `furniture` | `Partial<FurnitureConfig>` | Toggle furniture items on/off |
| `dayCycle` | `Partial<DayCycleConfig>` | Day-cycle activities and timezone |
| `gateway` | `GatewayMount` | Wire `Avatar.mount` after render |
| `assetCredits` | `string` | Licence notes for custom assets |

### `AvatarLook`

```ts
{
  skinTone: string;        // hex, default: #ffd466 (warm amber)
  hairColor: string;       // hex, default: #172320 (dark)
  outfitColor: string;     // hex, default: #315bff (blue)
  trouserColor: string;    // hex, default: #27352f (dark green)
  accessories: AvatarAccessory[]; // "glasses" | "headphones" | "hat" | "none"
  name: string;            // caption name
}
```

### `RoomTheme`

```ts
{
  wallColor: string;             // default: #f0ecd8
  floorColor: string;            // default: #c9b98a
  accentColor: string;           // default: #315bff
  windowDaytimeColor: string;    // default: #eafacc
  windowNightColor: string;      // default: #1a1f35
}
```

### `FurnitureConfig`

```ts
{
  desk: boolean;       // default: true
  bed: boolean;        // default: true
  bookshelf: boolean;  // default: true
  plant: boolean;      // default: true
  window: boolean;     // default: true
  floorLamp: boolean;  // default: true
  coffeeTable: boolean; // default: false
}
```

### `DayCycleConfig`

```ts
{
  enabled: boolean;       // default: true — auto-switch by local time
  timezone: string;       // IANA, default: "Africa/Lagos"
  activities: DayActivity[];
}

interface DayActivity {
  startHour: number;  // 0–23
  endHour: number;    // 0–23 exclusive
  activity: AvatarActivity;
  caption: string;
}

type AvatarActivity =
  | "sleeping" | "waking" | "coffee" | "working"
  | "reading" | "stretching" | "idle" | "walking";
```

Default activities cover the full 24-hour day with a Lagos developer's schedule.

## Day cycle

When `dayCycle.enabled` is `true` (default), the scene reads the current time in the configured timezone and picks the matching activity from `activities`. The React component updates every minute; the plain `mount()` function does too.

The scene also adjusts the room's ambient light (window colour, lamp glow, night overlay) based on the time of day.

## Customising activities

Replace the full `activities` array to define your own schedule:

```ts
import { mount } from '@avatar-gateway/starter-apartment';

mount('#home', {
  dayCycle: {
    timezone: 'Europe/London',
    activities: [
      { startHour: 0,  endHour: 8,  activity: 'sleeping',  caption: 'Offline' },
      { startHour: 8,  endHour: 12, activity: 'working',   caption: 'Morning build' },
      { startHour: 12, endHour: 13, activity: 'idle',      caption: 'Lunch' },
      { startHour: 13, endHour: 18, activity: 'working',   caption: 'Afternoon build' },
      { startHour: 18, endHour: 24, activity: 'reading',   caption: 'Evening' },
    ],
  },
});
```

## Asset licences

The default avatar SVG and room artwork are original, created for avatar-gateway and licensed Apache-2.0. They are directly inspired by the brick/minifig art style on Ebube Imoh's portfolio.

"LEGO" is a trademark of the LEGO Group, which does not sponsor or endorse this project.

If you supply custom assets, note their licence in `config.assetCredits`.

## API surface

```ts
// Headless helpers (no DOM required)
resolveConfig(config: ApartmentConfig): ResolvedApartmentConfig
buildSceneSvg(config: ResolvedApartmentConfig, now?: Date): { svg: string; activity: DayActivity; period: DayPeriod }
currentActivity(activities: DayActivity[], timezone: string, now?: Date): DayActivity
dayPeriod(timezone: string, now?: Date): DayPeriod
localHour(timezone: string, now?: Date): number
activityCssClass(activity: AvatarActivity): string

// Plain DOM
mount(selector: string, config?: ApartmentConfig): () => void  // returns cleanup

// React
<ApartmentScene config={...} now={...} onAvatarMount={...} className={...} style={...} />
```
