/** Shared life types: the agent's body and mind, independent of any home layout. */

import type { HomeActivity, RoomId } from "@avatar-gateway/starter-apartment";
import type { LifeObjectState } from "./environment.js";
import type { ToolParams, ToolVerb } from "./tools.js";

export type NeedName = "energy" | "hunger" | "social" | "fitness" | "curiosity" | "money" | "fun" | "hygiene";
export type NeedState = Record<NeedName, number>;
export type NeedChanges = Partial<Record<NeedName, number>>;

export type TraitName = "conscientiousness" | "curiosity" | "playfulness" | "resilience" | "sociability";
export type TraitState = Record<TraitName, number>;

export type SkillName = "building" | "cooking" | "fitness" | "reading" | "selfCare";
export type SkillState = Record<SkillName, number>;

export type MoodLabel = "content" | "curious" | "focused" | "hungry" | "lonely" | "restless" | "tired";

export interface LifeMood {
  label: MoodLabel;
  reason: string;
}

/** The verb of the tool the agent is using. Kept as the activity id for older callers. */
export type LifeActivityId = ToolVerb;

export interface LifeActivity extends HomeActivity {
  id: LifeActivityId;
  room: RoomId;
  /** The tool chosen from those the home made available. */
  toolId: string;
  /** Object being used; absent for bare actions such as resting on the floor. */
  objectId?: string;
  params: ToolParams;
  /** Whether this is one of the object's usual uses. Unusual uses are allowed. */
  hinted: boolean;
  /** Need changes applied for each hour of this activity. */
  effects: NeedChanges;
  skill?: SkillName;
  /** Short actions taken before settling on this one, such as switching on a lamp. */
  preparations: string[];
  /** Hours the chooser intended to spend, and hours spent so far. */
  plannedHours: number;
  elapsedHours: number;
  startedAt: string;
  utility: number;
}

export interface AgentLifeState {
  version: 2;
  agentId: string;
  place: { id: "home"; name: string };
  /** Room the agent is in. */
  location: RoomId;
  /** Where each object is now and whether it is switched on. */
  objects: Record<string, LifeObjectState>;
  needs: NeedState;
  traits: TraitState;
  skills: SkillState;
  mood: LifeMood;
  currentActivity: LifeActivity;
  startedAt: string;
  lastUpdatedAt: string;
  simulatedHours: number;
}

export const NEED_NAMES: NeedName[] = ["energy", "hunger", "social", "fitness", "curiosity", "money", "fun", "hygiene"];
export const TRAIT_NAMES: TraitName[] = ["conscientiousness", "curiosity", "playfulness", "resilience", "sociability"];
export const SKILL_NAMES: SkillName[] = ["building", "cooking", "fitness", "reading", "selfCare"];

export function clampLevel(value: number): number {
  return Math.max(0, Math.min(100, value));
}
