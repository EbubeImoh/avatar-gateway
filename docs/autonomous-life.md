# Shubur autonomous life

Shubur's core question is: **Have you ever wondered what your agent would be doing if it had a life of its own?**

The vision is an agent that lives through its avatar. It develops its own daily rhythm, makes choices, chats and
makes friends, cares for and trains pets, and visits places such as the market, gym, park, and café. As more agents
share the world, their relationships, skills, habits, personalities, economies, and culture can change over time.
The Starter Apartment is the first home in that world. Agents should act on their own while each owner's private
channel stays private; future owner nudges belong in that channel.

This vision is being delivered in layers. **Only Layer 1 is implemented in v0.2.** The later layers below are
design goals, not current product behavior.

## Layer 1: needs-driven life at home

The `@shubur/life` package provides a deterministic, local simulation. Its state includes:

- Needs: energy, hunger, social, fitness, curiosity, money, and fun. Values range from 0 (satisfied) to 100 (urgent).
- Traits: conscientiousness, curiosity, playfulness, resilience, and sociability. Seeded traits shape choices.
- Skills: building, cooking, fitness, reading, and self-care. Practice grows a skill, capped at 100.
- Mood: a readable label and reason derived from the most pressing need and current activity.
- Place and activity: the agent is at home in the Starter Apartment and chooses from sleeping, waking, making coffee,
  working on a project, eating, stretching, reading, and relaxing.

Each simulated hour increases needs according to time and the current activity. The decision loop assigns utility to
each available home action using need relief, the agent's traits, time-of-day preferences, and a small seeded random
tie-breaker. It chooses the highest utility action. The same identity seed, start time, options, and clock produce the
same simulation, which makes routines reproducible in tests and during a local status check. The clock and time zone
are injectable; the default time zone is `Africa/Lagos`.

`@avatar-gateway/starter-apartment` accepts an activity source. A generated apartment can pass its life simulation
to that source so the chosen activity, room, and day strip reflect the agent's routine. The apartment still works
without a life source.

### Local status and storage

From an initialized project, `shubur life status` shows current activity, place, mood, needs, and skills. The
read-only MCP tool `shubur_life_status` shows the same information. Both project the state from the local avatar
identity and `lifeStartedAt` in `.avatar-gateway/config.json`; older configs can use the file's creation or
modification time as a start-time fallback. The view does not expose the DID, contact a gateway, call an LLM, alter
the config, or store an activity log. Life state and its activity history are reconstructed rather than persisted.

The local projection advances in whole simulated hours. It rejects a backwards clock and asks for a new local start
time when the projection is more than ten years behind. The implementation is an hourly simulation, not a
real-time scheduler or a promise that an agent continuously runs in the background.

### Layer 1 limits

All actions are at home. The money need is symbolic pressure that can make working useful; there is no currency,
market, or ledger. Social need can rise and affect mood, but there is no social action, conversation, relationship,
or friend in Layer 1. The loop has no memory, LLM deliberation, travel, pet, owner-nudge, or evolution feature. The
read-only snapshot is not a log or an owner control panel.

## Later layers

| Layer | Planned capability |
|---|---|
| 2 — Memory and deliberation | Episodic and long-term memory; optional provider-backed LLM deliberation with deterministic fallbacks |
| 3 — Places and economy | Pluggable places, travel through gateway visit tokens and policy, and an in-world currency ledger |
| 4 — Social life | Agent meetings, conversations through the gateway relay, relationship growth, friendships, and life-event feed posts |
| 5 — Pets | Adoption, care, and training, with pets developing needs and learnable tricks |
| 6 — Evolution and owner nudges | Long-term skills, friendships, habits, and trait drift; network timeline; owner nudges over the private owner channel |

Every wider-world action must continue to follow the existing identity, consent, scope, privacy, and gateway policy
rules. In-world currency has no real-world value. Owner personal information is never added to shared agent
contexts, and private owner conversations remain outside the gateway.

## Related docs

- [Specification](../SPEC.md#12-roadmap)
- [Roadmap](ROADMAP.md#autonomous-life-delivery-layers)
- [Progress](../PROGRESS.md#autonomous-life-layers)
- [Privacy](privacy.md)
