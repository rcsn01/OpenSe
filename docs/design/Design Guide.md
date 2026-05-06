# Design Guide

## Purpose

This document sets the rules for designing interfaces across the OpenSe platform. Every screen, component, and interaction must follow these principles so that the experience is consistent, maintainable, and easy to build.

## Philosophy

The design system is token-based. This means design decisions (colours, spacing, typography) are not arbitrary values chosen per-screen. They are predefined tokens applied through variables and shared components.

Designers do not invent new values. They combine existing tokens.

---

## 1. Source of truth

There is exactly one place where design tokens live: the `@repo/ui` package. Designers and developers both reference the same token names.

When designers create a mockup, they use tokens from this system. When developers build it, they use the exact same token names. Screen reviews are not about matching hex codes — they are about verifying that the correct tokens were applied.

If a designer needs a value that does not exist in the token system, they do not create it in isolation. They request it through the design-system channel so the token can be added to `@repo/ui` and shared across the platform.

---

## 2. Token-driven design

### Colours

Use semantic colour tokens, not raw values.

| Do this | Not this |
|---|---|
| `primary`, `background`, `border`, `muted-foreground` | `#3b82f6`, `#f8fafc`, `#e2e8f0` |

Semantic tokens are theme-aware. Using a raw hex code breaks dark mode, accessibility adjustments, and future re-theming.

### Typography

Use named typography roles for every piece of text. Do not set custom font sizes.

| Do this | Not this |
|---|---|
| `heading-2` for a page title, `body-3` for standard text | 36px, 16px |

Named roles ensure that if the platform's type scale changes, every screen updates automatically. Page titles, body paragraphs, labels, and captions each have a semantic role in the type system.

### Spacing

Use the 8px-base spacing scale for all layout gaps and padding.

| Do this | Not this |
|---|---|
| `space-4` (16px), `space-6` (24px), `space-8` (32px) | 14px, 22px, 30px |

The spacing scale is intentionally limited. Designers and developers are expected to round to the nearest token rather than invent custom spacing.

If a component feels wrong with the nearest spacing token, that is a signal to reconsider the layout rather than override the scale.

---

## 3. Visual formatting principles

### No empty dead zones

Every area of a page should serve a purpose. Do not leave large empty vertical or horizontal gaps with no content. If a section feels empty, it is a signal to:

- Fill it with summary data, context, or helpful empty-state content
- Let the content breathe using larger padding and gaps, not by leaving raw blank space
- Combine adjacent sections if neither has enough substance to stand alone

| Do this | Not this |
|---|---|
| Pad generously so content feels relaxed and intentional | Leave blank rectangles of raw background |
| Use a full empty-state illustration and message where there is no data | Show an empty table cell with no explanation |
| Stretch cards and grids to use the available width | Narrow centred columns floating in a void |

### Separate with whitespace, not borders

Prefer space and gaps to distinguish sections. Reaching for a divider or a border should be the last option.

| Do this | Not this |
|---|---|
| Increase `gap` between cards from `space-4` to `space-6` to show grouping | Add a 1px `border` line between every card |
| Use a small background difference (`surface-subtle` vs `background`) to separate regions | Draw divider lines on all four edges of a card |
| Stack related items inside a single card with internal spacing | Put every row inside its own bordered box |

Borders are permitted for:
- Input fields
- Table row separators
- Side nav item boundaries
- Anything interactive that needs a visible hit area

Everything else should use spacing or background contrast.

### Density hierarchy

Not every page needs to be dense. Decide the intended density of a screen before laying it out.

| Density | Use case | Spacing strategy |
|---|---|---|
| Relaxed | Dashboards, detail views, landing pages | Generous padding, large gaps, taller cards |
| Standard | Forms, settings, lists | Default token spacing |
| Compact | Data tables, inventory grids, picker lists | Tighter rows, smaller gaps, inline actions |

Do not mix densities on the same page without a clear reason. If the left panel is compact and the right panel is relaxed, the page will feel broken.

### Alignment and rhythm

Content should align to a single invisible grid. Left edges, right edges, and internal columns should share common baselines.

| Do this | Not this |
|---|---|
| Align header text, card text, and action buttons to the same left edge | Offset every block by a slightly different amount |
| Use consistent vertical rhythm (e.g. every section separated by `space-8`) | Use `space-6` here, `space-10` there, for no reason |
| Left-align long labels and data, right-align numbers and monetary values | Centre-align everything indiscriminately |

---

## 4. Component library

