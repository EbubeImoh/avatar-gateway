# Portfolio CSS-3D house source

The room geometry and avatar mesh in this directory are copied from Ebube Imoh's private portfolio checkout at commit `45c80e80deb9baff0c5cb591c23563d3826f70a2` (`45c80e8`):

- `public/assets/js/world.js` → `world.js`
- `public/assets/js/people.js` → `people.js` (generic person builder only)
- `public/assets/css/site.css` → `house.css` (the studio-scene and house-rendering CSS sections)
- `public/assets/js/app.js` → `living-home.js` for its box/decal/person DOM templates, wall clock, and projected room-door and sleep markers

The source repo's `README.md` describes the house as plain HTML, CSS, and JavaScript using CSS 3D transforms, with no WebGL or dependencies. The private portfolio repo has no `LICENSE` file. The author supplied this source for this port; it is not being represented as separately licensed. No images, fonts, or other third-party assets were copied. The source stylesheet's Google Fonts declarations were not copied; the house uses system font fallbacks.

Adaptations are deliberately limited to the Shubur mount, module imports, layout sizing, and a mapping from Shubur Life activity records to the source room spots and poses. The source scene and person geometry templates remain the basis for every rendered room and avatar. The portfolio's owner-specific daily simulation was not copied: it includes the owner's named household, guests, pet, and vehicle. The seven-room geometry keeps neutral furniture, while the personal vehicle, console/remote, charging-phone prop, pet poses, pet bowl, pet-only spots, and unused portfolio tour controls were removed from the copy. The Life adapter also disables the sample apartment's generic car so its activity choices match the neutral garage, and leaves the agent's hands empty when relaxing.
