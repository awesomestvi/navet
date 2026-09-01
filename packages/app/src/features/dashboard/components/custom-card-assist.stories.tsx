import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { integrationStore } from '@navet/app/stores/integration-store';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useEffect } from 'react';

type AssistStoryArgs = {
  size: Extract<CardSize, 'tiny' | 'extra-small' | 'small'>;
};

function ConnectedHomeAssistantFixture({ children }: { children: ReactNode }) {
  useEffect(() => {
    const previous = integrationStore.getState();
    const registration = getProviderRuntimeRegistration('home_assistant');
    const previousConversationFeatureService = registration.conversationFeatureService;
    registration.conversationFeatureService = {
      getPipelines: async () => ({
        preferredPipelineId: 'home-assistant',
        pipelines: [
          {
            id: 'home-assistant',
            name: 'Home Assistant',
            language: 'en',
            conversationEngineId: 'conversation.home_assistant',
            supportsSpeechToText: true,
            supportsTextToSpeech: true,
          },
        ],
      }),
      startTextConversation: async (_request, listener) => {
        queueMicrotask(() => {
          listener({
            type: 'run-start',
            pipelineId: 'home-assistant',
            conversationId: 'storybook-conversation',
          });
          listener({
            type: 'response',
            conversationId: 'storybook-conversation',
            text: 'The living room lights are on.',
            responseType: 'action_done',
            continueConversation: true,
          });
          listener({ type: 'run-end' });
        });
        return { cancel: () => undefined };
      },
      startVoiceConversation: async () => ({
        cancel: () => undefined,
        sendAudio: () => undefined,
        finishAudio: () => undefined,
      }),
    };
    integrationStore.setState({
      ...previous,
      providerSessions: {
        ...previous.providerSessions,
        home_assistant: {
          providerId: 'home_assistant',
          connected: true,
          runtime: 'storybook',
        },
      },
      providerHealth: {
        ...previous.providerHealth,
        home_assistant: {
          ...previous.providerHealth.home_assistant,
          connected: true,
          connecting: false,
          reconnecting: false,
          lastError: null,
        },
      },
    });
    return () => {
      integrationStore.setState(previous);
      registration.conversationFeatureService = previousConversationFeatureService;
    };
  }, []);

  return children;
}

function AssistStoryPreview({ size }: AssistStoryArgs) {
  return (
    <ConnectedHomeAssistantFixture>
      <CustomWidgetStoryFrame
        card={buildCustomCard('assist', size, { providerId: 'home_assistant' })}
      />
    </ConnectedHomeAssistantFixture>
  );
}

const meta = {
  title: 'Cards/Custom/Assist',
  component: AssistStoryPreview,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['tiny', 'extra-small', 'small'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<AssistStoryArgs>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);
meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};

export default meta;
type Story = StoryObj<AssistStoryArgs>;

export const Playground: Story = { args: { size: 'small' } };
export const Tiny: Story = { args: { size: 'tiny' } };
export const ExtraSmall: Story = { args: { size: 'extra-small' } };
export const Small: Story = { args: { size: 'small' } };
