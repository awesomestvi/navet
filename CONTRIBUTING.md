# Contributing to Navet

Thank you for your interest in contributing to Navet! This document provides guidelines for contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## 🤝 Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Git
- Basic knowledge of React, TypeScript, and Tailwind CSS

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/navet.git
   cd navet
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/awesomestvi/navet.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   pnpm setup:hooks
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

## 💻 Development Process

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, maintainable code
   - Follow existing patterns and conventions
   - Test your changes thoroughly
   - Update docs whenever dashboard behavior, settings, workflows, or user-facing controls change

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(dashboard): add amazing new feature"
   ```

4. **Keep your branch updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Fill out the PR template
   - Link any related issues

### CI and local checks

Pull requests and pushes to `main` run **GitHub Actions** (`.github/workflows/ci.yml`) in this order:

1. `pnpm check` — Biome lint and format
2. `pnpm check:stories` — Storybook title and ownership rules
3. `pnpm typecheck` — TypeScript (`tsc --noEmit`)
4. `pnpm test` — Vitest unit tests
5. `pnpm build` — production Vite build

Before opening a PR, run the same sequence locally (or at minimum `pnpm check`, `pnpm typecheck`, and `pnpm test`) so CI stays green.

[Dependabot](.github/dependabot.yml) opens weekly PRs for npm dependency updates; review them for breaking changes before merge.

### Package layout note

`react` and `react-dom` are listed as **optional** `peerDependencies` so Storybook and other tooling can resolve the workspace without forcing duplicate peer installs in every scenario. The app still expects React 18 at runtime; keep `peerDependencies` versions aligned with what Vite and Storybook use.

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` types when possible
- Use meaningful variable and function names

### React Components

- Use functional components with hooks
- Keep components focused on a single responsibility
- Follow existing patterns and the architecture rules in `AGENTS.md` and `src/app/components/README.md`

### Styling

- Use Tailwind CSS utility classes
- Use `getThemeSurfaceTokens` for theme-aware surface decisions instead of inline `theme === ...` branches
- Respect the spacing system (xs=4px, sm=8px, md=12px, lg=16px, xl=24px, xxl=32px)

### File Organization

```
/src/app
  ├── components/primitives/ # Low-level reusable UI building blocks
  ├── components/patterns/   # Composed shared UI structures
  ├── components/system/     # Curated public export surface for shared UI
  ├── components/shared/     # App-specific shared UI + compatibility shims
  ├── components/layout/   # App shell layout pieces
  ├── features/            # Feature-owned modules, hooks, and stores
  ├── contexts/            # App-shell React contexts
  ├── hooks/               # Truly shared hooks
  ├── stores/              # Shared app stores/selectors
  ├── navigation/          # Section definitions and shared nav metadata
  └── utils/               # Shared utilities only
```

- Prefer feature-owned modules over generic global folders when the code belongs to one feature
- Put new low-level reusable UI under `src/app/components/primitives/`
- Put new composed shared UI under `src/app/components/patterns/`
- Re-export stable shared UI through `src/app/components/system/`
- Treat `src/app/components/shared/` as app-specific shared UI or compatibility shims, not the default home for new primitives
- Use `@/app/...` imports for shared app modules and cross-feature imports

### Naming Conventions

- **Components**: PascalCase (`MyComponent.tsx`)
- **Hooks**: camelCase with `use` prefix (`useMyHook.ts`)
- **Utilities**: camelCase (`myUtil.ts`)
- **Types**: PascalCase (`MyType.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`MY_CONSTANT`)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- Format: `type(scope): summary`
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Version bumps follow the beta semver policy in [docs/VERSIONING.md](docs/VERSIONING.md). While Navet is in beta, prefer `0.x.y` and `0.x.y-beta.n` over `1.0.0`.

Examples:
```
feat(calendar): add source selection to card settings
fix(search): match Home Assistant entity-id queries
docs(readme): update appearance and search behavior
style(settings): tighten preview card spacing
refactor(lighting): share light card surface tokens
```

### Pre-commit Hooks

Navet uses a repo-local pre-commit hook in `.githooks/pre-commit`.

After `pnpm install`, run:

```bash
pnpm setup:hooks
```

The hook currently enforces:

- `pnpm check` for Biome lint/format issues
- `pnpm check:stories` for Storybook title conventions, primitive/pattern story coverage, and colocated story ownership
- TypeScript regression detection by comparing `pnpm exec tsc --noEmit` output against the recorded baseline in `.typecheck-baseline.txt`
- A docs relevance check that blocks commits touching settings, dashboard behavior, or build/deploy workflow without a staged update to `README.md`, `CONTRIBUTING.md`, or `docs/`

If you intentionally change the TypeScript baseline, update `.typecheck-baseline.txt` and the relevant docs in the same commit.

## 📤 Submitting Changes

### Pull Request Guidelines

1. **Ensure your PR:**
   - Has a clear, descriptive title
   - References any related issues
   - Includes a detailed description of changes
   - Contains tests for new features (when applicable)
   - Updates documentation as needed
   - Follows the coding standards
   - Has been tested on multiple screen sizes

2. **PR Checklist:**
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings or errors
   - [ ] Shared UI is authored in `primitives/` or `patterns/` when appropriate, not added ad hoc to `shared/`
   - [ ] Storybook stories were added or updated for shared UI changes
   - [ ] `pnpm check:stories` passes for Storybook changes
   - [ ] Tested on mobile, tablet, and desktop
   - [ ] Tested in light and dark themes
   - [ ] All automated checks pass

3. **Review Process:**
   - Maintainers will review your PR
   - Address any feedback promptly
   - Make requested changes in new commits
   - Once approved, your PR will be merged

## 🐛 Reporting Bugs

### Before Submitting

1. Check existing issues to avoid duplicates
2. Ensure you're using the latest version
3. Test with different browsers if applicable

### Bug Report Template

```markdown
**Description**
A clear description of the bug.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox, Safari]
- Version: [e.g., 0.1.0-beta.1]

**Additional Context**
Any other context about the problem.
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists
2. Search existing feature requests
3. Provide a clear use case
4. Explain why this feature would be useful
5. Consider if it fits the project's goals

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature.

**Use Case**
Explain the problem this feature would solve.

**Proposed Solution**
How you envision this feature working.

**Alternatives Considered**
Other solutions you've thought about.

**Additional Context**
Mockups, examples, or references.
```

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (`AGPL-3.0-only`).

---

**Questions?** Feel free to open an issue or discussion on GitHub!
