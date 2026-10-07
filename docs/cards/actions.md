---
title: Actions and sub-controls
description: Configure title actions, shortcuts, and small related-device controls.
editUrl: https://github.com/navet-app/navet/edit/main/docs/cards/actions.md
---

Edit a card to configure its title actions through the Home Assistant action selectors.
Use YAML for advanced action data and conditional visibility.

## Title actions

Light and switch titles toggle by default. Most other entity titles open Home Assistant
entity details (**more-info**); room titles open their room dialog. Labeled buttons and
sliders perform their own device controls. The settings control opens entity details.

`tap_action`, `hold_action`, and `double_tap_action` apply to the card title.
Keyboard activation performs the tap action.

| Action | Configuration |
| --- | --- |
| `none` | Disable the configured title action |
| `more-info` | Open entity details |
| `toggle` | Toggle a light, switch, or fan card |
| `navigate` | Set `navigation_path` to a local dashboard path or room hash |
| `perform-action` | Set `perform_action` to a Home Assistant action, with optional `target` and `data` |

This example navigates on tap and asks for confirmation before running a scene on hold:

```yaml
type: custom:navet-light-card
entity: light.kitchen
tap_action:
  action: navigate
  navigation_path: /lovelace/kitchen
hold_action:
  action: perform-action
  perform_action: scene.turn_on
  target:
    entity_id: scene.kitchen_evening
  data:
    transition: 2
  confirmation:
    text: Activate the kitchen evening scene?
```

Replace the entities and navigation path with your own. `confirmation` accepts a boolean
or an object with `text`. Home Assistant enforces account permissions; a denied action
shows a permission explanation that **Close** dismisses.

## Sub-controls

Use **Sub-controls → Add sub-control** in the visual editor to add up to eight related
entity controls. Select an entity, optional name, and control type: `state`, `toggle`,
`slider`, or `select`. Controls appear only for supported capabilities.

```yaml
type: custom:navet-light-card
entity: light.kitchen
layout: row
sub_controls:
  - entity: switch.coffee_machine
    name: Coffee
    control: toggle
  - entity: sensor.kitchen_temperature
    control: state
    visible_when:
      entity: input_boolean.show_room_readings
      state: "on"
```

The sub-control name opens entity details. An optional `tap_action` changes that behavior
and defaults action targets to the sub-control entity. `visible_when` compares one entity's
state. Advanced YAML conditions and action data survive visual editing.

## Dedicated action buttons

Use a button card for a scene, script, button entity, or configured action:

```yaml
type: custom:navet-button-card
name: Evening routine
tap_action:
  action: perform-action
  perform_action: scene.turn_on
  target:
    entity_id: scene.evening
```
