import type { ActionFunction, MetaFunction } from "@remix-run/cloudflare";
import { Link, redirect, useNavigation, useRouteLoaderData } from "@remix-run/react";
import { LoaderFunction } from "@remix-run/router";
import React, { useEffect, useMemo } from "react";
import SunCalc from "suncalc";
import jwt from "@tsndr/cloudflare-worker-jwt";
import {
  averageData,
  findNextSunEvent,
  generateCoordinateString,
  generatePermaLink,
  getCityFromGeocodeResponse,
  getExpirationTime,
  getRelative,
  getRelevantSunEvent,
  getStringLiteral,
  interpolateWeatherData,
  purgeDuplicates,
  unixToApproximateString,
  unixToDateString,
} from "~/.server/data";
import { createUpload, deleteUpload, getSubmissions } from "~/.server/database";
import {
  AveragedValues,
  GeocodeResponse,
  InterpolatedWeather,
  LoaderData,
  LocationData,
  TimeZoneApiResponse,
  WeatherLocation,
} from "~/.server/interfaces";
import { skyRating } from "~/.server/rating";
import { WeeklySelectionState } from "~/context/WeeklySelectionContext";

import Alert from "~/components/Alert";
import LocationComponent from "~/components/LocationComponent";

import LocationDisplay from "~/components/LocationDisplay";
import RatingDisplay from "~/components/RatingDisplay";
import WeeklyOutlook from "~/components/WeeklyOutlook";
import {
  WeeklySelectionProvider,
  useWeeklySelection,
} from "~/context/WeeklySelectionContext";

const CloudCoverDisplay = React.lazy(
  () => import("~/components/CloudCoverDisplay")
);
// import CloudCoverDisplay from "~/components/CloudCoverDisplay";

const LazyMap = React.lazy(() => import("~/components/Map"));
// import Map from "~/components/Map";

const SubmitComponent = React.lazy(
  () => import("~/components/SubmitComponent")
);
// import SubmitComponent from "~/components/SubmitComponent";

const Footer = React.lazy(() => import("~/components/Footer"));
// import Footer from "~/components/Footer";

const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const WEATHER_HOURLY_FIELDS: Array<keyof WeatherLocation["hourly"]> = [
  "time",
  "temperature_2m",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "visibility",
  "freezing_level_height",
];

interface WeatherCacheEntry {
  rangeStart: string;
  rangeEnd: string;
  data: WeatherLocation[];
  timestamp: number;
}

const weatherCache = new Map<string, WeatherCacheEntry>();

const cloneWeatherLocations = (data: WeatherLocation[]): WeatherLocation[] =>
  JSON.parse(JSON.stringify(data));

const dateValue = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).getTime();

const shiftIsoDate = (isoDate: string, offsetDays: number) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().split("T")[0];
};

const locationKey = (location: WeatherLocation) =>
  `${location.latitude}:${location.longitude}:${location.zone}`;

function mergeWeatherData(
  base: WeatherLocation[],
  addition: WeatherLocation[],
  position: "prepend" | "append"
) {
  const baseMap = new Map(base.map((loc) => [locationKey(loc), loc] as const));

  addition.forEach((addLoc) => {
    const key = locationKey(addLoc);
    const existing = baseMap.get(key);
    if (!existing) {
      base.push(JSON.parse(JSON.stringify(addLoc)) as WeatherLocation);
      baseMap.set(key, base[base.length - 1]);
      return;
    }

    WEATHER_HOURLY_FIELDS.forEach((field) => {
      const existingSeries = existing.hourly[field];
      const additionSeries = addLoc.hourly[field];
      if (position === "prepend") {
        existing.hourly[field] = ([
          ...additionSeries,
          ...existingSeries,
        ] as typeof existingSeries);
      } else {
        existing.hourly[field] = ([
          ...existingSeries,
          ...additionSeries,
        ] as typeof existingSeries);
      }
    });
  });
}

async function fetchWeatherSegment(
  coords: string,
  start: string,
  end: string,
  apiKey: string,
  label: string
) {
  const url = `https://customer-historical-forecast-api.open-meteo.com/v1/forecast?${coords}&start_date=${start}&end_date=${end}&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,freezing_level_height&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error fetching weather API [${label}]`);
  }
  const json = (await response.json()) as unknown;
  if ((json as { error?: string })?.error) {
    throw new Error(`Error fetching weather API [${label}]`);
  }
  return json as WeatherLocation[];
}

