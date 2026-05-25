# Weather Card Documentation

## Overview

The weather card is a single adaptive component that renders different information densities based on `CardSize`.

## Current Structure

```text
weather-card/
├── index.tsx                # Main weather card implementation
├── use-weather-card-controller.ts # Theme, tint, settings, and interaction controller
├── weather-card-overlays.tsx # Background compositor and weather tint layers
├── weather-details.tsx      # Detailed metrics block for larger layouts
├── weather-forecast-row.tsx # Hourly/weekly forecast row
├── weather-settings-dialog.tsx # Forecast, metric, and tint settings
├── weather-sun-times.tsx    # Sunrise, sunset, and daylight timeline
├── passage-wave-overlay.tsx # Shared wave overlay used by multiple variants
├── rain-overlay.tsx         # Deterministic rain and storm drops
├── snowflake-overlay.tsx    # Deterministic snowflakes
├── storm-lightning-overlay.tsx # Lightning burst for storms
├── fog-overlay.tsx          # Fog layer overlay
├── wind-overlay.tsx         # Wind streak overlay
├── weather-card-utils.ts    # Background and text treatment helpers
├── weather-icon.tsx         # Shared condition icon mapping
└── README.md                # This file
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

### Large and Extra-Large

- Shows the detailed weather layout
- Includes detail metrics, sunrise/sunset timeline, and forecast row

## Props

```ts
interface WeatherCardProps {
  id: string;
  location: string;
  temperature: number;
  temperatureUnit?: TemperatureUnit;
  feelsLikeTemperature?: number;
  feelsLikeTemperatureUnit?: TemperatureUnit;
  condition: WeatherCondition | string;
  humidity: number;
  windSpeed: number;
  windSpeedUnit?: string;
  windGustSpeed?: number;
  pressure?: number;
  pressureUnit?: string;
  uvIndex?: number;
  cloudCoverage?: number;
  precipitation: number;
  precipitationUnit: string;
  sunrise: string;
  sunset: string;
  daylight: string;
  rainForecast: string;
  forecast: ForecastDay[];
  forecastMode: WeatherForecastMode;
  highTemp: number;
  highTempUnit?: TemperatureUnit;
  lowTemp: number;
  lowTempUnit?: TemperatureUnit;
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
- Uses Home Assistant source temperature units and converts display values through the shared
  temperature utilities
- Persists per-card tint color and shared weather settings through the controller/store layer
- Includes handcrafted dynamic weather illustration variants for:
  sunny day, moony/clear night, cloudy, rain, storm, fog, snow day, snow night, windy, and fallback states
- The overlay atoms are split by weather effect; `weather-card-overlays.tsx` now only composes them

## Maintenance Notes

- Update this README when card size behavior changes
- If the component is split into subcomponents again, update the structure section to match the real folder contents
