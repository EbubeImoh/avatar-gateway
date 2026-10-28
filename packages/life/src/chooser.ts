/**
 * The decision boundary. A LifeChooser sees the agent's needs, traits, mood,
 * the time, and the tools the home physically offers, and picks one. The
 * simulation enforces physics: a choice that is not among the offered tools is
 * replaced by a bare fallback, so a chooser can never use an absent object.
 *
 * Layer 1 ships UtilityChooser, a seeded, deterministic scorer. Layer 2 can swap
 * in an LLM-backed chooser with memory behind the same interface.
 */

import type { RoomId } from "@avatar-gateway/starter-apartment";
import type { LifeEnvironment } from "./environment.js";
import type { LifeTool, ToolVerb } from "./tools.js";
import type { LifeActivity, LifeMood, NeedName, NeedState, SkillState, TraitName, TraitState } from "./types.js";
import { NEED_NAMES, clampLevel } from "./types.js";

export interface LifeChoiceContext {
  now: Date;
  /** Local hour, 0–23. */
  hour: number;
  needs: Readonly<NeedState>;
  traits: Readonly<TraitState>;
  skills: Readonly<SkillState>;
  mood: Readonly<LifeMood>;
  /** What the agent was doing during the hour that just ended. */
  current: Readonly<LifeActivity>;
  location: RoomId;
  environment: Readonly<LifeEnvironment>;
  /** Only tools the home physically allows right now. */
  tools: readonly LifeTool[];
  /** Minutes left in this hour; tools shorter than this leave time for another choice. */
  minutesLeft: number;
  /** Seeded random source. Choosers must not use Math.random if replays should match. */
  random(): number;
  /** Tools that would be available after using `tool`, for choosers that look ahead. */
  preview(tool: LifeTool): readonly LifeTool[];
}

export interface LifeChoice {
  toolId: string;
  /** Hours the chooser intends to keep at it, from 1 to 12. Defaults to 1. */
  hours?: number;
  /** Optional score or confidence, kept on the activity for inspection. */
  score?: number;
}

export interface LifeChooser {
  readonly name: string;
  choose(context: LifeChoiceContext): LifeChoice;
}

/** How each trait inclines the agent toward a verb. These shape preference, never requirement. */
const AFFINITY: Partial<Record<ToolVerb, Partial<Record<TraitName, number>>>> = {
  work: { conscientiousness: 0.8, curiosity: 0.15 },
  tinker: { curiosity: 0.5, playfulness: 0.3 },
  read: { curiosity: 0.8 },
  exercise: { resilience: 0.4, conscientiousness: 0.3 },
  relax: { playfulness: 0.6 },
  gaze: { curiosity: 0.3, playfulness: 0.2 },
  tend: { conscientiousness: 0.3, playfulness: 0.2 },
  wash: { conscientiousness: 0.4 },
  groom: { conscientiousness: 0.3 },
  sleep: { resilience: 0.2 },
};

const HINT_BONUS = 0.35;
const WALK_COST = 0.12;
const CARRY_COST = 0.25;
const AMBIENCE_WEIGHT = 0.4;
const COMMITMENT_BONUS = 2.5;
const SWITCH_COST = 0.15;
const MIN_USEFUL_RELIEF = 0.2;
/** A need this pressing interrupts plans that do nothing for it. */
const URGENT = 90;
const MAX_HOURS = 9;
const LOOKAHEAD_CANDIDATES = 3;
/** Tools relieving less than this per hour are pastimes done for about an hour. */
const GENTLE_RELIEF = 10;

/** Convex discomfort: an urgent need hurts far more than two half-urgent ones. */
function discomfort(level: number): number {
  return (level / 100) ** 2 * 10;
}

function relief(tool: LifeTool, needs: Readonly<NeedState>): number {
  let total = 0;
  for (const name of NEED_NAMES) {
    const change = tool.effects[name] ?? 0;
    total += discomfort(needs[name]) - discomfort(clampLevel(needs[name] + change));
  }
  return total;
}

function affinity(verb: ToolVerb, traits: Readonly<TraitState>): number {
  const weights = AFFINITY[verb] ?? {};
  let total = 0;
  for (const [trait, weight] of Object.entries(weights) as [TraitName, number][]) total += (traits[trait] / 100) * weight;
  return total;
}

function continues(tool: LifeTool, current: Readonly<LifeActivity>): boolean {
  return tool.verb === current.id && tool.objectId === current.objectId && tool.room === current.room
    && current.elapsedHours < current.plannedHours;
}

/** Pressing needs that some available tool could relieve. Needs nothing here can help, such as social at home, do not count. */
export function urgentNeeds(context: Pick<LifeChoiceContext, "needs" | "tools">): Set<NeedName> {
  const urgent = new Set<NeedName>();
  for (const name of NEED_NAMES) {
    if (context.needs[name] >= URGENT && context.tools.some((tool) => (tool.effects[name] ?? 0) < 0)) urgent.add(name);
  }
  return urgent;
}