async function getWeatherDataWithCache(options: {
  coords: string | null;
  start: string;
  end: string;
  apiKey: string;
  label: string;
  cacheKey: string;
}) {
  const { coords, start, end, apiKey, label, cacheKey } = options;
  if (!coords) {
    return { data: null, fromCache: false } as const;
  }

  const now = Date.now();
  let entry = weatherCache.get(cacheKey);

  const loadFresh = async () => {
    const data = await fetchWeatherSegment(coords, start, end, apiKey, label);
    entry = {
      rangeStart: start,
      rangeEnd: end,
      data: cloneWeatherLocations(data),
      timestamp: now,
    } satisfies WeatherCacheEntry;
    weatherCache.set(cacheKey, entry);
    return { data: cloneWeatherLocations(data), fromCache: false } as const;
  };

  if (!entry || now - entry.timestamp > WEATHER_CACHE_TTL_MS) {
    return loadFresh();
  }

  let updated = false;

  if (dateValue(start) < dateValue(entry.rangeStart)) {
    const segmentEnd = shiftIsoDate(entry.rangeStart, -1);
    if (dateValue(segmentEnd) >= dateValue(start)) {
      const addition = await fetchWeatherSegment(
        coords,
        start,
        segmentEnd,
        apiKey,
        label
      );
      mergeWeatherData(entry.data, addition, "prepend");
      entry.rangeStart = start;
      updated = true;
    }
  }

  if (dateValue(end) > dateValue(entry.rangeEnd)) {
    const segmentStart = shiftIsoDate(entry.rangeEnd, 1);
    if (dateValue(segmentStart) <= dateValue(end)) {
      const addition = await fetchWeatherSegment(
        coords,
        segmentStart,
        end,
        apiKey,
        label
      );
      mergeWeatherData(entry.data, addition, "append");
      entry.rangeEnd = end;
      updated = true;
    }
  }

  entry.timestamp = now;
  return {
    data: cloneWeatherLocations(entry.data),
    fromCache: !updated,
  } as const;
}

export const meta: MetaFunction = () => {
  return [
    { title: "Sunwatch" },
    {
      name: "Sunwatch",
      content:
        "Sunwatch. An app designed to show visual ratings for sunrises and sunsets around the world.",
    },
  ];
};

