# Agent Skill for UX Writing

> Scale content quality through AI-powered design system enforcement

**🌐 [View website](https://content-designer.github.io/ux-writing-skill/)**
**📄 [Read docs](https://content-designer-ux-writing-skill-26.mintlify.app/introduction)**

An [agent skill](https://agentskills.io/) that enables Claude, Codex, and Cursor to write and edit user-centered interface copy (UX text/microcopy) for digital products. This skill transforms AI assistants into specialized UX writing tools that apply consistent standards, patterns, and voice across your product.

## The Problem

Design systems solve visual consistency, but content quality still depends on individual writers. Every error message, button label, and empty state requires manual review to ensure it's clear, concise, conversational, and purposeful. This doesn't scale.

## The Solution

This agent skill packages UX writing expertise into a system your agent can apply automatically. Instead of asking "make this better," you can rely on consistent, evidence-based improvements across your entire product interface.

## What Makes This Different

**Systems thinking, not style guides**: This isn't a list of writing tips. It's a framework for evaluating and improving UX text based on four measurable quality standards.

**Progressive disclosure**: Reference materials are loaded only when needed, keeping Claude's context efficient while providing deep expertise on demand.

**Proven patterns**: Built from real-world UX writing best practices, with examples across different product voices and contexts.

**Immediately actionable**: Every pattern includes concrete before/after examples and scoring against quality standards.

## What You Get

### Core Framework
- **Four quality standards**: Purposeful, Concise, Conversational, Clear
- **Common UX patterns**: Buttons, errors, empty states, forms, notifications, onboarding
- **Editing process**: Systematic approach to improving any interface text
- **Voice and tone guidance**: Adapt content to brand personality and context
- **Accessibility guidelines**: Write for screen readers, cognitive accessibility, and WCAG compliance
- **Research-backed benchmarks**: Sentence length targets, comprehension rates, reading levels

### Reference Materials
- **Accessibility guidelines**: Comprehensive guide for writing inclusive, accessible UX text
- **Voice chart template**: Establish consistent brand personality
- **Content usability checklist**: Evaluate text quality with scoring framework
- **Detailed pattern examples**: See how different voices apply the same patterns

### Practical Tools
- **Real-world improvements**: Before/after transformations with analysis
- **Fillable templates**: Error messages, empty states, onboarding flows
- **Expanded error patterns**: Validation, system, blocking, and permission errors with examples
- **Tone adaptation framework**: Map emotional states to appropriate tone
- **Quick reference**: Common patterns and anti-patterns

## Use Cases

**For content designers**: Apply consistent UX writing standards across your product without memorizing every rule.

**For product teams**: Enable non-writers to create interface copy that follows your design system.

**For design system teams**: Enforce content guidelines at scale without becoming a bottleneck.

**For early-stage products**: Build content quality in from the start with proven patterns.

## Installation

### What You Need

This skill works with **Claude Desktop**, **Claude Code**, **Codex** (CLI and IDE extensions), and **Cursor**. Install it with the [skills CLI](https://skills.sh/docs/cli) — no manual download or file copying required.

**Note:** This skill works with Codex CLI/IDE, not ChatGPT. ChatGPT cannot install or use skills.

### Install with the Skills CLI

Run this command in your terminal:

```bash
npx skills add content-designer/ux-writing-skill
```

The CLI downloads the skill and configures it automatically for your agent. Restart your agent or IDE after installation.

**Verify it's working** by asking your agent:

```
Write an error message for when a payment fails
```

Your agent will apply UX writing best practices and produce a clear, empathetic error message.

### For Teams: Project Installation

Want your whole team to use this skill automatically? Run the CLI from your project root:

```bash
npx skills add content-designer/ux-writing-skill
```

Then commit the installed skill files to your repository. Teammates get the skill when they pull the code.

## Figma Integration

**Review and improve UX copy directly from your Figma designs!**

Connect this skill to Figma through your agent to analyze mockups, audit copy, and suggest improvements based on UX writing best practices. Perfect for:
- Content designers reviewing flows before launch
- Product teams iterating on copy in designs
- Design QA and accessibility audits
- Cross-platform consistency checks

**📖 Setup guide for all agents:** [docs/figma-integration.md](docs/figma-integration.md)

## Usage Examples

### Basic Usage

```
Write an error message for when a payment fails
```

Your agent applies the skill automatically and generates clear, actionable error messages following best practices.

### Editing Existing Copy

```
Review this button label: "Submit your information for processing"
```

Your agent evaluates against the four quality standards and suggests improvements.

### Creating Consistent Patterns

```
Create empty state copy for a task list, keeping voice consistent with:
- Purposeful, Concise, Conversational, Clear
- Professional but friendly tone
```

Your agent applies the appropriate patterns and maintains voice consistency.

### Evaluating Quality

```
Score this error message:
"An error occurred. Please try again later."
```

Your agent uses the content usability checklist to provide detailed scoring and improvement suggestions.

## How It Works

This skill uses **model-invoked activation** — Claude, Codex, and Cursor automatically decide when to use it based on your request. You don't need to explicitly call the skill; it activates when you:

- Write or edit interface copy
- Create error messages, notifications, or empty states
- Work on button labels, form fields, or instructions
- Review product content for consistency
- Establish voice and tone guidelines

The AI loads reference materials progressively, using only what's needed for your specific task to maintain efficient context usage.

**In Codex**, you can also explicitly invoke the skill using `$ux-writing` or through the `/skills` command. **In Cursor**, use `@ux-writing` or reference the skill by name in your prompt.

## What You'll Learn

Using this skill exposes the systematic thinking behind effective UX writing:

- How to evaluate content objectively with scoring frameworks
- Why certain patterns work across different product contexts
- How voice stays consistent while tone adapts to situations
- The difference between writing for clarity vs. writing for personality

## For Content Design Teams

This skill can serve as:

- **Onboarding tool**: New team members learn patterns faster
- **Quality baseline**: Consistent standards across all writers
- **Efficiency multiplier**: Generate first drafts that follow guidelines
- **System documentation**: Reference materials that never go stale

## Credits

Built by [Christopher Greer](https://www.linkedin.com/in/christopher-greer/), Staff Content Designer at Stripe, based on established UX writing principles from:

- Content Design by Sarah Richards
- Strategic Writing for UX by Torrey Podmajersky
- Nicely Said by Kate Kiefer Lee and Nicole Fenton
- Google Material Design writing guidelines
- Years of practical application building design systems

## Contributing

Contributions welcome! If you have:

- Additional reference patterns
- More real-world examples
- Template improvements
- Translations to other languages

Please open an issue or submit a pull request.

### Building the Skill Package

If you're contributing or want to build the skill ZIP locally:

```bash
./build-skill.sh
```

This creates `dist/ux-writing-skill.zip` containing only the skill files (`SKILL.md`, `docs/`, `examples/`, `references/`, `templates/`).

The build script excludes repository files like `README.md`, `CONTRIBUTING.md`, `index.html`, and the demo video — these live on GitHub but aren't needed in the skill package.

## License

MIT License — use this skill freely in your projects and teams.

## Related Work

Looking for more agent skills?

- Learn about the standard: [agentskills.io](https://agentskills.io/)
- Browse skills on [skills.sh](https://skills.sh)
- Install skills with the [skills CLI](https://skills.sh/docs/cli)

**For Claude**

- Browse the [Claude Code Skills collection](https://github.com/anthropics/skills)
- Learn about [agent skills architecture](https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills)
- Read [best practices for authoring skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**For Codex**

- Explore [Codex Agent Skills documentation](https://developers.openai.com/codex/skills/)
- Learn how to [create custom skills](https://developers.openai.com/codex/skills/create-skill)
- Join the [OpenAI Developer Community](https://community.openai.com/) to discuss skills

**For Cursor**

- Read about [Cursor Agent Skills](https://cursor.com/docs/context/skills)

## Why This Matters

Content is infrastructure. Every button label, error message, and empty state shapes how people understand and use your product. Good UX writing shouldn't depend on having an expert review every string.

This skill makes UX writing excellence systematic, scalable, and consistent — exactly what design systems do for visual design.

---

**Status**: Production-ready • **Version**: 1.6.0 • **Last updated**: March 2026
