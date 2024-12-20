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
  distance: number;
}

export interface LoaderData {
  authorized: boolean;
  trackingLink: string;
  permaLink: string;
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
  uploads: DbUpload[];
  eventDate: string;
  useNext: boolean;
  bearing: number;
}

export interface AveragedValues {
  cloud_cover: number;
  high_clouds: number;
  mid_clouds: number;
  low_clouds: number;
  visibility: number;
  temperature: number;
  freezing_height: number;
  zone: "near" | "horizon" | "far";
}

export interface DbUpload {
  city: string;
  id: number;
  lat: number;
  lon: number;
  rating: number;
  image_id: string;
  time: number;
  data: any | InterpolatedWeather[];
}

export interface ClassificationResult {
  label: "nsfw" | "normal";
  score: number;
}

export interface WeatherLocation {
  distance: number;
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

export interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

interface GeocodeResult {
  address_components: AddressComponent[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    location_type: string;
    viewport: {
      northeast: {
        lat: number;
        lng: number;
      };
      southwest: {
        lat: number;
        lng: number;
      };
    };
  };
  place_id: string;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
  types: string[];
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface TimeZoneApiResponse {
  dstOffset: number;
  rawOffset: number;
  status: string;
  timeZoneId: string;
  timeZoneName: string;
}

export interface LocationData {
  type: "geolocation" | "input";
  data: GeolocationPosition | string;
}
