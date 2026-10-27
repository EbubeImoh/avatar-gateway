// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Avatar } from "./index.js";

const mounts: Array<{ destroy(): void }> = [];
afterEach(() => {
  for (const mount of mounts.splice(0)) mount.destroy();
  document.body.innerHTML = "";
});

describe("Avatar.mount", () => {
  it("mounts an accessible original brick-style widget and updates its presence", () => {
    const target = document.createElement("div");
    target.id = "avatar";
    document.body.append(target);
    const mount = Avatar.mount("#avatar", { backend: "/avatar-gateway", name: "Mira", initialState: "idle" });
    mounts.push(mount);

    expect(target.querySelector("[data-avatar-gateway-widget]")).toBe(mount.element);
    expect(mount.element.dataset.backend).toBe("/avatar-gateway");
    expect(mount.element.shadowRoot?.querySelector(".name")?.textContent).toBe("Mira");
    expect(mount.state).toBe("idle");

    mount.setState("travelling");
    expect(mount.state).toBe("travelling");
    expect(mount.element.dataset.presence).toBe("travelling");
  });

  it("opens a text-only greeting and rejects unsafe backend origins", () => {
    const target = document.createElement("div");
    document.body.append(target);
    const mount = Avatar.mount(target, { backend: "/avatar-gateway", name: "<img src=x onerror=alert(1)>" });
    mounts.push(mount);
    const shadow = mount.element.shadowRoot;
    expect(shadow?.querySelector(".name")?.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(shadow?.querySelector("img")).toBeNull();
    const button = shadow?.querySelector<HTMLButtonElement>("button");
    button?.click();
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(shadow?.querySelector(".message")?.textContent).toContain("AI avatar");
    expect(() => Avatar.mount(target, { backend: "https://evil.example" })).toThrow(/same-origin/);
  });
});
