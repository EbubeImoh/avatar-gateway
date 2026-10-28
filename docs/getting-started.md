# Getting started

The v0.2 packages are implemented in this source repository but have not been published to npm. Run the local gateway and demo sites from this checkout:

```bash
npm install
npm run build
npm test
npm run dev
```

The gateway listens on `127.0.0.1:4100`; Demo Site A and B listen on ports 4101 and 4102. Open the demo pages and trigger a visit with:

```bash
curl http://127.0.0.1:4101/demo/visit
```

Demo Site A requests a visit, exchanges the grant for a proof-bound token, connects to the authenticated relay, and chats with Demo Site B. The local demos use mock LLM providers and need no API key.

To initialize another project, run `shubur init` after this package is published. Until then, use the local source CLI entry with `node packages/cli/dist/cli.js init` after building. It detects the framework, creates local site/avatar identities and a Starter Apartment scaffold, and saves private configuration under `.avatar-gateway/`.

For MCP setup, build this repository and configure the client to run `node /absolute/path/to/avatar-gateway/packages/mcp/dist/server.js`. See the [MCP guide](mcp.md), [hosting guide](hosting.md), and [Starter Apartment guide](starter-pack.md).
