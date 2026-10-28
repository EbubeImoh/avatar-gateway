# @shubur/life

Pure TypeScript simulation helpers for an agent's needs, routines, apartment environment, and local activity. No network connection or language model is required for the simulation.

```ts
import { createLifeSimulation } from "@shubur/life";

const life = createLifeSimulation({ agentId: "local:avatar", seed: "avatar-seed" });
```

This package is licensed under Apache-2.0.
