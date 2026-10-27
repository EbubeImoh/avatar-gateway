/**
 * Framework detection for the avatar-gateway CLI init command.
 * Reads package.json deps from the target directory.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type DetectedFramework = "nextjs" | "react-vite" | "vite" | "react" | "plain-html" | "unknown";

export async function detectFramework(cwd: string): Promise<DetectedFramework> {
  try {
    const raw = await readFile(join(cwd, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if ("next" in deps) return "nextjs";
    if ("vite" in deps && "react" in deps) return "react-vite";
    if ("vite" in deps) return "vite";
    if ("react" in deps) return "react";
    return "plain-html";
  } catch {
    return "plain-html";
  }
}

export interface ScaffoldFiles {
  /** Map of relative file path → file content to write. */
  files: Record<string, string>;
  /** npm packages to install. */
  packages: string[];
  /** Post-install instructions. */
  instructions: string[];
}

/**
 * Returns the scaffold files for a given framework.
 * Generates minimal, working code that mounts the apartment + Avatar.mount.
 */
export function buildScaffold(framework: DetectedFramework, avatarName: string, backendPath: string): ScaffoldFiles {
  const common = {
    packages: [
      "@avatar-gateway/sdk",
      "@avatar-gateway/starter-apartment",
    ],
    instructions: [
      `Set your AI provider key: export OPENAI_API_KEY=sk-... (or ANTHROPIC_API_KEY)`,
      `Start the gateway: npx @avatar-gateway/gateway`,
      `Read docs/getting-started.md for next steps`,
    ],
  };

  switch (framework) {
    case "nextjs":
      return {
        ...common,
        files: {
          "app/avatar/page.tsx": `"use client";
import { ApartmentScene } from "@avatar-gateway/starter-apartment/react";
export default function AvatarPage() {
  return <ApartmentScene config={{ avatar: { name: ${JSON.stringify(avatarName)} } }} />;
}`,
          "app/avatar-gateway/route.ts": `import { createAvatarGatewayRoute } from "@avatar-gateway/sdk/next";
export const { GET, POST } = createAvatarGatewayRoute({ backend: ${JSON.stringify(backendPath)} });`,
        },
      };

    case "react-vite":
    case "react":
      return {
        ...common,
        files: {
          "src/AvatarHome.tsx": `import { ApartmentScene } from "@avatar-gateway/starter-apartment/react";
export function AvatarHome() {
  return <ApartmentScene config={{ avatar: { name: ${JSON.stringify(avatarName)} } }} />;
}`,
        },
      };

    case "vite":
    case "plain-html":
    default:
      return {
        ...common,
        files: {
          "avatar.html": `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><title>${avatarName} · Home</title></head>
<body>
  <div id="apartment"></div>
  <script type="module">
    import { mount } from "@avatar-gateway/starter-apartment";
    import { Avatar } from "@avatar-gateway/sdk";
    mount("#apartment", { avatar: { name: ${JSON.stringify(avatarName)} }, gateway: { selector: "#avatar", backendUrl: ${JSON.stringify(backendPath)} } });
  </script>
</body>
</html>`,
        },
      };
  }
}
