# Card Properties

This file tracks the data contract, UI settings, and Home Assistant-backed fields for Navet cards.

## Weather Card

### Navet Card Props

Current props consumed by [weather card](/Users/vishal/Development/Github/Navet/Navet/src/app/features/weather/components/weather-card/index.tsx):

```ts
interface WeatherCardProps {
  id: string;
  location: string;
  temperature: number;
  condition: WeatherCondition | string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  precipitationUnit: string;
  sunrise: string;
  sunset: string;
  daylight: string;
  rainForecast: string;
  forecast: ForecastDay[];
  forecastMode: WeatherForecastMode;
  highTemp: number;
  lowTemp: number;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}
```

### Current Navet Weather Settings

Current settings exposed in [weather settings dialog](/Users/vishal/Development/Github/Navet/Navet/src/app/features/weather/components/weather-card/weather-settings-dialog.tsx):

- Room assignment via `EntityRoomSelector`
- Forecast mode toggle (`hourly` / `weekly`)
- Custom tint selection for supported cards

Weather card behavior also respects the persisted global weather forecast mode from settings.

### Home Assistant Weather State Fields

Observed on `weather.smhi_home`:

- `temperature`
- `temperature_unit`
- `humidity`
- `pressure`
- `pressure_unit`
- `wind_speed`
- `wind_speed_unit`
- `wind_gust_speed`
- `wind_bearing`
- `cloud_coverage`
- `visibility`
- `visibility_unit`
- `thunder_probability`
- `precipitation_unit`
- `supported_features`
- `friendly_name`
- `attribution`

### Home Assistant Forecast Service

Navet currently calls the Home Assistant weather service:

- Domain: `weather`
- Service: `get_forecasts`

Forecast types supported by `weather.smhi_home`:

- `daily`
- `hourly`
- `twice_daily`

Observed forecast fields:

- `datetime`
- `condition`
- `temperature`
- `templow`
- `pressure`
- `humidity`
- `precipitation`
- `cloud_coverage`
- `wind_bearing`
- `wind_speed`
- `wind_gust_speed`
- `is_daytime` on `twice_daily`

### Notes

- Do not assume precipitation is a percentage. Use `precipitation_unit` when rendering precipitation values.
- Some providers expose `precipitation_probability`; others only expose precipitation amount in forecast entries.
- For the current SMHI integration, tomorrow text should fall back to precipitation amount when probability is unavailable.
