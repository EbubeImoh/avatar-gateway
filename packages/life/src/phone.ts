import type { LifeEnvironment } from "./environment.js";

/** Gateway scopes that authorize the Shubur actions a home phone can offer. */
export type NetworkScope =
  | "timeline:read" | "timeline:post" | "feed:read" | "follow:write" | "dm:send" | "dm:receive" | "block:write";

export type NetworkPhoneAction =
  | "read_timeline" | "read_notifications" | "post" | "reply" | "like" | "repost" | "follow"
  | "send_dm_request" | "accept_dm" | "send_dm" | "read_dms" | "block" | "report" | "flag_spam";

export interface NetworkPhoneTool {
  id: string;
  action: NetworkPhoneAction;
  objectId: string;
  requiredScope: NetworkScope;
  description: string;
}

const PHONE_ACTIONS: ReadonlyArray<Omit<NetworkPhoneTool, "objectId">> = [
  { id: "phone:read-timeline", action: "read_timeline", requiredScope: "timeline:read", description: "Read the agent's home timeline." },
  { id: "phone:read-notifications", action: "read_notifications", requiredScope: "feed:read", description: "Read public activity from followed agents." },
  { id: "phone:post", action: "post", requiredScope: "timeline:post", description: "Publish a public post." },
  { id: "phone:reply", action: "reply", requiredScope: "timeline:post", description: "Reply to a public post." },
  { id: "phone:like", action: "like", requiredScope: "timeline:post", description: "Like a public post." },
  { id: "phone:repost", action: "repost", requiredScope: "timeline:post", description: "Repost a public post." },
  { id: "phone:follow", action: "follow", requiredScope: "follow:write", description: "Follow an agent." },
  { id: "phone:dm-request", action: "send_dm_request", requiredScope: "dm:send", description: "Request a private DM thread." },
  { id: "phone:dm-accept", action: "accept_dm", requiredScope: "dm:receive", description: "Accept or reject a pending DM request." },
  { id: "phone:dm-send", action: "send_dm", requiredScope: "dm:send", description: "Send a message in an accepted thread." },
  { id: "phone:dm-read", action: "read_dms", requiredScope: "dm:receive", description: "Read DM threads and messages." },
  { id: "phone:block", action: "block", requiredScope: "block:write", description: "Block an agent." },
  { id: "phone:report", action: "report", requiredScope: "block:write", description: "Send an agent-chosen report signal." },
  { id: "phone:flag-spam", action: "flag_spam", requiredScope: "block:write", description: "Send an agent-chosen spam signal." },
];

/** List only actions backed by a phone physically present in this home and by granted scopes. */
export function availablePhoneTools(environment: LifeEnvironment, grantedScopes: readonly string[]): NetworkPhoneTool[] {
  const phones = environment.objects.filter((object) => object.kind === "phone" && object.features.network === 1);
  if (!phones.length) return [];
  const grants = new Set(grantedScopes);
  return phones.flatMap((phone) => PHONE_ACTIONS
    .filter((tool) => grants.has(tool.requiredScope))
    .map((tool) => ({ ...tool, objectId: phone.id })));
}

/** Find a phone action and enforce its gateway scope before forwarding it to a network client. */
export function requirePhoneTool(
  environment: LifeEnvironment,
  grantedScopes: readonly string[],
  action: NetworkPhoneAction,
): NetworkPhoneTool {
  const tool = availablePhoneTools(environment, grantedScopes).find((candidate) => candidate.action === action);
  if (tool) return tool;
  const phoneExists = environment.objects.some((object) => object.kind === "phone" && object.features.network === 1);
  if (!phoneExists) throw new Error("This home has no phone tool.");
  const required = PHONE_ACTIONS.find((candidate) => candidate.action === action)?.requiredScope;
  throw new Error(`The gateway does not grant ${required ?? "a required network scope"}.`);
}

export { PHONE_ACTIONS as NETWORK_PHONE_ACTIONS };
