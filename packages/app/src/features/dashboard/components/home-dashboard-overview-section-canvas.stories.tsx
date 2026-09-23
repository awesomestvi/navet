import { DndContext } from '@dnd-kit/core';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { SectionCanvas } from './home-dashboard-overview-section-canvas';

function SectionEditorStory() {
  const { theme, accentColor } = useTheme();
  const [title, setTitle] = useState('Daily controls');
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className={`min-h-[18rem] p-4 sm:p-6 ${surface.appBg} ${surface.textPrimary}`}>
      <DndContext>
        <SectionCanvas
          sectionId="daily-controls"
          title={title}
          gridCols={4}
          isActive
          accentColor={accentColor}
          cardIds={[]}
          allCards={new Map()}
          cardSizes={{}}
          updateCardSize={() => {}}
          isEditMode
          onRemoveFromLayout={() => {}}
          showHero={false}
          onSelectSection={() => {}}
          onOpenLibraryForSection={() => {}}
          onRenameSection={(_sectionId, nextTitle) => setTitle(nextTitle)}
          onRemoveSection={() => {}}
          span={2}
          layoutCols={4}
          minWidthsBySection={{ 'daily-controls': 1, 'other-section': 1 }}
          rowSiblingCount={2}
          onResizeSection={() => {}}
          surface={surface}
        />
      </DndContext>
    </div>
  );
}

const meta = {
  title: 'Pages/Dashboard/Edit Section',
  component: SectionEditorStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SectionEditorStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RenameSection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', { name: 'Section name' });

    await expect(editor).toBeVisible();
    await userEvent.clear(editor);
    await userEvent.type(editor, 'Evening controls');
    await expect(editor).toHaveValue('Evening controls');
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    await expect(editor).toHaveFocus();
    await expect(getComputedStyle(editor).boxShadow).not.toBe('none');
  },
};
