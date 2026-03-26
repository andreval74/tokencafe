```markdown
# Design System Strategy: The Radiant Roast (Web3 Luxury Interface)

## 1. Overview & Creative North Star: "The Digital Sommelier"
The creative direction for this design system is **"The Digital Sommelier."** We are moving away from the static, traditional "luxury" of gold foil and moving toward a high-velocity, Web3-inspired aesthetic that feels like a premium digital lounge. 

To break the "template" look, we utilize **Intentional Asymmetry**. Hero sections should not be perfectly centered; rather, use the `16` (5.5rem) spacing token to create off-grid focal points. Overlapping elements—such as a product image bleeding into a `surface-container`—create a sense of physical depth. This system is designed to feel curated, not manufactured.

---

## 2. Colors & Surface Philosophy
The palette transitions from the organic warmth of coffee to the high-energy pulse of a vibrant orange.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Traditional borders are "noise." Boundaries must be defined through:
*   **Background Shifts:** Transitioning from `surface` (#0e0e0e) to `surface-container-low` (#131313).
*   **Tonal Transitions:** Using subtle variations in the dark scale to imply a change in content without hard lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers. 
1.  **Base Layer:** `surface` (#0e0e0e).
2.  **Section Layer:** `surface-container-low` (#131313).
3.  **Component Layer (Cards):** `surface-container` (#1a1919) or `surface-container-high` (#201f1f).
*By nesting a higher-tier container within a lower-tier background, you create a natural, sophisticated lift.*

### The "Glass & Gradient" Rule
To achieve the Web3 signature, use **Glassmorphism** for floating elements (modals, dropdowns, navigation bars). 
*   **Recipe:** `surface-container-highest` (#262626) at 60% opacity with a `20px` backdrop-blur.
*   **Signature Textures:** For main CTAs, use a linear gradient from `primary` (#ff9f4a) to `primary-container` (#fd8b00) at a 135-degree angle. This provides a "glow" that flat hex codes cannot replicate.

---

## 3. Typography: The Manrope Editorial
We use **Manrope** exclusively to bridge the gap between technical precision and lifestyle elegance.

*   **Display Scale (`display-lg` 3.5rem):** Reserved for high-impact headlines. Use `-0.02em` letter spacing to create a "tight," custom-typeset feel.
*   **Headline Scale (`headline-md` 1.75rem):** Used for section titles. Pair this with `primary` color text for key words to drive visual interest.
*   **Body Scale (`body-lg` 1rem):** Our workhorse. Ensure a line height of at least `1.6` to provide the "breathing room" expected in luxury interfaces.
*   **Labels (`label-md` 0.75rem):** Always uppercase with `0.05em` letter spacing for a refined, utilitarian look in metadata.

---

## 4. Elevation & Depth: Tonal Layering
Standard drop shadows are prohibited. Depth is a result of light physics, not software defaults.

*   **Ambient Shadows:** If an element must "float," use an extra-diffused shadow: `0px 24px 48px rgba(0, 0, 0, 0.4)`. The shadow should feel like a soft glow beneath the object.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use a "Ghost Border." Apply `outline-variant` (#484847) at **15% opacity**. It should be felt, not seen.
*   **Interactive Glow:** For hovered cards, apply a subtle inner glow using `surface-tint` (#ff9f4a) at 5% opacity to simulate the "Orange Luxury" reflecting off the surface.

---

## 5. Components & Primitive Styling

### Buttons (The Conversion Engines)
*   **Primary:** Gradient of `primary` to `primary-container`. Corner radius: `md` (0.375rem). No border. Text color: `on_primary_fixed` (#180800).
*   **Secondary:** Ghost style. `Ghost Border` (15% opacity `outline-variant`) with `on_surface` text. 
*   **Tertiary:** Text only in `primary`. Underline on hover using a 2px `primary` stroke.

### Input Fields
*   **Styling:** Background: `surface-container-highest` (#262626). 
*   **State:** On focus, the border transitions from 0% opacity to 40% `primary`. 
*   **Layout:** Labels should be `label-md`, positioned 0.5rem above the input field.

### Cards & Lists (The Editorial Feed)
*   **Forbid Dividers:** Never use a line to separate list items. Use the spacing scale `3` (1rem) or `4` (1.4rem) to create separation through negative space.
*   **Interaction:** On hover, a card should shift from `surface-container` to `surface-container-high` and scale by 1.01x.

### Coffee-Specific Components
*   **Roast Intensity Chip:** Use `secondary_container` (#5b403c) for the background and `secondary` (#fed7d0) for text to evoke a rich, chocolatey aesthetic.
*   **Web3 Transaction Status:** Use `tertiary` (#ffb151) for "Processing" and `error` (#ff7351) for "Failed," ensuring high vibrance against the black background.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Negative Space:** Use spacing `12` (4rem) between major sections to let the typography breathe.
*   **Layer Surfaces:** Always place lighter surfaces on darker backgrounds to indicate hierarchy.
*   **Use Asymmetry:** Place high-quality coffee photography slightly off-center to create a modern, editorial vibe.

### Don't:
*   **Use Pure White Text for Body:** Use `on_surface_variant` (#adaaaa) for long-form text to reduce eye strain against the black background.
*   **Use High-Contrast Borders:** 100% opaque borders make the UI look like a "bootstrap" template. Avoid them at all costs.
*   **Overuse the Orange:** The `primary` orange is a spotlight, not a floodlight. Use it for CTAs, accents, and critical data points only.

---
**Director's Note:** This system succeeds when it feels like a high-end physical space—dim lighting, intentional spotlights, and tactile surfaces. If it feels "flat," you aren't using the `surface-container` tiers effectively.```