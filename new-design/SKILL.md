---
name: pdf-form-editor-design
description: Use this skill to generate well-branded interfaces and assets for PDF Form Editor, either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read `README.md` within this skill, and explore the other available files:

- `colors_and_type.css` — every CSS token + semantic role class. Import this first when building.
- `assets/` — logo mark and Lucide-style SVG icons used by the product.
- `preview/` — 27 small HTML cards covering colors, type, spacing, components, and brand.
- `ui_kits/pdf-form-editor/` — full click-through React recreation of the editor + filler modes.

When creating visual artifacts (slides, mocks, throwaway prototypes), copy
assets out and write static HTML — link `colors_and_type.css` (or inline the
tokens) and follow the visual-foundations guidance in the README. **Default
to dark mode.** Use the Lucide icon style at 1.5–2 px stroke; copy from
`assets/` or pull more from Lucide CDN. Never use emoji. Never invent new
gradients or illustrative motifs.

When working on production code, you can lift component primitives directly
from `ui_kits/pdf-form-editor/primitives.jsx` (their APIs mirror
`src/components/ui/`) and reuse the layout classes from
`ui_kits/pdf-form-editor/app.css`.

If the user invokes this skill without any other guidance, ask them what
they want to build or design, ask 3–4 clarifying questions (which screen,
fidelity, mode, variations), and act as an expert designer who outputs HTML
artifacts _or_ production code, depending on the need.
