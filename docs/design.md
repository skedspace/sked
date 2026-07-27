# SKED Global UI Design

**Status:** Canonical  
**Applies to:** Marketing pages, authentication, onboarding, dashboard, public booking pages, and future product surfaces.

When a task refers to the **global UI design**, **global theme**, or **SKED design system**, use this document as the design reference. The runtime implementation currently lives in:

- `src/app/globals.css`
- `src/components/ui/`
- `src/app/page.tsx` for the most complete visual reference

## 1. Design idea

SKED should feel like a well-organized paper calendar made digital: calm, tactile, direct, and quietly playful.

The system combines:

- Warm paper surfaces instead of sterile white or blue-gray dashboards
- Near-black ink for structure and trust
- Chartreuse for momentum, availability, and positive actions
- Coral for expressive highlights and moments that need attention
- Scheduling-specific details such as grids, time slots, status pulses, stamps, and link chips
- Strong editorial typography balanced by compact, practical product controls

The visual personality is **warm editorial utility**. It should feel creative without becoming decorative software.

## 2. Core principles

1. **The task stays obvious.** Visual character must never obscure booking, navigation, form completion, or status.
2. **Use contrast, not clutter.** One strong focal color or gesture per component is usually enough.
3. **Make the product visible.** Prefer real schedules, services, customer states, and booking previews over abstract decoration.
4. **Texture is subtle.** Grain, grids, stamps, and shapes support the paper-calendar idea; they do not compete with content.
5. **Motion explains state.** Hover, focus, confirmation, and transition motion should show cause and effect.
6. **Mobile is a first-class surface.** Do not depend on hover or compress desktop layouts into unreadable cards.

## 3. Token architecture

Use three layers:

```text
Primitive value → Semantic purpose → Component token
```

Example:

```css
--sked-lime: #b9f34b;
--color-action-positive: var(--sked-lime);
--button-primary-bg: var(--color-action-positive);
```

New UI should consume semantic or component tokens. Raw hex values are reserved for token definitions, illustrations, and prototypes being migrated into the system.

## 4. Color system

### Primitive palette

| Token | Value | Name | Purpose |
| --- | --- | --- | --- |
| `--sked-ink` | `#171a16` | Ink | Primary text, dark surfaces, strong CTAs |
| `--sked-paper` | `#f7f6ef` | Paper | Page background |
| `--sked-paper-raised` | `#fbfaf4` | Raised paper | Cards, dialogs, scheduler surfaces |
| `--sked-white` | `#ffffff` | White | High-contrast raised controls |
| `--sked-lime` | `#b9f34b` | Booking lime | Positive action, availability, progress |
| `--sked-lime-dark` | `#5f8b12` | Leaf | Accessible lime-adjacent text and icons |
| `--sked-coral` | `#ff6b4a` | Coral | Expressive accent, highlights, alerts |
| `--sked-coral-soft` | `#ffddd5` | Blush | Appointment and supporting surfaces |
| `--sked-blue-soft` | `#dce8ff` | Calendar blue | Informational scheduling states |
| `--sked-muted` | `#6e716b` | Pencil | Secondary text |

### Semantic roles

| Role | Value | Rule |
| --- | --- | --- |
| Page background | Paper | Default application canvas |
| Primary foreground | Ink | Headings and body text |
| Raised surface | Raised paper or white | Cards, popovers, dialogs |
| Primary app action | Booking lime + ink text | Save, continue, confirm |
| Primary marketing action | Ink + white text | High-emphasis conversion CTA |
| Accent action | Coral + white text | Use sparingly |
| Muted surface | Warm gray derived from paper | Grouping and secondary regions |
| Success | Lime or leaf | Pair with an icon or explicit text |
| Information | Calendar blue | Informational state, not primary CTA |
| Destructive | Existing destructive red token | Never substitute coral for destructive actions |

### Color rules

- Always use ink text on booking lime. White text on lime does not provide enough contrast.
- Use coral on less than roughly 10% of a screen.
- Avoid introducing purple gradients, cool gray dashboard backgrounds, or default SaaS blue as a primary color.
- Status must never rely on color alone; add an icon, label, or shape.
- Borders should normally use ink at `8–14%` opacity.

## 5. Typography

### Font stack

```css
font-family:
  Inter,
  "Aptos",
  "Segoe UI Variable",
  "Segoe UI",
  system-ui,
  sans-serif;
```

Inter is preferred when available. Aptos and Segoe UI Variable preserve the same modern, humanist character without requiring a network font.

### Type roles

