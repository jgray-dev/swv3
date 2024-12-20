import { computeDestinationPoint } from "geolib";
import SunCalc from "suncalc";
import {
  AveragedValues,
  ClassificationResult,
  GeocodeResponse,
  InterpolatedWeather,
  WeatherLocation,
} from "~/.server/interfaces";

//Helper function to convert an azimuth in radians (from SunCalc) to the expected format of bearing (for GeoLib)
function azimuthToBearing(azimuthRadians: number): number {
  // Convert to degrees and shift from South to North reference
  let degrees = (azimuthRadians * 180) / Math.PI + 180;

  // Normalize to 0-359 range
  degrees = degrees % 360;

  // Handle negative values
  while (degrees < 0) {
    degrees += 360;
  }

  while (degrees > 360) {
    degrees -= 360;
  }

  // Return rounded value
  return Math.round(degrees);
}

//Helper function for crafting the URL to fetch from open-meteo
export function generateCoordinateString(
  lat: number,
  lon: number,
  eventType: "sunrise" | "sunset",
  date: Date
): [string, number] {
  if (lat < -90 || lat > 90) {
    console.error("Invalid latitude (generateCoordinateString)");
    throw new Error("Invalid latitude");
  }
  if (lon < -180 || lon > 180) {
    console.error("Invalid logitude (generateCoordinateString)");
    throw new Error("Invalid longitude");
  }
  const position = SunCalc.getPosition(date, lat, lon);
  let bearing = azimuthToBearing(position.azimuth);
  if (Math.abs(position.altitude) > 1) {
    console.error(
      `ALTITUDE INDUCED ERROR POSSIBLE. REVERTING TO ${
        eventType === "sunrise" ? 90 : 270
      }`
    );
    console.error(position.altitude);
    bearing = eventType === "sunrise" ? 90 : 270;
  }
  const latitudes: number[] = [];
  const longitudes: number[] = [];
  const distances = [0, 3, 5, 6.5, 8, 9.5, 11, 13, 15, 18, 21, 24];
  for (let i = 0; i < 12; i++) {
    const distance = distances[i] * 1609.34;
    const point = computeDestinationPoint(
      { latitude: lat, longitude: lon },
      distance,
      bearing
    );
    latitudes.push(Number(point.latitude.toFixed(6)));
    longitudes.push(Number(point.longitude.toFixed(6)));
  }
  return [
    `latitude=${latitudes.join(",")}&longitude=${longitudes.join(",")}`,
    bearing,
  ];
}

//Helper function for interpolating (below)
function findBoundingTimeIndices(
  times: number[],
  targetTime: number
): [number, number] {
  let left = 0;
  let right = times.length - 1;
  if (targetTime <= times[left]) return [0, 0];
  if (targetTime >= times[right]) return [right, right];
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (times[mid] <= targetTime && times[mid + 1] > targetTime) {
      return [mid, mid + 1];
    }
    if (times[mid] > targetTime) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  console.error("Unable to find bounding times");
  throw new Error("Unable to find bounding times");
}

//Helper function for interpolating (below)
function calculateInterpolationWeight(
  time1: number,
  time2: number,
  targetTime: number
): number {
  const weight = (targetTime - time1) / (time2 - time1);
  // Ensure weight is bounded between 0 and 1
  return Math.max(0, Math.min(1, weight));
}
function lerp(a: number, b: number, weight: number): number {
  if (isNaN(a) || isNaN(b)) {
    console.error("Invalid number in interpolation");
    throw new Error("Invalid number in interpolation");
  }
  return a + (b - a) * weight;
}

