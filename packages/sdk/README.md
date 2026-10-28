# @avatar-gateway/sdk

A small browser widget for rendering an Avatar Gateway avatar card.

```ts
import { Avatar } from "@avatar-gateway/sdk";

const avatar = Avatar.mount("#avatar", {
  backend: "/avatar-gateway",
  name: "Mira",
  initialState: "idle",
});

avatar.setState("busy");
// Call avatar.destroy() when removing the widget.
```

`backend` must be a same-origin, root-relative path. The current widget renders its card and presence state locally; it does not yet send chat requests to that backend. No private key or provider key is included in browser code. This package is licensed under Apache-2.0.