export const loader: LoaderFunction = async ({ request, context }) => {
  try {
    let authorized = false;
    const cookie = request.headers.get("Cookie");
    if (cookie) {
      try {
        const token = cookie.split("auth=")[1].split(";")[0];
        const verifiedToken = await jwt.verify(
          token,
          context.cloudflare.env.JWT_SECRET
        );
        if (verifiedToken) {
          const { payload } = verifiedToken;
          //@ts-ignore
          authorized = payload.authorized;
        }
      } catch {
        authorized = false;
      }
    }
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");
    const city = url.searchParams.get("city");
    let error = url.searchParams.get("error");
    let dateUrl = url.searchParams.get("date");
    if (!lat || !lon || !city) {
      return {
        ok: false,
        message: error,
        uploads: await getSubmissions(context),
        authorized: authorized,
      };
    }
    const meteoApiKey = context.cloudflare.env.METEO_KEY;

    //Generate a coordinate string of locations looking in east/west (dep on eventType)
    // Also acts as a "default" for eventType, eventTime and eventDate. These will get overridden if required by date picker
    let {
      type: eventType,
      time: eventTime,
      date: eventDate,
    } = getRelevantSunEvent(Number(lat), Number(lon));

    const defaultEventType = eventType;
    const defaultEventTime = eventTime;
    const defaultEventDate = eventDate;

    //@ts-ignore
    if (!eventType) {
      return {
        message: "No sunrise or sunsets found in the next 48 hours.",
        ok: false,
        uploads: await getSubmissions(context),
        authorized: authorized,
      };
    }
    if (!eventTime) {
      const [time, type] = findNextSunEvent(Number(lat), Number(lon));
      return {
        message: `No ${type} time found | Next event in approximately ${unixToApproximateString(
          time
        )}`,
        ok: false,
        uploads: await getSubmissions(context),
        authorized: authorized,
      };
    }

    let historic = false;
    if (dateUrl === "next" || !dateUrl) {
      historic = true;
      const date = new Date();
      dateUrl = date.toISOString().split("T")[0];
    }

    const today = new Date();
    const maxFutureDate = new Date(today);
    maxFutureDate.setDate(maxFutureDate.getDate() + 6);
    const maxFutureDateString = maxFutureDate.toISOString().split("T")[0];

    if (dateUrl > maxFutureDateString) {
      dateUrl = maxFutureDateString;
    }

    const [year, month, day] = dateUrl.split("-").map(Number);
    const noon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const formatISODate = (date: Date) => date.toISOString().split("T")[0];

    const limitNoon = new Date(
      Date.UTC(
        maxFutureDate.getUTCFullYear(),
        maxFutureDate.getUTCMonth(),
        maxFutureDate.getUTCDate(),
        12,
        0,
        0
      )
    );

    // Optimize: Reduce calendar window from 7 days to 5 days to minimize API calls
    const baseOffsets = [-2, -1, 0, 1, 2];
    const candidateDays = baseOffsets.map((offset) => {
      const candidate = new Date(noon);
      candidate.setUTCDate(candidate.getUTCDate() + offset);
      return candidate;
    });

    const usableDays = candidateDays.filter(
      (candidate) => candidate.getTime() <= limitNoon.getTime()
    );

    if (
      !usableDays.some((candidate) => candidate.getTime() === noon.getTime())
    ) {
      usableDays.push(noon);
    }

    usableDays.sort((a, b) => a.getTime() - b.getTime());

    const calendarLimited = usableDays.length < candidateDays.length;

    const fetchWindowStart = new Date(usableDays[0]);
    fetchWindowStart.setUTCDate(fetchWindowStart.getUTCDate() - 1);
    const fetchWindowEnd = new Date(usableDays[usableDays.length - 1]);
    fetchWindowEnd.setUTCDate(fetchWindowEnd.getUTCDate() + 1);

    const rangeStart = formatISODate(fetchWindowStart);
    const rangeEnd = formatISODate(fetchWindowEnd);
    const calendarDays = usableDays;
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

    const [coords, bearing] = generateCoordinateString(
      Number(lat),
      Number(lon),
      eventType,
      eventDate
    );

    const alternateType = eventType === "sunrise" ? "sunset" : "sunrise";
    const referenceTimes = SunCalc.getTimes(noon, Number(lat), Number(lon));
    const alternateEventDate =
      alternateType === "sunrise"
        ? referenceTimes.sunrise
        : referenceTimes.sunset;

    let alternateCoords: string | null = null;
    if (alternateEventDate && !isNaN(alternateEventDate.getTime())) {
      [alternateCoords] = generateCoordinateString(
        Number(lat),
        Number(lon),
        alternateType,
        alternateEventDate
      );
    }

    const sunriseCoords = eventType === "sunrise" ? coords : alternateCoords;
    const sunsetCoords = eventType === "sunset" ? coords : alternateCoords;

    const googleApiKey = context.cloudflare.env.GOOGLE_MAPS_API_KEY;
    const currentUnixTime = Math.floor(Date.now() / 1000);

    // Always fetch data for both sunrise and sunset for complete weekly outlook
    const sunriseFetchPromise = getWeatherDataWithCache({
      coords: sunriseCoords,
      start: rangeStart,
      end: rangeEnd,
      apiKey: meteoApiKey,
      label: "sunrise",
      cacheKey: `sunrise:${sunriseCoords ?? "none"}`,
    });

    const sunsetFetchPromise = getWeatherDataWithCache({
      coords: sunsetCoords,
      start: rangeStart,
      end: rangeEnd,
      apiKey: meteoApiKey,
      label: "sunset",
      cacheKey: `sunset:${sunsetCoords ?? "none"}`,
    });

    const timezoneFetchPromise = fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${encodeURIComponent(
        lat
      )}%2C${encodeURIComponent(lon)}&timestamp=${encodeURIComponent(
        currentUnixTime
      )}&key=${googleApiKey}`
    );

    const [mapData, sunriseResult, sunsetResult, timezoneResponse] =
      await Promise.all([
        getSubmissions(context),
        sunriseFetchPromise,
        sunsetFetchPromise,
        timezoneFetchPromise,
      ]);

    // Parse timezone response
    const parsedTimezoneResponse =
      (await timezoneResponse?.json()) as TimeZoneApiResponse;

    if (parsedTimezoneResponse.status !== "OK") {
      redirect(
        appendErrorToUrl(
          url.search,
          `Error fetching TimeZone API [${parsedTimezoneResponse.status}]`
        )
      );
    }

    const permaLink = historic
      ? generatePermaLink(
          unixToDateString(eventTime, parsedTimezoneResponse.timeZoneId),
          searchParams.toString(),
          eventType
        )
      : generatePermaLink(dateUrl, searchParams.toString(), eventType);

    // Return error for failure to fetch database
    if (!mapData)
      return {
        ok: false,
        message: error ?? "Error fetching database",
        authorized: authorized,
      };

    const sunriseRaw = sunriseResult.data;
    const sunsetRaw = sunsetResult.data;

    const sunriseLocations = sunriseRaw
      ? purgeDuplicates(sunriseRaw, "sunrise")
      : null;
    const sunsetLocations = sunsetRaw
      ? purgeDuplicates(sunsetRaw, "sunset")
      : null;

    const selectedLocations =
      eventType === "sunrise" ? sunriseLocations : sunsetLocations;
    const selectedRawData = eventType === "sunrise" ? sunriseRaw : sunsetRaw;

    if (!selectedLocations || !selectedLocations.length) {
      return {
        message: `Unable to load weather data for selected event`,
        ok: false,
        uploads: mapData,
        authorized: authorized,
      };
    }

    const interpData = interpolateWeatherData(selectedLocations, eventTime);

    let { rating, debugData } = skyRating(interpData as InterpolatedWeather[]);
    if (isNaN(rating)) rating = 0;
    const stats = averageData(interpData);
    if ((!eventTime || !eventType) && !error)
      error = "No sunrise or sunset found";

    const nowUnix = Math.round(Date.now() / 1000);

    const defaultEventDateIso = defaultEventDate
      ? formatISODate(defaultEventDate)
      : defaultEventTime
      ? formatISODate(new Date(defaultEventTime * 1000))
      : null;

    // Memoize calendar event generation to avoid redundant calculations
    const eventCache: Record<string, any> = {};
    const buildCalendarEvent = (
      dateObject: Date | undefined,
      type: "sunrise" | "sunset"
    ) => {
      if (!dateObject || isNaN(dateObject.getTime())) return null;

      const eventUnix = Math.round(dateObject.getTime() / 1000);
      const cacheKey = `${eventUnix}-${type}`;

      if (eventCache[cacheKey]) {
        return eventCache[cacheKey];
      }

      const source = type === "sunrise" ? sunriseLocations : sunsetLocations;
      if (!source || !source.length) {
        eventCache[cacheKey] = null;
        return null;
      }

      try {
        const eventWeather = interpolateWeatherData(source, eventUnix);
        let { rating: eventRating } = skyRating(
          eventWeather as InterpolatedWeather[]
        );
        if (isNaN(eventRating)) eventRating = 0;
        const isAutoFocus = Boolean(
          defaultEventTime &&
            defaultEventDateIso &&
            type === defaultEventType &&
            formatISODate(dateObject) === defaultEventDateIso
        );

        const result = {
          rating: eventRating,
          eventTime: eventUnix,
          eventString: getStringLiteral(
            nowUnix,
            eventUnix,
            type,
            parsedTimezoneResponse.timeZoneId
          ),
          relative: getRelative(nowUnix, eventUnix),
          type,
          isAutoFocus,
        };

        eventCache[cacheKey] = result;
        return result;
      } catch (err) {
        console.error(`Calendar event generation failed: ${err}`);
        eventCache[cacheKey] = null;
        return null;
      }
    };

    const calendarFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: parsedTimezoneResponse.timeZoneId,
    });

    const localDateFormatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: parsedTimezoneResponse.timeZoneId,
    });

    const todayLocalDateString = localDateFormatter.format(new Date());

    const calendar = calendarDays.map((dayDate) => {
      const times = SunCalc.getTimes(dayDate, Number(lat), Number(lon));
      const sunriseEvent = buildCalendarEvent(times.sunrise, "sunrise");
      const sunsetEvent = buildCalendarEvent(times.sunset, "sunset");
      const isoDate = formatISODate(dayDate);
      return {
        date: isoDate,
        label: calendarFormatter.format(dayDate),
        sunrise: sunriseEvent,
        sunset: sunsetEvent,
        isToday: isoDate === todayLocalDateString,
      };
    });

    return {
      authorized: authorized,
      permaLink: `${url.origin}/share?${permaLink}`,
      allData: selectedRawData ?? [],
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      city: String(city),
      eventType: eventType,
      eventTime: eventTime,
      now: nowUnix,
      rating: rating,
      weatherData: interpData,
      stats: stats as AveragedValues,
      message: error,
      bearing: bearing,
      ratingDebug: debugData,
      eventString: getStringLiteral(
        nowUnix,
        eventTime,
        eventType,
        parsedTimezoneResponse.timeZoneId
      ),
      eventTimeZone: parsedTimezoneResponse.timeZoneId,
      relative: getRelative(nowUnix, eventTime),
      ok: true,
      uploads: mapData,
      eventDate: dateUrl,
      useNext: historic,
      calendar,
      calendarLimited,
      calendarLimitDate: maxFutureDateString,
    };
  } catch (e) {
    console.log("ERROR");
    console.log(e);
    return {
      message: `Unknown application error. Try again later [E]`,
      ok: false,
      uploads: await getSubmissions(context),
      authorized: false,
    };
  }
};

export function isLocationData(data: any): data is LocationData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data.type === "geolocation" || data.type === "input") &&
    (data.type === "geolocation"
      ? typeof data.data === "object" && "coords" in data.data
      : typeof data.data === "string")
  );
}

export const action: ActionFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const formData = await request.formData();
  const element = formData.get("element");
  if (!element || typeof element !== "string") {
    return Response.json({ error: "Missing form identifier" }, { status: 500 });
  }
  switch (element) {
    case "deleteRequest": {
      let authorized = false;
      const cookie = request.headers.get("Cookie");
      if (cookie) {
        try {
          const token = cookie.split("auth=")[1].split(";")[0];
          const verifiedToken = await jwt.verify(
            token,
            context.cloudflare.env.JWT_SECRET
          );
          if (verifiedToken) {
            const { payload } = verifiedToken;
            //@ts-ignore
            authorized = payload.authorized;
          }
        } catch {
          authorized = false;
        }
      }
      if (!authorized)
        return redirect(appendErrorToUrl(url.search, `Unauthorized action`));
      try {
        const submission = JSON.parse(`${formData.get("submission")}`);
        const API_URL = `https://api.cloudflare.com/client/v4/accounts/${
          context.cloudflare.env.CF_ACCOUNT_ID
        }/images/v1/${encodeURIComponent(submission.image_id)}`;
        const imageResp = await fetch(API_URL, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${context.cloudflare.env.CF_TOKEN}`,
          },
        });
        const imageResponse = await imageResp.json();
        if (
          //@ts-ignore
          imageResponse.success ||
          //@ts-ignore
          imageResponse.errors[0].message == "Image not found"
        ) {
          //@ts-ignore
          if (await deleteUpload(context, submission.id)) {
            return redirect("/");
          } else {
            return redirect(
              appendErrorToUrl(url.search, `Failed to delete submission`)
            );
          }
        } else {
          return redirect(
            appendErrorToUrl(url.search, `Failed to delete image`)
          );
        }
      } catch (e) {
        return redirect(appendErrorToUrl(url.search, `Failed to parse JSON`));
      }
    }
    case "deauthorizeRequest": {
      const headers = new Headers();
      headers.append("Set-Cookie", "auth=; Path=/; HttpOnly; Max-Age=0");
      return redirect("/", { headers });
    }
    case "authorizeRequest": {
      let verified = false;
      const input = formData.get("password");

      const token = formData.get("cf-turnstile-response");
      const ip = request.headers.get("CF-Connecting-IP");
      const redirectUrl = new URL(url.origin);
      redirectUrl.searchParams.delete("error");
      if (!token || !ip) {
        if (!Boolean(context.cloudflare.env.LOCAL))
          return redirect(appendErrorToUrl(url.search, `Incorrect (0)`));
      }
      //Verify turnstile for password attempt
      if (!Boolean(context.cloudflare.env.LOCAL) && token && ip) {
        let turnstileForm = new FormData();
        turnstileForm.append("secret", context.cloudflare.env.TURNSTILE_SECRET);
        turnstileForm.append("response", token);
        turnstileForm.append("remoteip", ip);

        const turnstileUrl =
          "https://challenges.cloudflare.com/turnstile/v0/siteverify";
        const result = await fetch(turnstileUrl, {
          body: turnstileForm,
          method: "POST",
        });
        const outcome = await result.json();
        // @ts-ignore
        verified = outcome.success;
      }
      if (Boolean(context.cloudflare.env.LOCAL)) verified = true;
      if (verified) {
        if (input === context.cloudflare.env.AUTHORIZEPASSWORD) {
          const token = await jwt.sign(
            { authorized: true, exp: getExpirationTime("15m") },
            context.cloudflare.env.JWT_SECRET
          );
          const headers = new Headers();
          headers.append("Set-Cookie", `auth=${token}; Path=/; HttpOnly`);
          return redirect("/", { headers });
        } else {
          redirectUrl.searchParams.set("error", `incorrect`);
          return redirect(`${redirectUrl}`);
        }
      } else {
        redirectUrl.searchParams.set("error", `incorrect`);
        return redirect(`${redirectUrl}`);
      }
    }
    case "userSubmission": {
      // Check if all required fields are present
      const requiredFields = [
        "image",
        "rating",
        "lat",
        "lon",
        "city",
        "data",
        "eventTime",
        "eventType",
      ];
      for (const field of requiredFields) {
        if (!formData.get(field)) {
          return Response.json(
            {
              error: `Missing required field: ${field}`,
              success: false,
            },
            { status: 400 }
          );
        }
      }

      const imageFile = formData.get("image");
      const rating = formData.get("rating");
      const lat = formData.get("lat");
      const lon = formData.get("lon");
      const city = formData.get("city");
      const data = formData.get("data");
      const eventTime = formData.get("eventTime");
      const eventType = formData.get("eventType");

      // Validate data types
      if (!imageFile || !(imageFile instanceof Blob)) {
        return Response.json(
          {
            error: "Invalid image format",
            success: false,
          },
          { status: 400 }
        );
      }

      // Validate numeric values
      if (
        isNaN(Number(rating)) ||
        isNaN(Number(lat)) ||
        isNaN(Number(lon)) ||
        isNaN(Number(eventTime))
      ) {
        return Response.json(
          {
            error: "Invalid numeric values provided",
            details: {
              rating: isNaN(Number(rating)) ? "invalid" : "valid",
              lat: isNaN(Number(lat)) ? "invalid" : "valid",
              lon: isNaN(Number(lon)) ? "invalid" : "valid",
              eventTime: isNaN(Number(eventTime)) ? "invalid" : "valid",
            },
            success: false,
          },
          { status: 400 }
        );
      }

      try {
        const API_URL = `https://api.cloudflare.com/client/v4/accounts/${context.cloudflare.env.CF_ACCOUNT_ID}/images/v1`;

        // Validate Cloudflare credentials
        if (
          !context.cloudflare.env.CF_ACCOUNT_ID ||
          !context.cloudflare.env.CF_TOKEN
        ) {
          return Response.json(
            {
              error: "Missing Cloudflare credentials",
              success: false,
            },
            { status: 500 }
          );
        }

        const imageFormData = new FormData();
        imageFormData.append("file", imageFile);

        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${context.cloudflare.env.CF_TOKEN}`,
            Accept: "application/json",
          },
          body: imageFormData,
        });

        if (!response.ok) {
          return Response.json(
            {
              error: "Error uploading image to images provider",
              details: `HTTP ${response.status}: ${response.statusText}`,
              success: false,
            },
            { status: response.status }
          );
        }

        const responseData = await response.json();
        // @ts-ignore
        const image_id = responseData?.result?.id;

        if (!image_id) {
          return Response.json(
            {
              error: "Error uploading image to images provider",
              details: "No image ID returned",
              responseData,
              success: false,
            },
            { status: 500 }
          );
        }

        try {
          await createUpload(context, {
            lat: Number(lat),
            lon: Number(lon),
            rating: Number(rating),
            image_id: image_id,
            city: String(city),
            data: data,
            time: Number(eventTime),
            type: String(eventType),
          });

          return Response.json(
            {
              message: "Uploaded to database",
              image_id,
              success: true,
            },
            { status: 201 }
          );
        } catch (error) {
          console.error("Error posting to database:", error);
          return Response.json(
            {
              error: "Failed to post to database",
              details: error instanceof Error ? error.message : "Unknown error",
              success: false,
            },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        return Response.json(
          {
            error: "Failed to upload image",
            details: error instanceof Error ? error.message : "Unknown error",
            success: false,
          },
          { status: 500 }
        );
      }
    }

    case "locationComponent": {
      const eventType = formData.get("eventType");
      const date = formData.get("date");
      const locationDataString = formData.get("locationData");
      if (!locationDataString || typeof locationDataString !== "string") {
        console.log("Error: Invalid location data, 400");
        return Response.json(
          { error: "Invalid location data" },
          { status: 400 }
        );
      }
      if (!eventType || typeof eventType !== "string") {
        console.log("Error: Invalid eventType, 400");
        return Response.json({ error: "Invalid eventType" }, { status: 400 });
      }
      if (!date || typeof date !== "string") {
        console.log("Error: Invalid date, 400");
        return Response.json({ error: "Invalid date" }, { status: 400 });
      }

      try {
        const parsedData = JSON.parse(locationDataString);
        if (isLocationData(parsedData)) {
          const locationData: LocationData = parsedData;
          let geocodingUrl = "";
          const apiKey = context.cloudflare.env.GOOGLE_MAPS_API_KEY;

          switch (locationData.type) {
            case "geolocation":
              geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                // @ts-expect-error fts
                locationData.data.coords.latitude
              )},${encodeURIComponent(
                // @ts-expect-error fts
                locationData.data.coords.longitude
              )}&key=${apiKey}`;
              break;
            case "input":
              geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                // @ts-expect-error fts
                locationData.data
              )}&key=${apiKey}`;
              break;
            default:
              console.error("Invalid locationData type");
          }
          const response = await fetch(geocodingUrl);
          const data = (await response.json()) as GeocodeResponse;

          if (data.status === "OK" && data) {
            const lat = data.results[0].geometry.location.lat;
            const lon = data.results[0].geometry.location.lng;
            const redirectUrl = new URL(url.origin);
            redirectUrl.searchParams.set("lat", `${lat}`);
            redirectUrl.searchParams.set("lon", `${lon}`);
            redirectUrl.searchParams.set(
              "city",
              getCityFromGeocodeResponse(data)
            );
            redirectUrl.searchParams.set(
              "date",
              date !== "next" ? date : "next"
            );
            redirectUrl.searchParams.set(
              "type",
              date !== "next" ? eventType : "next"
            );
            return redirect(redirectUrl.toString());
          } else {
            console.error("No geocoding results found");
            return redirect(
              appendErrorToUrl(
                url.search,
                `No results found for ${
                  locationData.type === "input"
                    ? locationData.data
                    : "coordinates"
                }`
              )
            );
          }
        } else {
          return redirect(
            appendErrorToUrl(url.search, `Invalid location data format`)
          );
        }
      } catch (error) {
        console.error("Error processing location data:", error);
        return redirect(
          appendErrorToUrl(
            url.search,
            `Error processing location data: ${error}`
          )
        );
      }
    }
    default:
      return Response.json({ error: "Unknown element type" }, { status: 400 });
  }
};

function appendErrorToUrl(baseUrlSearch: string, error?: string) {
  const searchParams = new URLSearchParams(
    baseUrlSearch.startsWith("?") ? baseUrlSearch.slice(1) : baseUrlSearch
  );
  if (error) {
    searchParams.append("error", `${error}`);
  }
  return `?${searchParams.toString()}`;
}

const getBackgroundColors = (rating: number | null) => {
  if (rating === null)
    return {
      base: "hsl(280, 35%, 7%)",
      gradient1: "hsla(315, 60%, 25%, 0.6)",
      gradient2: "hsla(290, 55%, 25%, 0.4)",
    };
  if (rating <= 10)
    return {
      base: "hsl(0, 45%, 8%)",
      gradient1: "hsla(0, 55%, 32%, 0.35)",
      gradient2: "hsla(0, 55%, 22%, 0.25)",
    };
  if (rating <= 20)
    return {
      base: "hsl(6, 45%, 9%)",
      gradient1: "hsla(6, 55%, 35%, 0.35)",
      gradient2: "hsla(6, 55%, 25%, 0.25)",
    };
  if (rating <= 30)
    return {
      base: "hsl(12, 45%, 10%)",
      gradient1: "hsla(12, 55%, 38%, 0.35)",
      gradient2: "hsla(12, 55%, 28%, 0.25)",
    };
  if (rating <= 45)
    return {
      base: "hsl(20, 45%, 10%)",
      gradient1: "hsla(20, 55%, 38%, 0.35)",
      gradient2: "hsla(20, 55%, 28%, 0.25)",
    };
  if (rating <= 60)
    return {
      base: "hsl(32, 45%, 10%)",
      gradient1: "hsla(32, 55%, 38%, 0.35)",
      gradient2: "hsla(32, 55%, 28%, 0.25)",
    };
  if (rating <= 70)
    return {
      base: "hsl(45, 45%, 10%)",
      gradient1: "hsla(45, 55%, 38%, 0.35)",
      gradient2: "hsla(45, 55%, 28%, 0.25)",
    };
  if (rating <= 80)
    return {
      base: "hsl(75, 45%, 10%)",
      gradient1: "hsla(75, 55%, 38%, 0.35)",
      gradient2: "hsla(75, 55%, 28%, 0.25)",
    };
  if (rating <= 85)
    return {
      base: "hsl(120, 45%, 10%)",
      gradient1: "hsla(120, 55%, 38%, 0.35)",
      gradient2: "hsla(120, 55%, 28%, 0.25)",
    };
  if (rating <= 95)
    return {
      base: "hsl(140, 45%, 11%)",
      gradient1: "hsla(140, 55%, 40%, 0.35)",
      gradient2: "hsla(140, 55%, 30%, 0.25)",
    };
  return {
    base: "hsl(142,48%,14%)",
    gradient1: "hsla(140,60%,39%,0.35)",
    gradient2: "hsla(140,64%,27%,0.25)",
  };
};

export default function Sunwatch() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");

  const initialSelection = useMemo(
    () => ({
      date: allData?.eventDate ?? null,
      type: allData?.eventType ?? "sunrise",
      rating: allData?.rating ?? null,
      eventTime: allData?.eventTime ?? null,
      timeZoneId: allData?.eventTimeZone ?? null,
      eventString: allData?.eventString ?? null,
      relative: allData?.relative ?? null,
      isPending: false,
    }),
    [
      allData?.eventDate,
      allData?.eventType,
      allData?.rating,
      allData?.eventTime,
      allData?.eventTimeZone,
      allData?.eventString,
      allData?.relative,
    ]
  );

  return (
    <WeeklySelectionProvider initialState={initialSelection}>
      <SunwatchContent allData={allData} />
    </WeeklySelectionProvider>
  );
}

function SunwatchContent({ allData }: { allData?: LoaderData }) {
  const navigation = useNavigation();
  const { selection, setSelection } = useWeeklySelection();

  useEffect(() => {
    if (!allData) return;
    
    // Only sync when navigation completes (not during loading)
    if (navigation.state === "idle") {
      setSelection({
        date: allData.eventDate ?? null,
        type: allData.eventType ?? "sunrise",
        rating: allData.rating ?? null,
        eventTime: allData.eventTime ?? null,
        timeZoneId: allData.eventTimeZone ?? null,
        eventString: allData.eventString ?? null,
        relative: allData.relative ?? null,
        isPending: false,
      });
    }
  }, [
    allData?.eventDate,
    allData?.eventType,
    allData?.rating,
    allData?.eventTime,
    allData?.eventTimeZone,
    allData?.eventString,
    allData?.relative,
    navigation.state,
    setSelection,
  ]);

  const effectiveRating = selection.rating ?? allData?.rating ?? null;

  useEffect(() => {
    if (!effectiveRating) return;
    const colors = getBackgroundColors(
      !allData?.lat && !allData?.lon ? null : effectiveRating
    );
    const root = document.documentElement;

    root.style.setProperty("--bg-base-color", colors.base);
    root.style.setProperty("--gradient-1-color", colors.gradient1);
    root.style.setProperty("--gradient-2-color", colors.gradient2);

    const backgroundElement = document.querySelector(".background-colors");
    if (backgroundElement) {
      if (effectiveRating > 95) {
        backgroundElement.classList.add("high-rating");
      } else {
        backgroundElement.classList.remove("high-rating");
      }
    }
  }, [effectiveRating, allData?.lat, allData?.lon]);

  return (
    <div
      className={`w-screen min-h-screen background-colors overflow-x-hidden ${
        effectiveRating && effectiveRating > 95 ? "high-rating" : ""
      }`}
    >
      <div className={"w-screen text-center mx-auto"}>
        <Link
          to={"/"}
          className={`relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0  after:transition-transform hover:after:scale-x-100 ${
            allData?.authorized
              ? "text-green-600/40 after:bg-green-600/40"
              : "text-white/40 after:bg-white/40"
          } text-xs`}
          onClick={() => {
            const colors = getBackgroundColors(null);
            const root = document.documentElement;

            root.style.setProperty("--bg-base-color", colors.base);
            root.style.setProperty("--gradient-1-color", colors.gradient1);
            root.style.setProperty("--gradient-2-color", colors.gradient2);
          }}
        >
          sunwatch
        </Link>
      </div>
      <LocationComponent />
      <Alert />
      <LocationDisplay />
      <RatingDisplay />
      <WeeklyOutlook />
      <CloudCoverDisplay />
      <LazyMap />
      <SubmitComponent />
      <Footer />
    </div>
  );
}