// Function to interpolate weather data when a sunrise/sunset falls between 2 hours (59/60 chance - hence why this is needed lol)
export function interpolateWeatherData(
  apiResponse: WeatherLocation[],
  targetTime: number
): InterpolatedWeather[] {
  if (!Array.isArray(apiResponse) || !apiResponse.length) {
    console.error("Invalid API Response (interpolateWeatherData)");
    throw new Error("Invalid API response");
  }
  return apiResponse.map((location) => {
    if (!location.hourly?.time?.length) {
      console.error("Invalid location data structure (interpolateWeatherData)");
      throw new Error("Invalid location data structure");
    }
    const { time } = location.hourly;
    const [lowerIndex, upperIndex] = findBoundingTimeIndices(time, targetTime);
    const weight = calculateInterpolationWeight(
      time[lowerIndex],
      time[upperIndex],
      targetTime
    );
    try {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        temperature_2m: Math.round(
          lerp(
            location.hourly.temperature_2m[lowerIndex],
            location.hourly.temperature_2m[upperIndex],
            weight
          )
        ),
        cloud_cover: Math.round(
          lerp(
            location.hourly.cloud_cover[lowerIndex],
            location.hourly.cloud_cover[upperIndex],
            weight
          )
        ),
        cloud_cover_low: Math.round(
          lerp(
            location.hourly.cloud_cover_low[lowerIndex],
            location.hourly.cloud_cover_low[upperIndex],
            weight
          )
        ),
        cloud_cover_mid: Math.round(
          lerp(
            location.hourly.cloud_cover_mid[lowerIndex],
            location.hourly.cloud_cover_mid[upperIndex],
            weight
          )
        ),
        cloud_cover_high: Math.round(
          lerp(
            location.hourly.cloud_cover_high[lowerIndex],
            location.hourly.cloud_cover_high[upperIndex],
            weight
          )
        ),
        visibility: Math.round(
          lerp(
            location.hourly.visibility[lowerIndex],
            location.hourly.visibility[upperIndex],
            weight
          )
        ),
        freezing_height: Math.round(
          lerp(
            location.hourly.freezing_level_height[lowerIndex],
            location.hourly.freezing_level_height[upperIndex],
            weight
          )
        ),
        zone: location.zone,
        distance: location.distance,
      };
    } catch (error) {
      console.error(
        // @ts-ignore
        `Error interpolating values (interpolateWeatherData) (${error.message})`
      );
      // @ts-ignore
      throw new Error(`Error interpolating values: ${error.message}`);
    }
  });
}

// Function to average data
export function averageData(data: InterpolatedWeather[]): AveragedValues {
  if (!data.length) {
    console.error("averageData ERROR: !data.length");
    try {
      return {
        cloud_cover: data[0].cloud_cover,
        high_clouds: data[0].cloud_cover_high,
        mid_clouds: data[0].cloud_cover_mid,
        low_clouds: data[0].cloud_cover_low,
        visibility: data[0].visibility,
        temperature: data[0].temperature_2m,
        freezing_height: data[0].freezing_height,
        zone: data[0].zone,
      };
    } catch {
      return {
        cloud_cover: data[0].cloud_cover,
        //@ts-ignore
        high_clouds: data.cloud_cover_high,
        //@ts-ignore
        mid_clouds: data.cloud_cover_mid,
        //@ts-ignore
        low_clouds: data.cloud_cover_low,
        //@ts-ignore
        visibility: data.visibility,
        //@ts-ignore
        temperature: data.temperature_2m,
        //@ts-ignore
        freezing_height: data.freezing_height,
        //@ts-ignore
        zone: data.zone,
      };
    }
  }
  const totalEntries = data.length;
  const cloudSums = data.reduce(
    (acc, curr) => ({
      cloud_cover: acc.cloud_cover + curr.cloud_cover,
      high_clouds: acc.high_clouds + curr.cloud_cover_high,
      mid_clouds: acc.mid_clouds + curr.cloud_cover_mid,
      low_clouds: acc.low_clouds + curr.cloud_cover_low,
    }),
    {
      cloud_cover: 0,
      high_clouds: 0,
      mid_clouds: 0,
      low_clouds: 0,
    }
  );
  return {
    cloud_cover: cloudSums.cloud_cover / totalEntries,
    high_clouds: cloudSums.high_clouds / totalEntries,
    mid_clouds: cloudSums.mid_clouds / totalEntries,
    low_clouds: cloudSums.low_clouds / totalEntries,
    visibility: data[0].visibility,
    temperature: data[0].temperature_2m,
    zone: data[0].zone,
    freezing_height: data[0].freezing_height,
  };
}

// Converts the eventTime to a string literal describing when the event is.
export function getStringLiteral(
  currentTime: number,
  eventTime: number,
  type: string
): string {
  const differenceInSeconds = eventTime - currentTime;
  const absoluteDifferenceInSeconds = Math.abs(differenceInSeconds);

  // Convert to different time units
  const absoluteDifferenceInMinutes = absoluteDifferenceInSeconds / 60;
  const absoluteDifferenceInHours = absoluteDifferenceInSeconds / 3600;
  const absoluteDifferenceInDays = absoluteDifferenceInSeconds / (3600 * 24);
  const absoluteDifferenceInWeeks =
    absoluteDifferenceInSeconds / (3600 * 24 * 7);

  // Helper function for plural handling
  const pluralize = (value: number, unit: string) =>
    `${value} ${unit}${value === 1 ? "" : "s"}`;

  // Just now
  if (absoluteDifferenceInMinutes < 1) {
    return `${type === "sunset" ? "sunsetting" : "sunrising"} just now`;
  }

  // Create the time string
  let timeString: string;
  if (absoluteDifferenceInWeeks >= 1) {
    const weeks = Math.floor(absoluteDifferenceInWeeks);
    timeString = pluralize(weeks, "week");
  } else if (absoluteDifferenceInDays >= 1) {
    const days = Math.floor(absoluteDifferenceInDays);
    timeString = pluralize(days, "day");
  } else if (absoluteDifferenceInHours >= 1) {
    const hours = Math.floor(absoluteDifferenceInHours);
    timeString = pluralize(hours, "hour");
  } else {
    const minutes = Math.floor(absoluteDifferenceInMinutes);
    timeString = pluralize(minutes, "minute");
  }

  // Return formatted string
  return differenceInSeconds < 0
    ? `${type} ${timeString} ago`
    : `${type} in ${timeString}`;
}

