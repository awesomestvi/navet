# Changelog

All notable changes to the UX Writing Skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-03

### Added
- **Cursor Support**: Full compatibility with Cursor; added to supported agents in README, SKILL.md, and all documentation
- **Skills CLI Installation**: Replaced per-tool install instructions with a single universal command (`npx skills add content-designer/ux-writing-skill`)
- **Unified Figma Integration Guide**: New `docs/figma-integration.md` covering Claude, Codex, and Cursor in one place

### Changed
- Updated README title and intro to reference Claude, Codex, and Cursor
- Simplified Installation section — single CLI command replaces three separate step-by-step guides
- Simplified Figma Integration section in README to link to the consolidated guide
- Made usage examples and explanations tool-agnostic throughout README

### Removed
- `docs/claude-figma-integration.md` (content merged into `docs/figma-integration.md`)
- `docs/codex-figma-integration.md` (content merged into `docs/figma-integration.md`)

---

## [1.5.0] - 2026-01

### Added
- **OpenAI Codex Support**: Full compatibility with Codex CLI and IDE extensions
- **Codex Installation Guide**: Step-by-step instructions for Codex users
- **Codex Figma Integration**: New guide at `docs/codex-figma-integration.md`
- **Multi-Platform Documentation**: Updated README and website for Claude + Codex

### Changed
- Renamed `docs/figma-integration.md` to `docs/claude-figma-integration.md` for clarity
- Updated website to reflect multi-platform support
- Various terminology fixes (Codex = CLI/IDE, not ChatGPT)

---

## [1.4.0] - 2025-12-24

### Added
- **Smithery Registry**: Listed in Smithery skills registry for discoverability
- **Smithery Badge**: Added badge to README for easy installation

---

## [1.3.0] - 2025-11-11

### Added
- **GitHub Pages Website**: Interactive landing page at content-designer.github.io/ux-writing-skill
- **Video Demonstration**: Embedded demo showing skill in action
- **Auto-Rebuild Workflow**: GitHub Action to automatically rebuild skill ZIP on changes

### Changed
- Reorganized skill packaging for cleaner distribution
- Improved download links and installation flow
- Enhanced modal windows with drag and resize functionality

---

## [1.2.0] - 2025-11-10

### Added
- **Figma Integration Guide**: New guide at `docs/figma-integration.md` for reviewing UX copy directly from Figma designs
- **Improved Installation Instructions**: Clearer steps for non-technical users

---

## [1.1.0] - 2025-11-10

### Added
- **Accessibility Guidelines**: Comprehensive accessibility section in SKILL.md covering:
  - Screen reader optimization (ARIA labels, descriptive links, accessible buttons)
  - Cognitive accessibility (sentence length targets, plain language)
  - Multi-modal communication (not relying on color alone)
  - Accessible pattern examples with do/don't comparisons
- **New Reference**: accessibility-guidelines.md with deep-dive coverage of:
  - WCAG principles for UX writers (Perceivable, Operable, Understandable, Robust)
  - Screen reader best practices with detailed examples
  - Cognitive accessibility research (8 words = 100% comprehension)
  - Plain language guidelines by audience type
  - Writing for translation and localization
  - High-stress context considerations
  - Testing methods and tools
  - Quick reference accessibility checklist
- **UX Text Benchmarks**: Research-backed metrics section including:
  - Sentence length targets by content type (buttons, titles, errors, instructions)
  - Comprehension rates (8 words = 100%, 14 words = 90%)
  - Character and line length optimal ranges
  - Reading level guidelines by audience (general, professional, technical)
  - Testing tools recommendations (Hemingway, Readable.com, MS Word)
- **Expanded Error Patterns**: Detailed error message types with timing and location:
  - Validation errors (inline) with examples and patterns
  - System errors (modal/banner) with recovery flows
  - Blocking errors (full-screen) with resolution paths
  - Permission errors with benefit-first framing
  - Comprehensive "what to avoid" guidance
- **Tone Adaptation Framework**: Structured approach to tone variation:
  - Tone variables (purpose, context, emotional state, stakes)
  - Tone adaptation by user emotional state (frustrated, confused, confident, cautious, successful)
  - Tone adaptation by content type (errors, success, instructions, onboarding, confirmations, empty states)
  - Concrete examples for each tone context

### Improved
- Enhanced skill description to include accessibility, benchmarks, and expanded frameworks
- Updated Common Mistakes section to include accessibility anti-patterns
- Expanded Resources section to reference new accessibility guidelines

### Context
This update addresses key gaps identified through research of public content design systems (Intuit, IBM Carbon, Material Design, Shopify Polaris, Atlassian) and incorporates industry-standard accessibility practices, quantifiable metrics, and expanded frameworks while maintaining copyright compliance through original synthesis and examples.

---

## [1.0.0] - 2025-11-10

### Added
- Initial release of UX Writing Skill
- Core SKILL.md with four quality standards framework
- Reference materials:
  - Voice chart template for establishing brand personality
  - Content usability checklist for evaluating text quality
  - Detailed pattern examples across three different product voices
- Examples directory with real-world improvements:
  - Before/after transformations with scoring analysis
  - Common improvement patterns and anti-patterns
  - Quick self-audit questions
- Templates directory with fillable guides:
  - Error message template with multiple formats
  - Empty state template for different scenarios
  - Onboarding flow template with step-by-step guidance
- MIT License for open source distribution
- Comprehensive README.md positioning the skill strategically

### Features
- Model-invoked activation for automatic skill usage
- Progressive disclosure of reference materials
- Scoring framework for objective content evaluation
- Voice and tone adaptation guidance
- Multi-file structure for efficient context loading

---

## Future Considerations

Potential additions for future versions:

### Reference Materials
- Voice assistant and conversational UI patterns
- Mobile vs. desktop copy considerations
- Industry-specific pattern libraries (fintech, healthcare, e-commerce)

### Templates
- Product announcement templates
- Feature release copy templates
- Marketing vs. product copy guidelines
- Email notification templates

### Examples
- More industry-specific examples (fintech, healthcare, e-commerce)
- Complex flow examples (multi-step forms, checkout processes)
- Voice variation examples (formal, casual, technical)
- Accessibility improvements

### Tools
- Content audit worksheet
- Voice and tone decision tree
- Readability scoring guide
- Translation preparation checklist

---

**Note**: Version numbers follow semantic versioning:
- Major version (X.0.0): Breaking changes to skill structure or API
- Minor version (0.X.0): New features, templates, or reference materials
- Patch version (0.0.X): Bug fixes, typo corrections, small improvements
