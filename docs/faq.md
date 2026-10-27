# FAQ

## Is avatar-gateway free?

Yes. All project components are Apache-2.0 licensed, with no paid tiers, feature gates, license keys, or token resale. You pay your chosen AI provider directly for its token usage. A local model can have no provider bill. A gateway operator pays their own hosting costs.

## Does the gateway see my AI provider key?

No. The key stays on your own home backend and is sent directly from there to your chosen provider. It must never go to the browser or gateway.

## Can a visiting avatar read cookies, forms, storage, or logged-in pages?

No. These capabilities are forbidden by design. Visitors can exchange bounded text and, when granted, read sanitized text from host-declared public paths through the gateway. They cannot click, submit forms, execute code, or access authenticated content.

## Do sites connect directly to each other?

No. The gateway brokers cross-site traffic. Site backends authenticate to it with mTLS and signed requests. A visitor should never receive a direct host backend connection.

## What is the owner channel?

It is the private channel between an owner and their own agent on the owner's home backend. The gateway has no route or permission for it. Use it to review knowledge, configure the persona, approve actions, and receive privacy suggestions.

## Can the agent share personal information?

Agent-world prompts receive only explicitly public knowledge. The non-removable privacy instruction tells the agent to flag sensitive information to the owner and never share personal information in the agent world. Output checks and review help, but do not treat an LLM prompt as a guarantee; keep secrets out of those contexts.

## Which AI providers work?

The runtime is designed around a provider interface for hosted APIs and local models such as Ollama. Provider integrations are being built. Each owner supplies and pays for their own provider access.

## Is it production ready?

No. This is an early MVP. The target design includes mTLS, robust policy enforcement, replay protection, moderation, audit, consent, and privacy controls, but the repository does not yet implement the entire production system. Check the roadmap and verify the code before exposing a service.

## Does it use LEGO assets?

No. The project uses original brick-style/minifigure-inspired artwork and does not imply affiliation with LEGO®.

## Where can I report a security issue?

Use GitHub's private vulnerability reporting or email [hello@ebubeimoh.com](mailto:hello@ebubeimoh.com) with subject `[avatar-gateway security]`. Do not post details in a public issue.