Primitive components exist in `@repo/ui`. Designers must use them, not redraw them.

| Component | Types |
|---|---|
| Button | Primary, Secondary, Outline, Ghost, Destructive |
| Card | Default, Plain |
| Input | Text, Number, Select, Textarea |
| Badge | Default, Success, Warning, Destructive |
| Dialog | Modal, Sheet |
| Data Table | Scrollable, Sortable, Paginated |
| Empty State | Icon, Title, Description, Action |

If a designer needs a variant that does not exist (for example, a "danger outline" button), they do not create it as a one-off. They submit a request through the design system so it can be added as a proper variant in code.

### One-offs are not allowed

There are no custom buttons, custom cards, or custom inputs in mockups. Every interactive element must come from the component library. If a one-off is needed, it must be approved and added to the library first.

---

## 5. Layout rules

### Containers and grids

All pages live inside the standard app layout (top bar, sidebar, content area). Mockups should show the full layout context, not just an isolated screen.

Content inside the content area should use the shared grid system. Grids are simple 2-column and 3-column systems with standard gutter widths. Do not use custom grid fractions.

### Maximum widths

Content blocks have standard maximum widths depending on their purpose. Do not stretch forms, dashboards, or cards to full screen on wide displays.

| Block type | Approximate max width |
|---|---|
| Forms | ~980px |
| Detail views | ~1220px |
| Dashboard cards | Flexible within the grid system |

---

## 6. Responsive design

Every screen must be designed for mobile first, then annotated for wider breakpoints.

| Do this | Not this |
|---|---|
| Design the mobile version first, then adapt upward | Design desktop only |
| Annotate how cards reflow, grids collapse, and sidebars behave | Expect the developer to guess |

Tables, modals, and label editors — which are often assumed to be "desktop only" — must still have a responsive strategy defined by the designer.

Breakpoints are standardised. Adaptation happens at well-defined thresholds, not at arbitrary per-screen sizes.

---

## 7. Iconography

Use a single icon library across the entire platform. Icons must be referenced by name so developers can find them directly.

| Do this | Not this |
|---|---|
| Reference the exact Lucide icon name: `ScanBarcode`, `AlertCircle` | Drop a random SVG icon into the mockup |

Icons should inherit the colour of the text they sit beside (`currentColor`). They should not be hardcoded to specific hex values unless the design system explicitly defines a coloured icon variant.

---

## 8. Accessibility baseline

Every mockup is reviewed against these minimum expectations. A design cannot be approved if it violates them.

| Requirement | Standard |
|---|---|
| Minimum body text size | Token `body-4` (14px) or larger |
| Minimum interactive target size | 40×40px for buttons, inputs, and links |
| Colour contrast | Body text must be readable against its background |
| Focus state | Every interactive element must show a visible focus ring in the design |
| Empty states | Every list, table, or search result screen must have an empty state designed |
| Error states | Every form must have its error message pattern specified |

If a component does not meet these expectations, it does not ship.

---

## 9. Handoff to engineering

For each screen, the designer delivers:

- A complete design with all states named correctly
- Token annotations visible on every element
- A brief interaction note if the flow is non-standard
- A list of any icons used that must exist in the icon library
- No custom values without an exception approval

Developers do not translate arbitrary hex codes into the nearest token. If the design uses a token, the developer uses that exact token. If the design uses a raw value, the developer flags it and returns the design until the token is applied.

---

## 10. When to extend the design system

This system is designed to be extended, but not casually. You may request a new token or component when:

- A new brand or product requires a full palette (not just a one-off screen)
- A new data visualisation pattern is needed repeatedly
- Accessibility requirements (high contrast, large type modes) demand new tokens
- A new breakpoint is proven necessary by several screens that break at the existing ones

One-off screens do not get new tokens. One-off screens reuse existing tokens creatively.

---

## Summary

| Principle | In practice |
|---|---|
| Tokens first | Every colour, type size, and spacing value comes from `@repo/ui` |
| Components only | Use the shared component library. No custom redraws. |
| Visual hierarchy | No dead zones. Separate with whitespace, not borders. Pick a density and stick to it. |
| Mobile first | Start at the narrowest width, then adapt upward with standard breakpoints. |
| Annotate everything | Name states clearly. Add token references and icon names to every element. |
| Accessibility is not optional | Contrast, target sizes, focus states, and empty states are reviewed at design time. |

If every screen follows this guide, developers will build faster, the platform will look consistent, and future design updates will propagate everywhere with a single token change.
