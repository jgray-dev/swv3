import { LoaderFunction } from "@remix-run/router";
import {
  averageData,
  findNextSunEvent,
  generateCoordinateString,
  getRelevantSunEvent,
  getStringLiteral,
  interpolateWeatherData,
  purgeDuplicates,
  unixToApproximateString,
} from "~/.server/data";
import SunCalc from "suncalc";
import {
  AveragedValues,
  InterpolatedWeather,
  WeatherLocation,
} from "~/.server/interfaces";
import { skyRating } from "~/.server/rating";

export const loader: LoaderFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const city = url.searchParams.get("city");
  let error = url.searchParams.get("error");
  let dateUrl = url.searchParams.get("date");
  if (!lat || !lon || !city) {
    return Response.json({ ok: false, message: error });
  }
  const meteoApiKey = context.cloudflare.env.METEO_KEY;

  //Generate a coordinate string of locations looking in east/west (dep on eventType)
  // Also acts as a "default" for eventType, eventTime and eventDate. These will get overridden if required by date picker
  let {
    type: eventType,
    time: eventTime,
    date: eventDate,
  } = getRelevantSunEvent(Number(lat), Number(lon));

  //@ts-ignore
  if (!eventType) {
    return Response.json({
      message: "No sunrise or sunsets found in the next 48 hours.",
      ok: false,
    });
  }
  if (!eventTime) {
    const [time, type] = findNextSunEvent(Number(lat), Number(lon));
    return Response.json({
      message: `No ${type} time found | Next event in approximately ${unixToApproximateString(
        time
      )}`,
      ok: false,
    });
  }

  //Grab one day before and one day after of dates in YYYY-MM-DD format, for use in the open meteo api call
  let dayBefore, dayAfter;
  if (dateUrl === "next" || !dateUrl) {
    const date = new Date();
    dateUrl = date.toISOString().split("T")[0];
  }
  dayBefore = new Date(
    new Date(dateUrl).setDate(new Date(dateUrl).getDate() - 1)
  )
    .toISOString()
    .split("T")[0];
  dayAfter = new Date(
    new Date(dateUrl).setDate(new Date(dateUrl).getDate() + 1)
  )
    .toISOString()
    .split("T")[0];

  const [year, month, day] = dateUrl.split("-").map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  // Grab the event type ("sunrise" | "sunset" | "next") from the URL query
  const typeUrl = url.searchParams.get("type");

  // If the eventType is not "next", use manual time controls
  if (typeUrl !== "next") {
    switch (typeUrl) {
      case "sunrise":
        eventType = "sunrise";
        eventTime = Math.round(
          SunCalc.getTimes(noon, Number(lat), Number(lon)).sunrise.getTime() /
            1000
        );
        eventDate = SunCalc.getTimes(noon, Number(lat), Number(lon)).sunrise;
        break;
      case "sunset":
        eventType = "sunset";
        eventTime = Math.round(
          SunCalc.getTimes(noon, Number(lat), Number(lon)).sunset.getTime() /
            1000
        );
        eventDate = SunCalc.getTimes(noon, Number(lat), Number(lon)).sunset;
        break;
      default:
        console.error("invalid type url");
    }
  }

  const [coords, _] = generateCoordinateString(
    Number(lat),
    Number(lon),
    eventType,
    eventDate
  );

  const meteoResponse = await fetch(
    `https://customer-historical-forecast-api.open-meteo.com/v1/forecast?${coords}&start_date=${dayBefore}&end_date=${dayAfter}&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,freezing_level_height&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&apikey=${meteoApiKey}`
  );

  // Parse our weather data as json.
  let parsedAllWeatherData = await meteoResponse.json();
  // @ts-ignore
  if (parsedAllWeatherData?.error) {
    console.log(parsedAllWeatherData);
    return Response.json({
      // @ts-ignore
      message: `Error fetching weather API. ${parsedAllWeatherData?.reason}`,
      ok: false,
    });
  }

  // Purge the duplicate locations and interpolate the weather data based on the eventTime
  const interpData = interpolateWeatherData(
    purgeDuplicates(
      parsedAllWeatherData as WeatherLocation[],
      eventType
    ) as WeatherLocation[],
    eventTime
  );
  let { rating, debugData } = skyRating(interpData as InterpolatedWeather[]);
  if (isNaN(rating)) rating = 0;
  const stats = averageData(interpData);
  return Response.json({
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    city: String(city),
    eventType: eventType,
    rating: rating,
    stats: stats as AveragedValues,
    eventString: getStringLiteral(
      Math.round(Date.now() / 1000),
      eventTime,
      eventType
    ),
    eventDate: dateUrl,
  });
};
