# Shubur Starter Apartment

Have you ever wondered what your agent would be doing if it had a life of its own?

The Starter Apartment gives an avatar a generic, multi-room home. Rooms and objects define the physical environment; a connected life engine chooses what the agent does. Choose rooms, furniture, props, colors, lighting, and timezone through a typed `ApartmentConfig`.

## Install

```bash
npm install @avatar-gateway/starter-apartment
```

The React component is available from `@avatar-gateway/starter-apartment/react`. React is an optional peer dependency; the plain DOM `mount()` works without it.

## React

```tsx
import { ApartmentScene } from "@avatar-gateway/starter-apartment/react";

export function AvatarHome() {
  return (
    <ApartmentScene
      config={{
        avatar: { name: "My Avatar", outfitColor: "#4968b8" },
        timeZone: "America/New_York",
      }}
    />
  );
}
```

To mount the `@avatar-gateway/sdk` widget in the scene, pass an `onAvatarMount` callback and return the widget's `destroy()` method:

```tsx
import { Avatar } from "@avatar-gateway/sdk";
import { ApartmentScene } from "@avatar-gateway/starter-apartment/react";

export function AvatarHome() {
  return (
    <ApartmentScene
      config={{ avatar: { name: "My Avatar" } }}
      onAvatarMount={(element) => Avatar.mount(element, { backend: "/avatar-gateway" })}
    />
  );
}
```

The component calls the returned widget's `destroy()` method when it unmounts.

## Plain DOM

```html
<div id="my-apartment"></div>
<div id="avatar-widget"></div>
<script type="module">
  import { mount } from "/node_modules/@avatar-gateway/starter-apartment/dist/index.js";
  import { Avatar } from "/node_modules/@avatar-gateway/sdk/dist/index.js";

  globalThis.Avatar = Avatar;

  const apartment = mount("#my-apartment", {
    avatar: { name: "My Avatar" },
    timeZone: "America/New_York",
    gateway: { selector: "#avatar-widget", backendUrl: "/avatar-gateway" },
  });

  // Call apartment.destroy() when removing the scene.
</script>
```

Serve the page from a development or static server that exposes `node_modules`; the module imports above use those paths for a no-bundler example. Adding `gateway: { selector, backendUrl }` mounts the SDK widget into the selected element and tears it down with `destroy()`.

`mount()` also takes an optional current activity source, such as a `@shubur/life` simulation, and display options:

```js
const apartment = mount("#my-apartment", { timeZone: "UTC" }, lifeSimulation, {
  followAvatar: true, // show the current room until the visitor picks one
  refreshMs: 1000, // re-render interval, 250 ms to 1 hour (default one minute)
  clock: () => new Date(), // inject a clock for previews
  onRender: ({ activity, room, period }) => console.log(activity.caption, room, period),
});
```

## Customize

```ts
import type { ApartmentConfig } from "@avatar-gateway/starter-apartment";

const config: ApartmentConfig = {
  avatar: { name: "My Avatar", accessories: ["glasses"], outfitColor: "#7356a8" },
  layout: {
    startRoom: "studio",
    rooms: [
      { id: "studio", name: "Studio", furniture: ["window", "desk", "plant"] },
      { id: "living", name: "Living room", furniture: ["sofa", "coffeeTable"] },
    ],
  },
  props: [
    { id: "studio-plant", room: "studio", kind: "plant", label: "Desk plant", x: 70, y: 45, color: "#597b72" },
  ],
  room: { accentColor: "#597b72" },
  timeZone: "Europe/London",
  lighting: { ambientNightColor: "#202a45", nightDimOpacity: 0.38 },
};
```

Colors use six-digit hex values. Names and captions are rendered as text, and configuration is validated before SVG generation.

## Portfolio source and license

This package is a generic derivative of the author's portfolio apartment experience. Personal names, photographs, projects, links, contact details, and private configuration have been removed. The starter's code and artwork are licensed under Apache-2.0; see the repository's [LICENSE](../../LICENSE). LEGO is a trademark of the LEGO Group, which does not sponsor or endorse this project.
