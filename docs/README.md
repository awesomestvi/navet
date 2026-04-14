# Navet Documentation

Complete documentation for the Navet smart home dashboard.

## 🚀 Quick Start

1. **[Main README](../README.md)** - Start here for project overview
2. **[Contributing](../CONTRIBUTING.md)** - How to contribute
3. **[Branding](branding/BRANDING.md)** - Brand identity and usage
4. **[Logo Showcase](LOGO_SHOWCASE.md)** - Visual brand assets
5. **[Versioning](VERSIONING.md)** - Beta release and version bump policy

## 📚 Documentation Structure

### User & Deployment
- **[Main README](../README.md)** - Project overview, features, installation, and usage guide
- **[Widget System](WIDGETS.md)** - Custom widgets: adding, managing, creating, and API reference
- **[Docker and Home Assistant Add-on](DOCKER_HOME_ASSISTANT_ADDON.md)** - Standalone Docker and HA add-on deployment
- **[Versioning](VERSIONING.md)** - Beta release numbering and bump rules
- **[Roadmap](ROADMAP.md)** - Planned features and shipped history

### Design & Architecture
- **[Design System](../design-system/README.md)** - Design principles, card sizes, breakpoints, and key files
- **[Storybook Foundation](../design-system/STORYBOOK_FOUNDATION.md)** - Internal system entrypoints and the recommended in-repo Storybook path
- **[UI Guidelines](../design-system/UI-GUIDELINES.md)** - Color system, typography, glass effects, component patterns
- **[Layout Structure](../design-system/LAYOUT-STRUCTURE.md)** - Sidebar, header, grid, responsive layout
- **[Features](../design-system/FEATURES.md)** - Auth, theme system, navigation, media/security/entity cards, dashboard builder
- **[Moodboard](../design-system/MOODBOARD.md)** - Design inspiration and visual direction
- **[React + Zustand Guide](technical/REACT_ZUSTAND.md)** - Shared state rules, persistence contracts, and controller/store integration patterns

### Branding
- **[Branding Guide](branding/BRANDING.md)** - Brand identity, voice, logo usage guidelines
- **[Branding Assets](branding/BRANDING_ASSETS.md)** - Logo files quick reference and copy-paste snippets
- **[Logo Showcase](LOGO_SHOWCASE.md)** - All logo variations with usage examples
- **[Trademark Policy](branding/TRADEMARK_POLICY.md)** - Navet name and logo usage rules

### Legal & Credits
- **[License](../LICENSE.md)** - AGPL-3.0-only code license
- **[Terms of Use](TERMS_OF_USE.md)** - License and brand usage summary
- **[Attributions](ATTRIBUTIONS.md)** - Third-party credits
- **[Change History](archive/CHANGES.md)** - Major migrations and project history

## 🎯 Common Tasks

**Add a new widget** → [Widget System](WIDGETS.md)

**Contribute to the project** → [Contributing Guide](../CONTRIBUTING.md)

**Match CI before a PR** → [Contributing: CI and local checks](../CONTRIBUTING.md#ci-and-local-checks) (Biome, Storybook standards, `typecheck`, `test`, `build`)

**Bump a release version** → [Versioning](VERSIONING.md)

**Understand the design system** → [Design System](../design-system/README.md)

**Run the UI workshop** → [Storybook Foundation](../design-system/STORYBOOK_FOUNDATION.md)
Current workshop coverage includes theme docs, primitives/patterns/shared component layers, app shell, cards (entity + custom), dashboard flows, energy, and settings dialogs.

**Run Navet in Docker or as a Home Assistant add-on** → [Docker and Home Assistant Add-on](DOCKER_HOME_ASSISTANT_ADDON.md)

**Use Navet branding** → [Branding Guide](branding/BRANDING.md)

**Check the license** → [License](../LICENSE.md), [Terms of Use](TERMS_OF_USE.md), [Trademark Policy](branding/TRADEMARK_POLICY.md)

**Learn about project history** → [Change History](archive/CHANGES.md)

**Review state and controller contracts** → [React + Zustand Guide](technical/REACT_ZUSTAND.md)

---

**Last Updated:** April 15, 2026
