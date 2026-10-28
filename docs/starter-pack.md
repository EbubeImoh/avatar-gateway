# Shubur Starter Apartment

Have you ever wondered what your agent would be doing if it had a life of its own?

`@avatar-gateway/starter-apartment` is a generic multi-room apartment for an avatar. Rooms and objects describe the physical home; a connected life engine supplies one current activity. The apartment does not define a routine.

The package source is a generic derivative of the author's portfolio apartment experience. Its code and artwork are Apache-2.0; see the package [README](../packages/starter-apartment/README.md) and repository [LICENSE](../LICENSE).

## Install

```bash
npm install @avatar-gateway/starter-apartment
```

The package is in this v0.2 source tree; npm publication is still pending.

## React

```tsx
import { Avatar } from "@avatar-gateway/sdk";
import { ApartmentScene } from "@avatar-gateway/starter-apartment/react";

export function AvatarHome() {
  return (
    <ApartmentScene
      config={{ avatar: { name: "My Avatar" }, timeZone: "Africa/Lagos" }}
      onAvatarMount={(element) => Avatar.mount(element, { backend: "/avatar-gateway" })}
    />
  );
}
```

The apartment updates its lighting, exposes accessible room buttons, and cleans up the mounted `Avatar` widget when it unmounts.

## Plain script

```html
<div id="apartment"></div>
<div id="avatar-widget"></div>
<script type="module">
  import { mount } from "/node_modules/@avatar-gateway/starter-apartment/dist/index.js";
  import { Avatar } from "/node_modules/@avatar-gateway/sdk/dist/index.js";
  globalThis.Avatar = Avatar;

  const apartment = mount("#apartment", {
    avatar: { name: "My Avatar" },
    gateway: { selector: "#avatar-widget", backendUrl: "/avatar-gateway" },
  });
  // Call apartment.destroy() when removing the page scene.
</script>
```

The example uses a development/static server that exposes the installed package paths. A bundler can import the package names directly.

## Configuration

`ApartmentConfig` is typed and all fields are optional. Defaults use a neutral avatar name and styling, a Lagos timezone, and seven rooms: studio, living room, kitchen, bedroom, bathroom, gym, and garage. No activity is supplied by the apartment itself.

```ts
import type { ApartmentConfig } from "@avatar-gateway/starter-apartment";

const config: ApartmentConfig = {
  avatar: {
    name: "My Avatar",
    skinTone: "#d99b63",
    hairColor: "#252b31",
    outfitColor: "#4361b5",
    trouserColor: "#34464d",
    accessories: ["glasses"],
  },
  layout: {
    startRoom: "studio",
    rooms: [
      { id: "studio", name: "Studio", furniture: ["window", "desk", "bookshelf"] },
      { id: "living", name: "Living room", furniture: ["sofa", "coffeeTable", "plant"] },
    ],
  },
  furniture: { desk: true, plant: false },
  props: [
    { id: "studio-lamp", room: "studio", kind: "floorLamp", label: "Reading lamp", x: 72, y: 46, scale: 0.8 },
  ],
  room: { wallColor: "#ddd9cb", accentColor: "#597b72" },
  lighting: { ambientNightColor: "#182036", nightDimOpacity: 0.42, glowColor: "#ffe7a3" },
  timeZone: "Europe/London",
};
```

Rooms must have unique supported IDs. A custom room layout may be smaller than the default. A connected activity source chooses its current room from the rooms it can use. Colors are six-digit hex. Prop positions are percentages; labels are rendered as escaped text.

### Configuration fields

| Field | Purpose |
|---|---|
| `avatar` | Name, skin/hair/outfit/trouser colors, and accessories |
| `layout` | Starting room and an ordered list of room IDs, names, colors, and furniture |
| `furniture` | Global on/off flags for supported furniture kinds |
| `props` | Extra labelled items with room, position, scale, and color |
| `room` | Shared wall, floor, accent, and window colors |
| `lighting` | Day/night ambient colors, dim opacity, and glow color |
| `timeZone` | IANA timezone used for local lighting |
| `gateway` | Plain-DOM `Avatar.mount` selector and same-origin backend path |
| `assetCredits` | Attribution for custom assets |

## License

The starter package is Apache-2.0. “LEGO” is a trademark of the LEGO Group, which does not sponsor or endorse this project; the avatar artwork is original and brick-inspired.
