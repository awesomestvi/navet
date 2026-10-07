---
title: Appearance and layouts
description: Choose Navet Cards layouts, themes, effects, and Home Assistant sizing.
editUrl: https://github.com/navet-app/navet/edit/main/docs/cards/appearance.md
---

Edit a Navet card to change **Layout** and its **Appearance** settings. Use consistent
layouts for related controls and enough space for titles and device actions.

## Choose a layout

| Layout | Use it for |
| --- | --- |
| Compact | Everyday device controls and rooms |
| Comfortable | More space for richer controls, such as light color temperature and heating mode |
| Row | Identity and state with a **Controls** disclosure for entity actions |

Controls appear when the selected device supports them. Switch cards also offer **Small**
and **Extra-small** sizes; extra-small keeps the small card width with a shorter composition.

## Choose a theme

In **Appearance**, choose **Theme**:

- **Auto** follows Home Assistant's theme.
- **Light**, **Dark**, and **Black** use their respective surface styles.
- **Glass** uses a glass surface; **Effects → High** enables transparency and blur.

**Effects → Low** uses simpler decoration and opaque glass. Choose **Preset** for warm,
neutral, or cool accents, or set a six-digit accent color. Set the corner radius from 0 to 48 pixels.

```yaml
type: custom:navet-light-card
entity: light.kitchen
layout: comfortable
appearance:
  theme: auto
  preset: warm
  accent: "#ea8c55"
  radius: 24
  effects: low
```

## Arrange cards in Home Assistant

Use Home Assistant's dashboard editor to place cards. On versions supporting Sections
sizing, `grid_options` sets columns and rows. Medium cards default to 12 columns and 3 rows;
small switches use 6 columns and 3 rows, and extra-small switches use 6 columns and 2 rows.

Allow content height for disclosures and sub-controls:

```yaml
grid_options:
  columns: 12
  rows: auto
```

Home Assistant 2024.6.4 displays full-width custom cards in Sections. Cards also provide
Masonry sizing. Preview your dashboard on the phone or wall display where it will be used.

## Share appearance through a Home Assistant theme

Home Assistant themes can provide global card values:

```yaml
Navet:
  navet-card-accent: "#ea8c55"
  navet-card-radius: "24px"
```

Cards consume `--navet-card-accent`, `--navet-card-radius`, `--navet-card-background`,
`--navet-card-text`, `--navet-card-border`, and `--navet-card-font` CSS variables.
Per-card appearance overrides corresponding global values.