| Role | Size guidance | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Marketing display | `clamp(3.3rem, 7vw, 6.8rem)` | 900 | `0.89–0.98` | `-0.055em` to `-0.075em` |
| Page title | `2.25–3.75rem` | 800–900 | `0.98–1.08` | `-0.04em` |
| Section title | `2–3.75rem` | 800–900 | `0.98–1.1` | `-0.035em` |
| Component title | `1.125–1.5rem` | 700 | `1.2–1.3` | `-0.025em` |
| Body large | `1.125rem` | 400 | `1.7–1.8` | Normal |
| Body | `1rem` | 400 | `1.5–1.7` | Normal |
| UI label | `0.875rem` | 600–700 | `1.3` | Normal |
| Eyebrow/caption | `0.625–0.75rem` | 700–900 | `1.3` | `0.12–0.18em` uppercase |

Very tight tracking is reserved for large display text. Inputs, body copy, tables, and small labels use normal tracking.

## 6. Spacing and layout

- Base unit: `4px`
- Common component spacing: `8px`, `12px`, `16px`, `24px`, `32px`
- Section spacing: `80–128px` desktop, `64–96px` mobile
- Content maximum: `1280px` (`max-w-7xl`)
- Reading width: `560–720px`
- Default page gutters: `20px` mobile, `32px` tablet and desktop

Prefer asymmetric editorial layouts for marketing pages and aligned, repeatable grids for operational pages.

## 7. Shape, border, and elevation

### Radius

| Token | Value | Usage |
| --- | --- | --- |
| Small | `8px` | Compact tags and internal schedule blocks |
| Control | `12px` | Buttons and inputs |
| Card | `16px` | Product cards and forms |
| Feature | `24px` | Marketing cards |
| Hero panel | `28px` | Large scheduler and CTA panels |
| Full | `999px` | Pills, avatars, status controls |

### Elevation

- Inputs and compact controls: soft `1–4px` shadow
- Cards: `0 8px 24px rgb(23 26 22 / 5%)`
- Hovered cards: `0 14px 32px rgb(23 26 22 / 8%)`
- Floating confirmations: `0 18px 50px rgb(23 26 22 / 15%)`
- Hero product panel: `0 28px 90px rgb(18 23 16 / 16%)`

Do not apply heavy shadows to every surface. Elevation should communicate layering or interaction.

## 8. Texture and graphic language

Approved textures and motifs:

- Fine monochrome paper grain at about `3–4%` opacity
- Calendar grids using `1px` ink lines at about `5%` opacity
- Dashed circular availability seals
- Stamps, link chips, time blocks, checkmarks, and status pulses
- Simple geometric accents in lime and coral
- Outlined Lucide icons at approximately `2px` stroke

Avoid:

- Glassmorphism as a default surface
- Decorative blobs without a scheduling or business meaning
- Photorealistic 3D objects
- Heavy noise that reduces text clarity
- More than one strong texture inside a component

## 9. Component specifications

### Buttons

**Primary app button**

- Lime background, ink text
- `12px` radius
- Minimum height `36px`; use `44–56px` for important actions
- Hover: lift `2px`, slightly increase brightness and shadow
- Active: return down `1px`
- Focus: visible `2px` leaf-colored ring with offset
- Disabled: no motion, `50%` opacity

**Primary marketing button**

- Ink background, white text
- Rounded pill for prominent conversion actions
- Arrow may move `4px` on hover

**Secondary button**

- Translucent white or paper background
- Ink border at `10–15%`
- Hover increases border contrast and elevation

### Inputs

- Height `44px`
- `12px` radius
- White at roughly `65%` over paper
- Ink border at `10%`
- Hover: white background and `20%` border
- Focus: white background, stronger border, visible ring
- Error: destructive border plus inline recovery text

### Cards

- Raised paper or white background
- `16–24px` radius depending on scale
- Ink border at `8%`
- Subtle shadow by default
- Hover only when the card is actionable; lift `4–6px` and increase border/shadow
- Non-actionable cards should not imply clickability

### Badges and status

- Pill shape
- Bold compact label
- Use lime for positive states, blue for information, coral for expressive emphasis, and destructive red for errors
- Always include readable text

### Navigation

- Warm translucent header over paper
- Active location must be visibly distinct
- Top-level targets use at least `40px` hit height
- On mobile, preserve sign-in and the primary action before secondary navigation

### Scheduling UI

- Use a quiet grid and colored appointment blocks
- Appointment text must remain readable at the smallest supported width
- Hover may lift a time block, but selection must also work by keyboard and touch
- Clearly differentiate available, selected, booked, unavailable, and past states

## 10. Motion

### Timing

