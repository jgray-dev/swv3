export interface InterpolatedWeather {
  latitude: number;
  longitude: number;
  temperature_2m: number;
  cloud_cover: number;
  cloud_cover_low: number;
  cloud_cover_mid: number;
  cloud_cover_high: number;
  visibility: number;
}

export interface WeatherLocation {
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
  };
}

export interface LoaderData {
  lat: number,
  lon: number,
  city: string,
  eventType: "sunrise" | "sunset",
  eventTime: number,
  now: number,
  rating: number,
  weatherData: InterpolatedWeather[],
  allData: WeatherLocation[]
}