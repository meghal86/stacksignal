# StackSignal Design System

## Color Palette
```css
:root {
  /* The StackSignal five */
  --color-signal:   #FF4800;  /* orange — action */
  --color-clarity:  #C5E600;  /* yellow-green — good */
  --color-insight:  #00B8A0;  /* teal — focus */
  --color-ink:      #1A1A1A;  /* near-black — everything */
  --color-canvas:   #F5F0E8;  /* warm cream — base */

  /* Semantic verdict colors */
  --color-build:    #FF4800;  /* orange */
  --color-watch:    #00B8A0;  /* teal */
  --color-skip:     #1A1A1A;  /* ink — crossed out */

  /* Score scale (matches the four numbers) */
  --score-high:     #FF4800;  /* 80-100 */
  --score-mid:      #00B8A0;  /* 50-79 */
  --score-low:      #C5E600;  /* 30-49 */
  --score-noise:    #8A8680;  /* 0-29 */
}
```
- **Spectrum**: `linear-gradient(90deg, #FF4800, #FF9500, #C5E600, #00B8A0, #0090FF, #9B5DE5, #FF4800)`
- **Border**: `#E8E4DD` (Warm, not cold gray)

## Typography
- **Headings**: `Space Grotesk 700`
    - Weight: 700
    - Letter-spacing: `-0.04em`
- **Data Labels**: `System mono`
- **General**: No serifs anywhere — this is a tool, not a magazine.

## Corner Radius
- **Primary Cards**: `0px` (Sharp)
- **Badges/Tags/Pills**: `100px` (Pill)
- **Everything else**: `0px` or `100px` — nothing in between.

## UI Rules
- **Dividers**: `1px #E8E4DD`
- **Inputs**: `2px #0A0A08` (Strong, confident)
- **Shadows**: No box-shadows anywhere.

## Graffiti Layer

Every dashboard surface can have graffiti elements.
These are SVG elements placed OVER clean UI, never replacing it.

### The creature system
- Signal Scout: orange (#FF3E00), sidebar + empty states
- Build Bot: green (#00C94A), BUILD verdict cards
- Watch Owl: amber (#FFAA00), WATCH verdict items
- Skip Ghost: crosses out with red X spray

### Spray ring
Use around featured/top-ranked items only.
SVG circle, stroke-dasharray="8 6", opacity 0.4.
Add scattered dots around the ring (opacity 0.2-0.5).

### Ghost text tags
Huge text (80-120px) at 0.06-0.12 opacity behind content.
"BUILD" on green verdict sections.
"SKIP" with red on dead opportunities.
"STACKSIGNAL 2026" as a bottom-right signature on reports.

### Rules
- Max 2 graffiti elements per card
- Creatures always overlap an edge (never float centered)
- Spray effects always in verdict color (green/red/amber)
- Never use graffiti on forms, inputs, or payment flows