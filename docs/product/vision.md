# Navet Product Vision

This document defines durable product intent. Feature plans, implementation conventions, and
current code must be interpreted through it. Changes require explicit maintainer approval.

## Purpose

Navet is a self-hosted smart-home dashboard for everyday household control across wall displays,
tablets, desktops, and phones. It turns the platforms people already run into a calmer, room-first
interface without replacing those platforms as the source of truth.

## Product Promise

Navet should make the state of a home understandable at a glance and make common actions feel
immediate. It should remain useful to the whole household, not only to the person who configured
the smart home.

## Enduring Principles

- Local ownership: credentials, provider data, and household configuration stay on the user's
  device or server unless the user deliberately connects an external service.
- Provider neutrality: Home Assistant, Homey, openHAB, and future providers are peers behind
  Navet-owned contracts. Capability differences remain honest and visible.
- Room-first control: organize daily actions around where they happen and what people need, not
  around backend entity registries.
- Screen adaptability: preserve one understandable interaction model while adapting composition
  and density to the available screen and input method.
- Calm utility: prioritize live state, exceptions, and likely actions over admin detail, novelty,
  decoration, or configuration density.
- Open participation: keep the product inspectable, self-hostable, and understandable to
  contributors without weakening security or household privacy.

## Non-goals

Navet is not a replacement automation engine, a cloud account service, a generic Home Assistant
skin, or a showcase for every provider field. It does not pretend unsupported provider
capabilities exist, and it does not trade household usability for maximum configurability.

## Decision Test

When several technically valid implementations exist, prefer the one that makes ordinary
household control clearer, preserves local ownership, keeps provider knowledge at the adapter
boundary, and behaves coherently across screens.