function ignoresUrgentNeed(tool: LifeTool, urgent: ReadonlySet<NeedName>): boolean {
  for (const name of urgent) if ((tool.effects[name] ?? 0) >= 0) return true;
  return false;
}

/** Score a tool without randomness: need relief, personality, comfort, effort, and momentum. */
export function utilityOf(
  tool: LifeTool,
  context: Pick<LifeChoiceContext, "needs" | "traits" | "current">,
  urgent: ReadonlySet<NeedName> = new Set(),
): number {
  const needRelief = relief(tool, context.needs);
  let score = needRelief + affinity(tool.verb, context.traits);
  if (tool.hinted) score += HINT_BONUS;
  if (tool.verb !== "sleep") score += tool.ambience * AMBIENCE_WEIGHT;
  score -= tool.distance * WALK_COST + (tool.params.carryTo ? CARRY_COST : 0);
  // Momentum only while the activity still helps and nothing it ignores has become urgent.
  if (needRelief > MIN_USEFUL_RELIEF && continues(tool, context.current) && !ignoresUrgentNeed(tool, urgent)) score += COMMITMENT_BONUS;
  return score;
}

/**
 * Hours to stay with a tool: until the need it relieves most would be about met,
 * within the agent's attention span. Gentle pastimes are done for a while, not all
 * afternoon; sleep is limited only by the body.
 */
function plannedHours(tool: LifeTool, context: Pick<LifeChoiceContext, "needs" | "traits">): number {
  let primary: { level: number; change: number; gain: number } | undefined;
  for (const name of NEED_NAMES) {
    const change = tool.effects[name] ?? 0;
    if (change >= 0) continue;
    const gain = discomfort(context.needs[name]) - discomfort(clampLevel(context.needs[name] + change));
    if (!primary || gain > primary.gain) primary = { level: context.needs[name], change, gain };
  }
  if (!primary) return 1;
  const hours = Math.floor(primary.level / -primary.change);
  if (tool.verb === "sleep") return Math.max(1, Math.min(MAX_HOURS, hours));
  if (-primary.change < GENTLE_RELIEF) return 1;
  const span = 1 + Math.round(context.traits.conscientiousness / 33);
  return Math.max(1, Math.min(span, hours));
}

function bestMain(tools: readonly LifeTool[], context: LifeChoiceContext, urgent: ReadonlySet<NeedName>): number {
  let best = Number.NEGATIVE_INFINITY;
  for (const tool of tools) if (tool.minutes >= 60) best = Math.max(best, utilityOf(tool, context, urgent));
  return best;
}

function topRooms(tools: readonly LifeTool[], context: LifeChoiceContext, urgent: ReadonlySet<NeedName>): RoomId[] {
  return tools.filter((tool) => tool.minutes >= 60)
    .map((tool) => ({ room: tool.room, score: utilityOf(tool, context, urgent) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, LOOKAHEAD_CANDIDATES)
    .map((item) => item.room);
}

/**
 * Layer 1 chooser: picks the highest-utility tool with seeded noise whose size
 * follows the agent's playfulness and curiosity. Short tools such as a light
 * switch are valued by one step of look-ahead: what they make better next.
 */
export class UtilityChooser implements LifeChooser {
  readonly name = "utility";

  choose(context: LifeChoiceContext): LifeChoice {
    const urgent = urgentNeeds(context);
    const candidates = context.tools.filter((tool) => tool.minutes < 60 && tool.minutes < context.minutesLeft);
    if (candidates.length) {
      // Only look ahead at quick tools in the rooms the agent is already drawn to.
      const drawnTo = new Set(topRooms(context.tools, context, urgent));
      const quick = candidates.filter((tool) => drawnTo.has(tool.room));
      const now = bestMain(context.tools, context, urgent);
      let pick: { tool: LifeTool; gain: number } | undefined;
      for (const tool of quick) {
        const gain = bestMain(context.preview(tool), context, urgent) - now - SWITCH_COST - tool.distance * WALK_COST;
        if (gain > 0 && (!pick || gain > pick.gain)) pick = { tool, gain };
      }
      if (pick) return { toolId: pick.tool.id, hours: 1, score: round(pick.gain) };
    }

    const temperature = 0.6 + ((context.traits.playfulness + context.traits.curiosity) / 200) * 0.8;
    let chosen: LifeTool | undefined;
    let best = Number.NEGATIVE_INFINITY;
    for (const tool of context.tools) {
      if (tool.minutes < 60) continue;
      const score = utilityOf(tool, context, urgent) + (context.random() - 0.5) * temperature;
      if (score > best) {
        chosen = tool;
        best = score;
      }
    }
    if (!chosen) return { toolId: context.tools[0]?.id ?? "", hours: 1, score: 0 };
    return { toolId: chosen.id, hours: plannedHours(chosen, context), score: round(best) };
  }
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
