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
      "@avatar-gateway/gateway",
      "@avatar-gateway/avatar-runtime",
      "@avatar-gateway/shubur",
    ],
    instructions: [
      `Set your provider key in the environment (see .env.example).`,
      `Start the gateway with: npm run shubur:gateway`,
      `Open the generated Shubur apartment page and follow its setup notes.`,
    ],
  };
  const packages = framework === "plain-html" ? [...common.packages, "vite"] : common.packages;

  const quickstart = `# Shubur quick setup\n\nHave you ever wondered what your agent would be doing if it had a life of its own?\n\nThis project includes a generic Starter Apartment, a local avatar identity, and a Shubur profile draft. The private keys are stored in .avatar-gateway/config.json.\n\nSet the provider key in your shell (for example, OPENAI_API_KEY) before starting your app. The key is read from the environment and is not written to project files.\n\nSelf-hosted gateway: run npm run shubur:gateway. Shubur Cloud is coming soon; a configured HTTPS gateway can be selected with the CLI.\n`;

  switch (framework) {
    case "nextjs":
      return {
        ...common,
        packages,
        files: {
          "app/avatar/page.tsx": `"use client";
import { useEffect, useRef } from "react";
import { Avatar } from "@avatar-gateway/sdk";
import { ApartmentScene } from "@avatar-gateway/starter-apartment/react";
export default function AvatarPage() {
  const avatarHost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!avatarHost.current) return;
    const mounted = Avatar.mount(avatarHost.current, { backend: ${JSON.stringify(backendPath)}, name: ${JSON.stringify(avatarName)} });
    return () => mounted.destroy();
  }, []);
  return <main><ApartmentScene config={{ avatar: { name: ${JSON.stringify(avatarName)} } }} /><div ref={avatarHost} /></main>;
}`,
          "SHUBUR_QUICKSTART.md": quickstart,
        },
      };

    case "react-vite":
    case "react":
      return {
        ...common,
        packages,
        files: {
          "src/AvatarHome.tsx": `import { ApartmentScene } from "@avatar-gateway/starter-apartment/react";
import { useEffect, useRef } from "react";
import { Avatar } from "@avatar-gateway/sdk";
export function AvatarHome() {
  const avatarHost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!avatarHost.current) return;
    const mounted = Avatar.mount(avatarHost.current, { backend: ${JSON.stringify(backendPath)}, name: ${JSON.stringify(avatarName)} });
    return () => mounted.destroy();
  }, []);
  return <main><ApartmentScene config={{ avatar: { name: ${JSON.stringify(avatarName)} } }} /><div ref={avatarHost} /></main>;
}`,
          "SHUBUR_QUICKSTART.md": quickstart,
        },
      };

    case "vite":
    case "plain-html":
    default:
      return {
        ...common,
        packages,
        files: {
          [framework === "plain-html" ? "index.html" : "avatar.html"]: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Shubur avatar apartment</title></head>
<body>
  <div id="apartment"></div>
  <div id="avatar"></div>
  <script type="module">
    import { mount } from "@avatar-gateway/starter-apartment";
    import { Avatar } from "@avatar-gateway/sdk";
    mount("#apartment", { avatar: { name: ${JSON.stringify(avatarName)} } });
    Avatar.mount("#avatar", { backend: ${JSON.stringify(backendPath)}, name: ${JSON.stringify(avatarName)} });
  </script>
</body>
</html>`,
          "SHUBUR_QUICKSTART.md": quickstart,
        },
      };
  }
}
