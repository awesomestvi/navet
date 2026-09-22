import type { Meta, StoryObj } from '@storybook/react-vite';
import { SkipLink } from './skip-link';

const meta = {
  title: 'Components/Primitives/Skip Link',
  component: SkipLink,
  tags: ['autodocs'],
  args: {
    targetId: 'story-main-content',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Keyboard shortcut to the main content. Press Tab from the start of the page to reveal the link, then Enter to move focus past navigation.',
      },
    },
  },
} satisfies Meta<typeof SkipLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="min-h-48 p-4">
      <SkipLink {...args} />
      <nav aria-label="Example navigation" className="mb-8">
        Example navigation
      </nav>
      <main id={args.targetId} tabIndex={-1}>
        Main content
      </main>
    </div>
  ),
};
