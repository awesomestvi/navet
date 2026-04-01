import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { WeatherCard } from '@/app/features/weather';
import { EntityCardStoryFrame, noopCardSizeChange } from './entity-card-story-frame';

function WeatherCardStory(args: Omit<ComponentProps<typeof WeatherCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <WeatherCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const forecast = [
  { day: 'Mon', condition: 'partly-cloudy', high: 7, low: 2 },
  { day: 'Tue', condition: 'rainy', high: 6, low: 1 },
  { day: 'Wed', condition: 'cloudy', high: 8, low: 3 },
  { day: 'Thu', condition: 'sunny', high: 10, low: 4 },
];

const meta = {
  title: 'Cards/Entity/Weather',
  component: WeatherCardStory,
  tags: ['autodocs'],
  args: {
    id: 'weather.home',
    location: 'Stockholm, Sweden',
    temperature: 6,
    condition: 'partly-cloudy',
    humidity: 72,
    windSpeed: 14,
    precipitation: 0.4,
    precipitationUnit: 'mm',
    sunrise: '06:22',
    sunset: '19:18',
    daylight: '12h 56m',
    rainForecast: 'Light rain expected after 18:00',
    forecast,
    forecastMode: 'weekly',
    highTemp: 7,
    lowTemp: 2,
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof WeatherCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Weekly: Story = {};

export const Hourly: Story = {
  args: {
    forecastMode: 'hourly',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};