// Used for formatting text when displaying the date/time of an event
export function getRelative(now: number, time: number): string {
  if (Math.abs(now - time) <= 500) return "current";
  return now > time ? "past" : "future";
}

interface SunEvent {
  type: "sunrise" | "sunset";
  time: number;
  date: Date;
}

// Normal function used to find the eventType and eventTime at a location
export function getRelevantSunEvent(lat: number, lon: number): SunEvent {
  const now = Math.round(Date.now() / 1000);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sunrises = [yesterday, today, tomorrow].map((day) => {
    const times = SunCalc.getTimes(day, lat, lon);
    return {
      date: times.sunrise,
      time: Math.round(times.sunrise.getTime() / 1000),
    };
  });

  const sunsets = [yesterday, today, tomorrow].map((day) => {
    const times = SunCalc.getTimes(day, lat, lon);
    return {
      date: times.sunset,
      time: Math.round(times.sunset.getTime() / 1000),
    };
  });

  const allEvents: SunEvent[] = [
    ...sunrises.map(({ date, time }) => ({
      type: "sunrise" as const,
      time,
      date,
    })),
    ...sunsets.map(({ date, time }) => ({
      type: "sunset" as const,
      time,
      date,
    })),
  ];
  allEvents.sort((a, b) => a.time - b.time);

  const NINETY_MINUTES = 90 * 60;
  const recentEvents = allEvents
    .filter(
      (event) => now - event.time <= NINETY_MINUTES && now - event.time >= 0
    )
    .sort((a, b) => b.time - a.time);

  if (recentEvents.length > 0) {
    return recentEvents[0];
  }

  const upcomingEvents = allEvents
    .filter((event) => event.time > now)
    .sort((a, b) => a.time - b.time);

  if (upcomingEvents.length > 0) {
    return upcomingEvents[0];
  }

  return allEvents[allEvents.length - 1];
}

export function purgeDuplicates(
  coordinates: WeatherLocation[],
  eventType: "sunrise" | "sunset"
): WeatherLocation[] {
  const sortedCoords = coordinates.sort((a, b) => {
    if (eventType === "sunrise") {
      return b.longitude - a.longitude;
    } else {
      return a.longitude - b.longitude;
    }
  });
  //0->3
  //5->13
  //15->24
  const distances = [0, 3, 5, 6.5, 8, 9.5, 11, 13, 15, 18, 21, 24];
  const withZones = sortedCoords.map((coord, index) => ({
    ...coord,
    zone: (index <= 1 ? "near" : index <= 7 ? "horizon" : "far") as
      | "near"
      | "horizon"
      | "far",
    distance: distances[index],
  }));
  const seen = new Map<string, boolean>();
  return withZones.filter((coord) => {
    const key = `${coord.latitude},${coord.longitude}`;
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, true);
    return true;
  });
}

