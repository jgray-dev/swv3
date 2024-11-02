import { computeDestinationPoint } from "geolib";
import {
  AveragedValues,
  InterpolatedWeather,
  WeatherLocation,
} from "~/.server/interfaces";
import { getSunrise, getSunset } from "sunrise-sunset-js";

export function generateCoordinateString(
  lat: number,
  lon: number,
  eventType: "sunrise" | "sunset"
): string {
  // Input validation
  if (lat < -90 || lat > 90) throw new Error("Invalid latitude");
  if (lon < -180 || lon > 180) throw new Error("Invalid longitude");

  const bearing = eventType === "sunrise" ? 90 : 270;

  // Separate arrays for latitudes and longitudes
  const latitudes: number[] = [];
  const longitudes: number[] = [];

  const distances = [0, 3, 5, 6.5, 8, 9.5, 11, 13, 15, 18, 21, 24];
  // Generate 6 points (including starting point)
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
  return `latitude=${latitudes.join(",")}&longitude=${longitudes.join(",")}`;
}

function findBoundingTimeIndices(
  times: number[],
  targetTime: number
): [number, number] {
  // Binary search for more efficient lookup
  let left = 0;
  let right = times.length - 1;
  // Handle out of bounds cases
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
  // Fallback (should never reach here with valid data)
  throw new Error("Unable to find bounding times");
}
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
    throw new Error("Invalid number in interpolation");
  }
  return a + (b - a) * weight;
}
export function interpolateWeatherData(
  apiResponse: WeatherLocation[],
  targetTime: number
): InterpolatedWeather[] {
  if (!Array.isArray(apiResponse) || !apiResponse.length) {
    throw new Error("Invalid API response");
  }
  return apiResponse.map((location) => {
    if (!location.hourly?.time?.length) {
      throw new Error("Invalid location data structure");
    }
    const { time } = location.hourly;

    // Find bounding indices using binary search
    const [lowerIndex, upperIndex] = findBoundingTimeIndices(time, targetTime);

    // Calculate interpolation weight
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
        distance: location.distance
      };
    } catch (error) {
      // @ts-ignore
      throw new Error(`Error interpolating values: ${error.message}`);
    }
  });
}
export function averageData(data: InterpolatedWeather[]): AveragedValues {
  if (!data.length) {
    console.error("averageData ERROR: !data.length")
    
    return {
      //@ts-ignore
      cloud_cover: data.cloud_cover,
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

export function getStringLiteral(
  currentTime: number,
  eventTime: number,
  type: string
): string {
  const differenceInSeconds = eventTime - currentTime;
  const absoluteDifferenceInHours = Math.abs(differenceInSeconds) / 3600;
  const absoluteDifferenceInMinutes = Math.abs(differenceInSeconds) / 60;

  // If the difference is less than 1 minute
  if (absoluteDifferenceInMinutes < 1) {
    return `${type == "sunset" ? "sunsetting" : "sunrising"} just now`;
  }

  // If the difference is less than 1 hour
  if (absoluteDifferenceInHours < 1) {
    const minutes = Math.round(absoluteDifferenceInMinutes);
    return differenceInSeconds < 0
      ? `${type} ${minutes} minute${minutes === 1 ? "" : "s"} ago`
      : `${type} in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  // For hour(s) difference
  const hours = Math.round(absoluteDifferenceInHours);
  return differenceInSeconds < 0
    ? `${type} ${hours} hour${hours === 1 ? "" : "s"} ago`
    : `${type} in ${hours} hour${hours === 1 ? "" : "s"}`;
}

export function getRelative(now: number, time: number): string {
  if (Math.abs(now - time) <= 500) return "current";
  return now > time ? "past" : "future";
}

interface SunEvent {
  type: "sunrise" | "sunset";
  time: number;
}

export function getRelevantSunEvent(lat: number, lon: number): SunEvent {
  const now = Math.round(Date.now() / 1000);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sunrises = [
    Math.round(new Date(getSunrise(lat, lon, yesterday)).getTime() / 1000),
    Math.round(new Date(getSunrise(lat, lon, today)).getTime() / 1000),
    Math.round(new Date(getSunrise(lat, lon, tomorrow)).getTime() / 1000),
  ];

  const sunsets = [
    Math.round(new Date(getSunset(lat, lon, yesterday)).getTime() / 1000),
    Math.round(new Date(getSunset(lat, lon, today)).getTime() / 1000),
    Math.round(new Date(getSunset(lat, lon, tomorrow)).getTime() / 1000),
  ];
  const allEvents: SunEvent[] = [
    ...sunrises.map((time) => ({ type: "sunrise" as const, time })),
    ...sunsets.map((time) => ({ type: "sunset" as const, time })),
  ];

  allEvents.sort((a, b) => a.time - b.time);

  const NINETY_MINUTES = 90 * 60; // in seconds

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
  // First, sort based on eventType
  const sortedCoords = coordinates.sort((a, b) => {
    if (eventType === "sunrise") {
      // For sunrise (going east), sort descending (west → east)
      return b.longitude - a.longitude;
    } else {
      // For sunset (going west), sort ascending (east → west)
      return a.longitude - b.longitude;
    }
  });

  const distances = [0, 3, 5, 6.5, 8, 9.5, 11, 13, 15, 18, 21, 24];
  const withZones = sortedCoords.map((coord, index) => ({
    ...coord,
    zone: (index <= 1 ? "near" : index <= 7 ? "horizon" : "far") as "near" | "horizon" | "far",
    distance: distances[index]
  }));

  // Then remove duplicates
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
