export interface InterpolatedWeather {
  latitude: number;
  longitude: number;
  temperature_2m: number;
  cloud_cover: number;
  cloud_cover_low: number;
  cloud_cover_mid: number;
  cloud_cover_high: number;
  freezing_height: number;
  visibility: number;
  zone: "near" | "horizon" | "far";
}

export interface WeatherLocation {
  zone: "near" | "horizon" | "far";
  latitude: number;
  longitude: number;
  hourly: {
    time: number[];
    temperature_2m: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    freezing_level_height: number[];
  };
}

export interface LoaderData {
  lat: number;
  lon: number;
  city: string;
  eventType: "sunrise" | "sunset";
  eventString: string;
  eventTime: number;
  now: number;
  rating: number;
  weatherData: InterpolatedWeather[];
  allData: WeatherLocation[];
  stats: AveragedValues;
  message?: string;
  relative: "future" | "past" | "current";
  ok: boolean;
}

export interface AveragedValues {
  cloud_cover: number;
  high_clouds: number;
  mid_clouds: number;
  low_clouds: number;
  visibility: number;
  temperature: number;
}
