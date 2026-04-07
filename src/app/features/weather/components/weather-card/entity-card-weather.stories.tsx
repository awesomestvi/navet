import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { WeatherCard } from '@/app/features/weather';
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
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
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

export const Playground: Story = {};

export const SunnyDay: Story = {
  args: {
    condition: 'sunny',
    temperature: 31,
    highTemp: 34,
    lowTemp: 22,
    rainForecast: '',
  },
};

export const MoonyNight: Story = {
  args: {
    condition: 'moony',
    temperature: 18,
    highTemp: 20,
    lowTemp: 14,
    rainForecast: '',
  },
};

export const CloudyDay: Story = {
  args: {
    condition: 'cloudy',
    temperature: 23,
    highTemp: 25,
    lowTemp: 19,
    rainForecast: '',
  },
};

export const Raining: Story = {
  args: {
    condition: 'rainy',
    temperature: 17,
    highTemp: 19,
    lowTemp: 15,
    rainForecast: 'Rain likely through evening',
  },
};

export const SnowDay: Story = {
  args: {
    condition: 'snow',
    temperature: -2,
    highTemp: 0,
    lowTemp: -5,
    rainForecast: 'Light snow around noon',
  },
};

export const SnowNight: Story = {
  args: {
    condition: 'snow-night',
    temperature: -6,
    highTemp: -4,
    lowTemp: -9,
    rainForecast: 'Flurries overnight',
  },
};

export const Windy: Story = {
  args: {
    condition: 'windy',
    windSpeed: 38,
    temperature: 16,
    highTemp: 18,
    lowTemp: 11,
    rainForecast: '',
  },
};

export const Thunderstorm: Story = {
  args: {
    condition: 'thunderstorm',
    temperature: 20,
    highTemp: 23,
    lowTemp: 17,
    rainForecast: 'Thunderstorm warning tonight',
  },
};

export const Foggy: Story = {
  args: {
    condition: 'fog',
    temperature: 12,
    highTemp: 14,
    lowTemp: 9,
    rainForecast: '',
  },
};
