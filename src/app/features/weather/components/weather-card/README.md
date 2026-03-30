# Weather Card Documentation

## Overview

The weather card is a single adaptive component that renders different information densities based on `CardSize`.

## Current Structure

```text
weather-card/
├── index.tsx        # Main weather card implementation
├── weather-icon.tsx # Shared condition icon mapping
└── README.md        # This file
```

## Card Sizes

### Small

- Matches the medium card styling exactly
- Shows compact location header, temperature + H/L summary, condition icon, and a 4-day forecast strip
- Hides the detail metrics column and sunrise/sunset timeline

### Medium

- Shows compact location header, temperature + H/L summary, condition icon, and a 7-day forecast strip
- Hides the detail metrics column and sunrise/sunset timeline
- Forecast strip can switch between hourly and weekly from the settings dialog

### Large

- Shows the legacy detailed weather layout
- Includes detail metrics, sunrise/sunset timeline, and forecast row

## Props

```ts
interface WeatherCardProps {
  id: string;
  location: string;
  temperature: number;
  condition: WeatherCondition | string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  sunrise: string;
  sunset: string;
  daylight: string;
  rainForecast: string;
  forecast: ForecastDay[];
  highTemp: number;
  lowTemp: number;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}
```

## Design Notes

- Uses the shared `CardWrapper`
- Uses the same edit-mode size selector pattern as other dashboard cards
- Opens a settings dialog on card tap outside edit mode
- Keeps `large` / `extra-large` on the detailed layout path
- Uses the same compact header + forecast strip layout for both `small` and `medium`

## Maintenance Notes

- Update this README when card size behavior changes
- If the component is split into subcomponents again, update the structure section to match the real folder contents
