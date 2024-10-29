// 90% of this file was AI generated (claude-3-5-sonnet-20241022). Everything was verified by yours truly.

export type WeatherDataPoint = {
  cloud_cover: number;
  cloud_cover_high: number;
  cloud_cover_mid: number;
  cloud_cover_low: number;
  visibility: number;
  temperature: number;
};

export type WeatherDataResponse = {
  "event-type": "sunrise" | "sunset";
  "event-time": number;
  data: {
    "0miles": WeatherDataPoint;
    "20miles": WeatherDataPoint;
    "40miles": WeatherDataPoint;
    "60miles": WeatherDataPoint;
    "80miles": WeatherDataPoint;
    "100miles": WeatherDataPoint;
  };
};

type ApiResponse = {
  hourly: {
    time: number[];
    temperature_2m: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
  };
  daily: {
    time: number[];
    sunrise: number[];
    sunset: number[];
  };
};

function milesToCoordinates(
  baseLat: number,
  baseLong: number,
  miles: number,
  direction: "east" | "west"
): { latitude: number; longitude: number } {
  const milesPerLongDegree = Math.cos(baseLat * (Math.PI / 180)) * 69.172;
  const longDiff = miles / milesPerLongDegree;

  return {
    latitude: baseLat,
    longitude: baseLong + (direction === "east" ? longDiff : -longDiff),
  };
}

function findNextSunEvent(
  currentTime: number,
  daily: ApiResponse["daily"]
): { type: "sunrise" | "sunset"; time: number } | null {
  const events = [
    ...daily.sunrise.map((time) => ({ type: "sunrise" as const, time })),
    ...daily.sunset.map((time) => ({ type: "sunset" as const, time })),
  ].sort((a, b) => a.time - b.time);

  return events.find((event) => event.time > currentTime) || null;
}

function interpolateWeatherData(
  eventTime: number,
  hourly: ApiResponse["hourly"]
): WeatherDataPoint {
  const hourIndex = hourly.time.findIndex((time) => time > eventTime) - 1;
  if (hourIndex < 0 || hourIndex >= hourly.time.length - 1) {
    throw new Error("Event time is outside the available data range");
  }

  const t1 = hourly.time[hourIndex];
  const t2 = hourly.time[hourIndex + 1];
  const ratio = (eventTime - t1) / (t2 - t1);

  const interpolate = (v1: number, v2: number) => v1 + (v2 - v1) * ratio;

  return {
    temperature: interpolate(
      hourly.temperature_2m[hourIndex],
      hourly.temperature_2m[hourIndex + 1]
    ),
    cloud_cover: interpolate(
      hourly.cloud_cover[hourIndex],
      hourly.cloud_cover[hourIndex + 1]
    ),
    cloud_cover_low: interpolate(
      hourly.cloud_cover_low[hourIndex],
      hourly.cloud_cover_low[hourIndex + 1]
    ),
    cloud_cover_mid: interpolate(
      hourly.cloud_cover_mid[hourIndex],
      hourly.cloud_cover_mid[hourIndex + 1]
    ),
    cloud_cover_high: interpolate(
      hourly.cloud_cover_high[hourIndex],
      hourly.cloud_cover_high[hourIndex + 1]
    ),
    visibility: interpolate(
      hourly.visibility[hourIndex],
      hourly.visibility[hourIndex + 1]
    ),
  };
}

export async function getNextSunEventWeather(
  latitude: number,
  longitude: number
): Promise<WeatherDataResponse> {
  try {
    const baseResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset&timeformat=unixtime&past_days=1&forecast_days=2&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
    );
    const baseData: ApiResponse = await baseResponse.json();
    const currentTime = Math.floor(Date.now() / 1000);
    const nextEvent = findNextSunEvent(currentTime, baseData.daily);

    if (!nextEvent) {
      console.error("No upcoming sun event found");
      throw new Error("No upcoming sun event found");
    }

    const direction = nextEvent.type === "sunrise" ? "east" : "west";
    const distances = [0, 20, 40, 60, 80, 100];

    const coordinatePoints = distances.map((distance) =>
      milesToCoordinates(latitude, longitude, distance, direction)
    );

    const weatherPromises = coordinatePoints.map((point) =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset&timeformat=unixtime&past_days=1&forecast_days=2&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
      ).then((res) => res.json())
    );

    const allWeatherData = await Promise.all(weatherPromises);

    const weatherPoints = allWeatherData.map((data) =>
      // @ts-expect-error blah blah blah
      interpolateWeatherData(nextEvent.time, data.hourly)
    );

    return {
      "event-type": nextEvent.type,
      "event-time": nextEvent.time,
      data: {
        "0miles": weatherPoints[0],
        "20miles": weatherPoints[1],
        "40miles": weatherPoints[2],
        "60miles": weatherPoints[3],
        "80miles": weatherPoints[4],
        "100miles": weatherPoints[5],
      },
    };
  } catch (error) {
    console.error("Error fetching or processing weather data:", error);
    throw error;
  }
}
