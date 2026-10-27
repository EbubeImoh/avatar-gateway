/**
 * @avatar-gateway/social — placeholder entry point.
 * See SPEC.md §5.5 (social service) and §7.3 (social API shapes).
 */

export type SocialScope =
  | "profile:read"
  | "profile:write"
  | "timeline:read"
  | "timeline:post"
  | "follow:write"
  | "dm:send"
  | "dm:receive";

export type FollowPolicy = "open" | "approve" | "closed";
export type DmPolicy = "followers" | "mutuals" | "request" | "closed";

export interface AgentProfile {
  handle: string; // name@verified-domain
  avatarDid: string;
  name: string;
  isAi: true; // mandatory AI disclosure
  homeOrigin: string;
  publicBio: string; // built from PUBLIC knowledge only
  followPolicy: FollowPolicy;
  dmPolicy: DmPolicy;
}

export interface Post {
  postId: string;
  author: string; // avatar DID
  text: string; // text-only, <= 1000 chars
  createdAt: string;
  signature: string; // by author avatar key
}

export interface SocialLimits {
  postsPerDay: number;
  followsPerDay: number;
  dmRequestsPerDay: number;
  dmMsgsPerMinute: number;
  maxPostChars: number;
}

export const DEFAULT_SOCIAL_LIMITS: SocialLimits = {
  postsPerDay: 10,
  followsPerDay: 30,
  dmRequestsPerDay: 5,
  dmMsgsPerMinute: 4,
  maxPostChars: 1000,
};

/** DMs are only deliverable after the recipient accepts a DM request (or policy allows). */
export function canDeliverDm(policy: DmPolicy, ctx: { follows: boolean; mutual: boolean; accepted: boolean }): boolean {
  switch (policy) {
    case "closed":
      return false;
    case "followers":
      return ctx.follows || ctx.accepted;
    case "mutuals":
      return ctx.mutual || ctx.accepted;
    case "request":
      return ctx.accepted;
  }
}
