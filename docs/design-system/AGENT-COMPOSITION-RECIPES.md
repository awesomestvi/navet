# Agent composition recipes

Choose the matching composition before writing UI. Inspect its current source contract with
`pnpm agent:components <name>` and open the linked story. These are authoring recipes for Navet's
React app; the shared hooks and theme context make them app-coupled. An export or passing story
does not establish a stable public API or complete accessibility coverage.

## Select a composition

| Intended behavior | Starting composition | Source example and review targets |
| --- | --- | --- |
| Compact device controls | `BaseCard` with its `title`, `header` or `actionRow` slots | [BaseCard](../../packages/app/src/components/primitives/base-card.stories.tsx): all supported sizes, long names, active/inactive and unavailable behavior. Keep one primary control path. |
| Controls with secondary configuration | Card variant of `BaseCardDialog`, `navigation="overflow"`, controls tab first | [Controls-first dialog](../../packages/app/src/components/patterns/card-dialog-overflow-menu.stories.tsx): More actions, edit name/room, secondary section, Back to controls, close/reopen. |
| Mobile detail or command sheet | `SheetSurface` directly containing `SheetSurfaceHeader` and body | [Sheet surface](../../packages/app/src/components/primitives/sheet-surface.stories.tsx): open on a phone, dismissal, scroll, long content and desktop visibility. |
| Settings form | Existing settings-dialog shell; `FieldBlock` around control primitives | [Field states](../../packages/app/src/components/patterns/field-block.stories.tsx): hint, required, error and disabled. Inspect a neighboring feature's settings dialog for save and cancellation behavior. |
| Dashboard summary | Existing feature summary inside the shared dashboard layout | [Dashboard guidance](../product/dashboard-principles.md) and the nearest summary implementation: reading order, condensed/expanded presentation and no-data behavior. Select its actual feature composition rather than assuming a generic summary-bar component. |
| Empty card or section | `CardEmptyState` inside `BaseCard`; `DashboardEmptyState` for sections | [Card empty states](../../packages/app/src/components/patterns/card-empty-state.stories.tsx) and [dashboard empty states](../../packages/app/src/components/patterns/dashboard-empty-state.stories.tsx): small/large sizes, optional action, no matches versus unconfigured content. |
| Unavailable device | Existing entity-card unavailable composition with normalized state | [Vacuum states](../../packages/app/src/features/vacuum/components/vacuum-card/entity-card-vacuum.stories.tsx): unavailable and missing data. Inspect the actual target device family; unavailable is distinct from empty or switched off. |

Use `@navet/app/ui-kit/primitives` and `@navet/app/ui-kit/patterns` for these imports. The
source-derived catalog records the import actually exported by each entrypoint. Source links
describe the composition; the running Storybook index or MCP discovery supplies current story IDs.

## Controls-first dialog

Choose one `BaseCardDialog` union variant. The card variant takes `tabs`; the modal, sheet and
fullscreen variants have different contracts. The overflow menu is owned by the card dialog.

```tsx
import { BaseCardDialog } from '@navet/app/ui-kit/primitives';
import { useTheme } from '@navet/app/hooks';
import { Palette, Sliders } from 'lucide-react';
import type { ReactNode } from 'react';

export function ControlsDialog({
  isOpen, onOpenChange, controls, settings,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  controls: ReactNode;
  settings: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <BaseCardDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Living room lamp"
      theme={theme}
      navigation="overflow"
      height="capped"
      tabs={[
        { key: 'controls', label: 'Controls', icon: Sliders, content: controls },
        { key: 'customize', label: 'Customize', icon: Palette, content: settings },
      ]}
    />
  );
}
```

Connect entity controls to Navet-owned state and commands routed to their owning provider. Use the
existing device editor for persisted name/room changes; this skeleton only composes supplied
content. Verify tab order, keyboard dismissal, focus containment and return, overflow navigation,
and reopened state. Record actual findings rather than assuming the shared shell proves them.

## Sheet header and body

```tsx
import { SheetSurface, SheetSurfaceHeader } from '@navet/app/ui-kit/primitives';
import type { ReactNode } from 'react';

export function DetailSheet({ isOpen, onOpenChange, children }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <SheetSurface isOpen={isOpen} onOpenChange={onOpenChange} title="Device details">
      <SheetSurfaceHeader
        title="Device details"
        closeLabel="Close device details"
        onClose={() => onOpenChange(false)}
      />
      {children}
    </SheetSurface>
  );
}
```

The header owns its chrome spacing. Apply body spacing to the body composition, not an extra
wrapper around the header. Default sheets are mobile-only; use `responsive` when the same focused
detail surface is intentionally available on desktop. Inspect both behaviors in a rendered preview.

## Form messaging

`FieldBlock` supplies visible label, hint and error layout. Associate the input ID with `htmlFor`,
use `Input`'s `invalid` prop, and associate descriptive text explicitly. A `required` indicator on
the wrapper does not set the control's native requirement.

```tsx
import { FieldBlock } from '@navet/app/ui-kit/patterns';
import { Input } from '@navet/app/ui-kit/primitives';

export function NameField({ value, onChange, error }: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <FieldBlock
      label="Card name"
      htmlFor="card-name"
      required
      hint={<span id="card-name-hint">Use a name your household recognizes.</span>}
      error={error ? <span id="card-name-error">{error}</span> : undefined}
    >
      <Input
        id="card-name"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        required
        invalid={Boolean(error)}
        aria-describedby={error ? 'card-name-error' : 'card-name-hint'}
      />
    </FieldBlock>
  );
}
```

Use unique IDs when multiple instances can coexist. The caller owns validation, save, cancellation
and persistence; pair this field with the existing settings workflow rather than adding a separate
save mechanism.

## Empty card with an optional action

Keep the card shell and empty-state pattern together. The caller owns card dimensions and the
configuration workflow. Supply both `actionLabel` and `onAction` for an action; omit them when
there is no supported destination. Import icons explicitly. Storybook test helpers belong only
in test stories, while a product caller supplies its own handler.

```tsx
import { BaseCard } from '@navet/app/ui-kit/primitives';
import { CardEmptyState } from '@navet/app/ui-kit/patterns';
import { Plus, Rss } from 'lucide-react';

export function EmptyFeedCard({ onConfigureFeeds }: { onConfigureFeeds?: () => void }) {
  return (
    <div className="h-40 w-40">
      <BaseCard size="small">
        <CardEmptyState
          title="No feeds selected"
          description="Select one or more providers for this card."
          icon={Rss}
          size="small"
          actionLabel={onConfigureFeeds ? 'Configure RSS providers' : undefined}
          actionIcon={Plus}
          onAction={onConfigureFeeds}
        />
      </BaseCard>
    </div>
  );
}
```

Review the existing small and large/no-action stories before adapting the pattern to another
card. This example proves composition and API compatibility; provider configuration, saved choices
and other card sizes need their own journey evidence. Product copy follows the feature's existing
translation workflow.

## Evidence for a UI approval package

Record the selected recipe, source contract, current commit and actual story IDs. Review realistic
data, the relevant sizes, touch and keyboard behavior, reduced motion and all four themes: glass,
dark, light and black. Include empty, unavailable, error and permission states where applicable.
Run relevant checks and rendered review on the changed surface and direct consumers of modified
shared components. State which cases were inspected and which remain outstanding. A default-state
test or an importable example proves only that narrow case.
