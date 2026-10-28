# @avatar-gateway/avatar-runtime

TypeScript primitives for an avatar persona, privacy-aware context, and language model providers.

```ts
import { AvatarRuntime, MockProvider } from "@avatar-gateway/avatar-runtime";

const avatar = new AvatarRuntime(
  {
    agentName: "Mira",
    ownerDisplayName: "Sam",
    tone: "warm and concise",
    knowledge: [{ id: "hobby", visibility: "public", text: "Mira enjoys gardening." }],
  },
  new MockProvider(),
);

const reply = await avatar.agentChat("What do you enjoy?");
```

Agent-world context includes only public knowledge and wraps incoming text as untrusted data. The package currently includes OpenAI-compatible, Anthropic, and mock providers; provider credentials belong on the owner's backend. This package is licensed under Apache-2.0.
