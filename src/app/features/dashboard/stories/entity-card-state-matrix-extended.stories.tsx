import type { Meta, StoryObj } from '@storybook/react';
import { CalendarCard } from '@/app/features/calendar';
import { SwitchCard } from '@/app/features/lighting';
import { PersonCard } from '@/app/features/person';
import { SceneCard } from '@/app/features/scenes';
import { CameraCard, CoverCard, LockCard } from '@/app/features/security';
import { GroupedSensorCard } from '@/app/features/sensors';
import { VacuumCard } from '@/app/features/vacuum';
import { WeatherCard } from '@/app/features/weather';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import cameraSampleImage from '@/assets/camera-sample.webp';

function toIsoDate(dayOffset: number, hours: number, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

const weatherForecast = [
  { day: 'Mon', condition: 'partly-cloudy', high: 7, low: 2 },
  { day: 'Tue', condition: 'rainy', high: 6, low: 1 },
  { day: 'Wed', condition: 'cloudy', high: 8, low: 3 },
  { day: 'Thu', condition: 'sunny', high: 10, low: 4 },
  { day: 'Fri', condition: 'cloudy', high: 9, low: 5 },
  { day: 'Sat', condition: 'rainy', high: 8, low: 4 },
  { day: 'Sun', condition: 'sunny', high: 11, low: 6 },
];

const calendarEvents = [
  {
    id: '1',
    title: 'Design review',
    startTime: '10:00',
    endTime: '10:45',
    timeDisplay: '10:00',
    type: 'meeting' as const,
    color: '#60a5fa',
    sortKey: toIsoDate(0, 10, 0),
  },
  {
    id: '2',
    title: 'Call with installer',
    startTime: '13:00',
    endTime: '13:30',
    timeDisplay: '13:00',
    type: 'call' as const,
    color: '#34d399',
    sortKey: toIsoDate(1, 13, 0),
  },
];

const groupedSensors = [
  { id: 'sensor.temp', label: 'Temp', value: '22.4', unit: 'C', icon: 'thermometer' as const },
  { id: 'sensor.hum', label: 'Humidity', value: '47', unit: '%', icon: 'droplets' as const },
  { id: 'sensor.co2', label: 'CO2', value: '510', unit: 'ppm', icon: 'gauge' as const },
  { id: 'sensor.pm25', label: 'PM2.5', value: '8', unit: 'ug/m3', icon: 'activity' as const },
];

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function StateMatrixExtendedPage() {
  return (
    <div className="space-y-8">
      <CardSection title="Switch + Helper states">
        <SwitchCard
          id="switch.espresso_machine"
          name="Espresso Machine"
          size="medium"
          initialState
          entityType="switch"
          serviceDomain="switch"
          serviceAction="toggle"
          isEditMode={false}
          power={1140}
          voltage={230}
          energy={2.6}
        />
        <SwitchCard
          id="switch.espresso_machine"
          name="Espresso Machine"
          size="medium"
          initialState={false}
          entityType="switch"
          serviceDomain="switch"
          serviceAction="toggle"
          isEditMode={false}
          power={0}
          voltage={230}
          energy={2.6}
        />
        <SwitchCard
          id="input_boolean.guest_mode"
          name="Guest Mode"
          size="tiny"
          initialState
          entityType="helper"
          serviceDomain="input_boolean"
          serviceAction="toggle"
          isEditMode={false}
        />
      </CardSection>

      <CardSection title="Weather states">
        <WeatherCard
          id="weather.home"
          location="Stockholm, Sweden"
          temperature={6}
          condition="partly-cloudy"
          humidity={72}
          windSpeed={14}
          precipitation={0.4}
          precipitationUnit="mm"
          sunrise="06:22"
          sunset="19:18"
          daylight="12h 56m"
          rainForecast="Light rain expected after 18:00"
          forecast={weatherForecast}
          forecastMode="weekly"
          highTemp={7}
          lowTemp={2}
          size="medium"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <WeatherCard
          id="weather.home"
          location="Stockholm, Sweden"
          temperature={4}
          condition="rainy"
          humidity={88}
          windSpeed={22}
          precipitation={2.9}
          precipitationUnit="mm"
          sunrise="06:22"
          sunset="19:18"
          daylight="12h 56m"
          rainForecast="Steady rain for next 4h"
          forecast={weatherForecast}
          forecastMode="hourly"
          highTemp={5}
          lowTemp={1}
          size="large"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <WeatherCard
          id="weather.home"
          location="Stockholm, Sweden"
          temperature={10}
          condition="sunny"
          humidity={45}
          windSpeed={8}
          precipitation={0}
          precipitationUnit="mm"
          sunrise="06:22"
          sunset="19:18"
          daylight="12h 56m"
          rainForecast="No rain expected"
          forecast={weatherForecast}
          forecastMode="weekly"
          highTemp={12}
          lowTemp={5}
          size="small"
          onSizeChange={() => {}}
          isEditMode
        />
      </CardSection>

      <CardSection title="Vacuum states">
        <VacuumCard
          id="vacuum.robby"
          name="Robby"
          room="Ground Floor"
          status="cleaning"
          battery={74}
          cleanedArea="42 m2"
          cleaningTime="38 min"
          size="medium"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <VacuumCard
          id="vacuum.robby"
          name="Robby"
          room="Ground Floor"
          status="returning"
          battery={32}
          cleanedArea="42 m2"
          cleaningTime="38 min"
          size="large"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <VacuumCard
          id="vacuum.robby"
          name="Robby"
          room="Ground Floor"
          status="docked"
          battery={100}
          cleanedArea="0 m2"
          cleaningTime="0 min"
          size="small"
          onSizeChange={() => {}}
          isEditMode={false}
        />
      </CardSection>

      <CardSection title="Person states">
        <PersonCard
          id="person.alex"
          name="Alex"
          room="Home"
          location="Office"
          state="home"
          size="medium"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <PersonCard
          id="person.alex"
          name="Alex"
          room="Home"
          location="Airport"
          state="away"
          size="medium"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <PersonCard
          id="person.alex"
          name="Alex"
          room="Home"
          location="Home"
          state="home"
          size="small"
          onSizeChange={() => {}}
          isEditMode
        />
      </CardSection>

      <CardSection title="Cover states">
        <CoverCard
          id="cover.living_room_blind"
          name="Living Room Blind"
          room="Living Room"
          initialPosition={72}
          initialDeviceClass="blind"
          size="medium"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <CoverCard
          id="cover.living_room_blind"
          name="Living Room Blind"
          room="Living Room"
          initialPosition={0}
          initialDeviceClass="blind"
          size="small"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <CoverCard
          id="cover.patio_curtain"
          name="Patio Curtain"
          room="Patio"
          initialPosition={92}
          initialDeviceClass="curtain"
          size="large"
          onSizeChange={() => {}}
          isEditMode={false}
        />
      </CardSection>

      <CardSection title="Lock states">
        <LockCard
          id="lock.front_door"
          name="Front Door"
          initialState
          size="medium"
          isEditMode={false}
        />
        <LockCard
          id="lock.front_door"
          name="Front Door"
          initialState={false}
          size="medium"
          isEditMode={false}
        />
        <LockCard
          id="lock.front_door"
          name="Front Door"
          initialState
          size="extra-small"
          isEditMode={false}
        />
      </CardSection>

      <CardSection title="Scene states">
        <SceneCard
          id="scene.movie_mode"
          name="Movie Mode"
          room="Living Room"
          size="medium"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <SceneCard
          id="scene.movie_mode"
          name="Movie Mode"
          room="Living Room"
          size="small"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <SceneCard
          id="scene.movie_mode"
          name="Movie Mode"
          room="Living Room"
          size="tiny"
          onSizeChange={() => {}}
          isEditMode
        />
      </CardSection>

      <CardSection title="Camera states">
        <CameraCard
          id="camera.front_door"
          name="Front Door Cam"
          room="Entrance"
          entityPicture={cameraSampleImage}
          size="medium"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <CameraCard
          id="camera.front_door"
          name="Front Door Cam"
          room="Entrance"
          entityPicture={cameraSampleImage}
          size="small"
          onSizeChange={() => {}}
          isEditMode={false}
        />
        <CameraCard
          id="camera.front_door"
          name="Front Door Cam"
          room="Entrance"
          entityPicture={cameraSampleImage}
          size="large"
          onSizeChange={() => {}}
          isEditMode
        />
      </CardSection>

      <CardSection title="Calendar states">
        <CalendarCard
          id="calendar.family"
          name="Family Calendar"
          room="Home"
          events={calendarEvents}
          inEditMode={false}
          size="medium"
          onSizeChange={() => undefined}
        />
        <CalendarCard
          id="calendar.family"
          name="Family Calendar"
          room="Home"
          events={calendarEvents}
          inEditMode={false}
          size="small"
          onSizeChange={() => undefined}
        />
        <CalendarCard
          id="calendar.family"
          name="Family Calendar"
          room="Home"
          events={calendarEvents}
          inEditMode
          size="large"
          onSizeChange={() => undefined}
        />
      </CardSection>

      <CardSection title="Grouped sensor states">
        <GroupedSensorCard
          id="grouped_sensors.living_room"
          name="Living Room Air"
          room="Living Room"
          sensors={groupedSensors}
          size="medium"
          onSizeChange={() => {}}
          isEditMode={false}
          accentColor="teal"
        />
        <GroupedSensorCard
          id="grouped_sensors.living_room"
          name="Living Room Air"
          room="Living Room"
          sensors={groupedSensors}
          size="small"
          onSizeChange={() => {}}
          isEditMode={false}
          accentColor="blue"
        />
        <GroupedSensorCard
          id="grouped_sensors.living_room"
          name="Living Room Air"
          room="Living Room"
          sensors={groupedSensors}
          size="large"
          onSizeChange={() => {}}
          isEditMode
          accentColor="purple"
        />
      </CardSection>
    </div>
  );
}

const meta = {
  title: 'Cards/Overview/Extended State Matrix',
  component: StateMatrixExtendedPage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Extended state matrix for the remaining entity card families to provide broad QA coverage without opening each story file individually.',
      },
    },
  },
} satisfies Meta<typeof StateMatrixExtendedPage>;

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

export const Matrix: Story = {};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
