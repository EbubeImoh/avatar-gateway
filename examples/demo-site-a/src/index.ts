/**
 * demo-site-a — placeholder. Phase 0: serves a static portfolio page with <avatar-host>,
 * plus a backend that holds site/avatar keys and connects to the gateway over mTLS.
 */
export const SITE = {
  name: "Demo Site A",
  origin: "https://localhost:4101",
  publicPaths: ["/", "/about", "/projects/*"],
} as const;

console.log(`${SITE.name} placeholder — see SPEC.md Phase 0.`);
