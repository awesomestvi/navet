import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { WeatherCard } from '@/app/features/weather';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function WeatherCardStory(args: Omit<ComponentProps<typeof WeatherCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <WeatherCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const forecast = [
  { day: 'Mon', condition: 'partly-cloudy', high: 7, low: 2 },
  { day: 'Tue', condition: 'rainy', high: 6, low: 1 },
  { day: 'Wed', condition: 'cloudy', high: 8, low: 3 },
  { day: 'Thu', condition: 'sunny', high: 10, low: 4 },
  { day: 'Fri', condition: 'cloudy', high: 9, low: 5 },
  { day: 'Sat', condition: 'rainy', high: 8, low: 4 },
  { day: 'Sun', condition: 'sunny', high: 11, low: 6 },
];

const meta = {
  title: 'Cards/Entity/Weather',
  component: WeatherCardStory,
  tags: ['autodocs'],
  argTypes: {
    condition: {
      control: 'select',
      options: [
        'sunny',
        'moony',
        'partly-cloudy',
        'cloudy',
        'rainy',
        'snow',
        'snow-night',
        'windy',
        'thunderstorm',
        'fog',
      ],
    },
    forecastMode: {
      control: 'inline-radio',
      options: ['hourly', 'weekly'],
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
  args: {
    id: 'weather.home',
    location: 'Stockholm, Sweden',
    temperature: 4,
    condition: 'rainy',
    humidity: 88,
    windSpeed: 22,
    precipitation: 2.9,
    precipitationUnit: 'mm',
    sunrise: '06:22',
    sunset: '19:18',
    daylight: '12h 56m',
    rainForecast: 'Steady rain for next 4h',
    forecast,
    forecastMode: 'hourly',
    highTemp: 5,
    lowTemp: 1,
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof WeatherCardStory>;

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

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