| Token | Duration | Usage |
| --- | --- | --- |
| Fast | `160–200ms` | Hover, focus, active |
| Standard | `240–320ms` | Cards, icons, small reveals |
| Expressive | `500–700ms` | Large decorative shapes |
| Ambient | `5–26s` | Floating cards, ticker, rotating seal |

Preferred easing:

```css
cubic-bezier(0.2, 0.8, 0.2, 1)
```

Rules:

- Motion should clarify interactivity or status.
- Ambient animation pauses when appropriate and never blocks an action.
- Do not animate large layout shifts.
- Respect `prefers-reduced-motion`; remove ambient and reveal animation while preserving content.

## 11. Responsive behavior

- Build from content constraints, not device names.
- Stack hero copy and product preview below approximately `1024px`.
- Preserve full-width primary actions on narrow screens when it improves thumb reach.
- Hide secondary navigation before shrinking primary actions below comfortable sizes.
- Never permit horizontal document overflow.
- Decorative elements may simplify or disappear on mobile; essential status and product content must remain.

## 12. Accessibility

- Meet WCAG AA contrast: `4.5:1` for normal text and `3:1` for large text and UI boundaries.
- Provide visible keyboard focus on every interactive element.
- Minimum touch target: `40×40px`; prefer `44×44px`.
- Use semantic headings, landmarks, labels, and native controls.
- Never use hover as the only way to reveal essential information.
- Pair status color with text or iconography.
- Preserve readable content when motion is reduced or CSS animation is unsupported.

## 13. UI copy

SKED copy is clear, warm, and action-oriented.

- Prefer specific actions: “Build my booking page” over “Continue.”
- Use short sentences and familiar words.
- Focus on the customer outcome before implementation detail.
- Avoid hype, jargon, and robotic system messages.
- Error copy should explain what happened and what the user can do next.

## 14. Implementation contract

For new UI:

1. Reuse components in `src/components/ui/` before creating new primitives.
2. Use the semantic Tailwind colors backed by `src/app/globals.css`.
3. Use Lucide icons unless a brand-specific mark is required.
4. Implement hover, focus-visible, active, disabled, loading, empty, error, and mobile states where relevant.
5. Test at a narrow mobile width and a standard desktop width.
6. Check document width for horizontal overflow.
7. Keep hardcoded palette values inside the token layer or isolated illustration components.
8. Treat this document as the decision source when visual preferences are ambiguous.

## 15. Quick review checklist

- Does the screen feel like SKED—paper, ink, lime, and scheduling detail?
- Is the primary action unmistakable?
- Does every visual flourish support the task or brand?
- Are component states complete?
- Is the layout comfortable on mobile?
- Is text contrast accessible?
- Is motion purposeful and reduced-motion safe?
- Are new values expressed through tokens rather than scattered constants?

## 16. Public Page Theme System

The Public Page editor (`/dashboard/settings/page`) includes a theming system that lets business owners customize their booking page's look and feel.

### Available Themes

| ID | Label | Description | Palette |
|---|---|---|---|
| `default` | Modern Sport | Crisp white surfaces with energetic lime actions. | `#72c914` (primary), `#07112b` (ink), `#f3f5ec` (paper), `#d9d9d6` (muted) |
| `warm` | Sunset Club | Warm courtside tones for lifestyle-led venues. | `#f59e0b` (primary), `#3d2b1f` (ink), `#fff3df` (paper), `#e0d3c2` (muted) |
| `cool` | Coastal Play | Fresh teal accents with clean booking cards. | `#14b8a6` (primary), `#103f4a` (ink), `#e8faf7` (paper), `#c8d7d5` (muted) |
| `dark` | Night Match | High-contrast preview for evening and premium clubs. | `#eab308` (primary), `#1c1917` (ink), `#34302c` (paper), `#d6d3d1` (muted) |

### Primary Color Customization

- Each theme has a **first palette color** designated as its primary accent color
- The primary color controls: logo background, headline accent text, section labels, icons, testimonial stars, CTA buttons, and footer social pills
- Users can **override** the primary color via a color picker (`<input type="color">`) in the Design Settings panel
- The primary color is persisted to the `pages.primary_color` column and saved with the page payload

### Implementation

- Defined in `page-editor.tsx` as the `THEMES` constant array
- The `primaryColor` state syncs with the theme selection (theme change auto-sets primary color)
- The `PagePreview` component receives `primaryColor` as a prop and applies it via inline styles
- All accent elements in the storefront preview respond dynamically to color changes

### Future

- Booking flow steps in the preview should also use the primary color for accent elements
- Theme-aware contrast logic needed for WCAG AA compliance on colored backgrounds

