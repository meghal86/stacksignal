# StackSignal Design System

## Direction: Signal Engine

StackSignal should feel like a trusted developer-infrastructure product with a memorable
technical illustration system. The product is a signal engine: GitHub, npm, HN, and
competition data move through clean machinery until the app compresses noise into a
Build / Skip / Watch call.

Reference qualities:
- Fly.io-style confidence: simple headline, clear technical promise, custom illustration.
- Poch/Ribbit-style memorability, but only through controlled illustration, not clutter.
- StackSignal-specific result: warm, sharp, animated, credible, developer-first.

## Visual Principles

- One strong visual idea per page: signal engine, analysis scanner, report artifact, pricing gate.
- Oversized type should carry the page. Do not make headings timid.
- Data UI stays sharp and readable; art lives around it, behind it, or beside it.
- No graffiti clutter, no generic SaaS gradients, no purple-default look.
- Every core page should show some form of motion or signal activity.

## Color Palette

```css
:root {
  --color-signal:   #FF4800;  /* orange action */
  --color-clarity:  #C5E600;  /* acid clarity */
  --color-insight:  #00B8A0;  /* teal focus */
  --color-ink:      #1A1A1A;  /* near-black */
  --color-canvas:   #F5F0E8;  /* warm cream */
  --color-paper:    #FFFAF1;  /* report cards */
  --color-blue:     #0090FF;  /* spectrum only */
  --color-violet:   #9B5DE5;  /* spectrum only */
}
```

- **Spectrum**: `linear-gradient(90deg, #FF4800, #FF9500, #C5E600, #00B8A0, #0090FF, #9B5DE5, #FF4800)`
- **Border**: `#1A1A1A` for featured modules, `#E8E4DD` for quiet dividers.
- **Canvas**: warm cream, never flat white as the main page background.

## Typography

- **Headings**: Space Grotesk 700, uppercase when it improves impact.
- **Display titles**: very large, tight tracking, line-height below 1.
- **Labels/data**: system mono, uppercase, wide letter spacing.
- **General**: no serifs. This is a tool with art direction, not a magazine.

## Shape & UI Rules

- Cards and controls are sharp: `0px` radius.
- Badges and small status pills may use full pill radius.
- Prefer 1px borders and layered backgrounds over box shadows.
- Inputs are strong: 2px ink border, paper/white fill.
- CTAs should be either Signal orange, Ink black, or Clarity green-yellow.

## Art Layer

The reusable art language is the **Signal Engine**:
- Technical grid: subtle, low-contrast, never dominant.
- Orbit lines: thin black ellipses.
- Nodes: GH, npm, HN, AI markers.
- Scanner needle: rotating black line with orange endpoint.
- Signal Scout: abstract orange machine core, not a cartoon unless final assets exist.
- Infrastructure blocks: small server/process rectangles around the scanner.
- Marquee strips: moving signal terms across black bands.

Rules:
- Never let art reduce legibility.
- Never put heavy art inside payment forms.
- Motion must respect `prefers-reduced-motion`.
- Use max two major art elements per viewport.
- Graffiti marks are deprecated. Use technical illustration instead.

## Page Roles

- **Homepage**: product demo and art manifesto. User sees radar, leaderboard, and try chips.
- **Analyze**: live scanner workspace. Progress is central, not hidden.
- **Report**: shareable signal artifact. It should look good in screenshots.
- **Pricing**: simple payment gate. Artistic but direct, no dark patterns.
- **Build Room**: operational workspace. More utility, less decoration.

## Mobile

- Collapse art beside content, never leave empty hero columns.
- Keep nav compact: logo + primary CTA, hide secondary links if needed.
- Large tables become stacked cards.
- Display titles scale down aggressively on small screens.