export function findNextSunEvent(
  latitude: number,
  longitude: number
): [number, string] {
  const NOW = Date.now();
  const DAY_MS = 86400000;
  const MAX_DAYS_TO_SEARCH = 186;
  let left = 0;
  let right = MAX_DAYS_TO_SEARCH;

  const hasEvent = (timestamp: number): boolean => {
    try {
      const date = new Date(timestamp);
      const times = SunCalc.getTimes(date, latitude, longitude);
      return !isNaN(times.sunrise.getTime()) || !isNaN(times.sunset.getTime());
    } catch {
      return false;
    }
  };

  const getNextEvent = (timestamp: number): [number, string] | null => {
    try {
      const date = new Date(timestamp);
      const times = SunCalc.getTimes(date, latitude, longitude);

      const sunriseTime = times.sunrise.getTime();
      const sunsetTime = times.sunset.getTime();

      const events: [number, string][] = [];
      if (!isNaN(sunriseTime) && sunriseTime > NOW) {
        events.push([sunriseTime, "sunrise"]);
      }
      if (!isNaN(sunsetTime) && sunsetTime > NOW) {
        events.push([sunsetTime, "sunset"]);
      }

      return events.length > 0
        ? events.reduce((a, b) => (a[0] < b[0] ? a : b))
        : null;
    } catch {
      return null;
    }
  };

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const midTimestamp = NOW + mid * DAY_MS;

    if (hasEvent(midTimestamp)) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  if (left >= MAX_DAYS_TO_SEARCH) {
    console.error(`No sunrise or sunset found within the search period`);
    throw new Error("No sunrise or sunset found within search period");
  }

  const startDay = NOW + left * DAY_MS;
  const nextDay = startDay + DAY_MS;
  const event1 = getNextEvent(startDay);
  const event2 = getNextEvent(nextDay);

  if (event1 !== null && event2 !== null) {
    return event1[0] < event2[0] ? event1 : event2;
  } else if (event1 !== null) {
    return event1;
  } else if (event2 !== null) {
    return event2;
  }
  console.error(`Failed to find next sunrise or sunset`);
  throw new Error("Failed to find next sunrise or sunset");
}
//Additional function for edge cases: takes unix time and returns string literal.
export function unixToApproximateString(unixTimestamp: number): string {
  unixTimestamp = Math.round(unixTimestamp / 1000);
  const now = Math.floor(Date.now() / 1000);
  const difference = unixTimestamp - now;
  if (difference <= 0) {
    return "now";
  }
  const HOUR = 3600;
  const DAY = 86400;
  const WEEK = 604800;
  const MONTH = 2592000;
  if (difference < HOUR) {
    return "less than an hour";
  } else if (difference < DAY) {
    const hours = Math.floor(difference / HOUR);
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  } else if (difference < WEEK) {
    const days = Math.floor(difference / DAY);
    return `${days} ${days === 1 ? "day" : "days"}`;
  } else if (difference < MONTH) {
    const weeks = Math.floor(difference / WEEK);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  } else {
    const months = Math.floor(difference / MONTH);
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
}

export async function checkImage(context: any, image: File): Promise<Boolean> {
  const buffer = await image.arrayBuffer();
  const response = await fetch(
    "https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection",
    {
      headers: {
        Authorization: `Bearer ${context.cloudflare.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: buffer,
    }
  );
  const result = (await response.json()) as ClassificationResult[];
  const normalScore =
    result.find((item) => item.label === "normal")?.score ?? 0;
  return normalScore >= 0.7;
}

export function getCityFromGeocodeResponse(response: GeocodeResponse): string {
  if (
    !response.results ||
    !response.results[0] ||
    !response.results[0].address_components
  ) {
    return response.results[0].formatted_address;
  }

  const addressComponents = response.results[0].address_components;

  const cityComponent = addressComponents.find((component) =>
    component.types.includes("locality")
  );

  const stateComponent = addressComponents.find((component) =>
    component.types.includes("administrative_area_level_1")
  );

  const countryComponent = addressComponents.find((component) =>
    component.types.includes("country")
  );

  let city = cityComponent?.long_name;

  if (!city) {
    const fallbackComponent = addressComponents.find(
      (component) =>
        component.types.includes("sublocality") ||
        component.types.includes("administrative_area_level_3")
    );
    city = fallbackComponent?.long_name;
  }

  if (!city) {
    return response.results[0].formatted_address;
  }

  let locationParts = [city];

  if (stateComponent?.short_name && stateComponent.long_name !== city) {
    locationParts.push(stateComponent.short_name);
  }

  if (countryComponent?.short_name) {
    locationParts.push(countryComponent.short_name);
  }

  return locationParts.join(", ");
}

export function generatePermaLink(
  eventDate: string,
  params: string,
  type: string
): string {
  return params.split("&date")[0] + `&date=${eventDate}&type=${type}`;
}

export function unixToDateString(
  unixTimestamp: number,
  timezone: string
): string {
  const date = new Date(unixTimestamp * 1000);
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

//Helper function for JWT. input '2h' or '15m' to get a JWT compatable number
export function getExpirationTime(literal: string): number {
  const value = parseInt(literal);
  const unit = literal.slice(-1).toLowerCase();

  const now = Math.floor(Date.now() / 1000);

  switch (unit) {
    case "h":
      return now + value * 60 * 60;
    case "m":
      return now + value * 60;
    case "s":
      return now + value;
    default:
      throw new Error(
        'Invalid time format. Use format like "2h", "15m", or "30s"'
      );
  }
}
