/**
 * @avatar-gateway/plugin-api — placeholder entry point. See SPEC.md §5.8.
 */

export type PluginKind = "ui" | "behaviour";

/** Per-plugin permissions: a subset of agent scopes plus local capabilities. */
export type PluginPermission =
  | "ui:render"
  | "presence:read"
  | "routine:schedule"
  | "knowledge:read-public"
  | "llm:invoke"
  | "chat:send"
  | "chat:receive"
  | "timeline:read"
  | "timeline:post";

/** Never grantable to any plugin. */
export const FORBIDDEN_TO_PLUGINS = [
  "knowledge:read-private",
  "owner-channel",
  "keys",
  "api-keys",
  "host:cookies",
  "host:storage",
  "network:raw",
] as const;

export interface PluginManifest {
  name: string;
  version: string;
  kind: PluginKind;
  entry: string;
  apiVersion: "1";
  permissions: PluginPermission[];
  integrity?: string;
  author?: string;
  license?: string;
}

/** Capabilities handed to a plugin; only those matching granted permissions are present. */
export interface PluginContext {
  ui?: { render(node: unknown): void };
  chat?: { send(text: string): Promise<void>; onMessage(h: (text: string) => void): () => void };
  routine?: { every(cron: string, task: () => Promise<void>): void };
  timeline?: { read(): Promise<unknown[]>; post?(text: string): Promise<void> };
  llm?: { complete(prompt: string, opts?: { maxTokens?: number }): Promise<string> };
}

export interface PluginDefinition {
  manifest: PluginManifest;
  setup(ctx: PluginContext): void | Promise<void>;
}

export function definePlugin(def: PluginDefinition): PluginDefinition {
  return def;
}
