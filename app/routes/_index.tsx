import type { MetaFunction } from "@remix-run/cloudflare";
import LocationComponent from "~/components/LocationComponent";
import React from "react";
import { json, LoaderFunction } from "@remix-run/router";
import { Link, redirect, replace } from "@remix-run/react";
import { LocationData } from "~/components/LocationComponent";
import { getSunrise, getSunset } from "sunrise-sunset-js";
import {
  averageData,
  generateCoordinateString,
  getRelative,
  getRelevantSunEvent,
  getStringLiteral,
  interpolateWeatherData,
} from "~/.server/data";
import { skyRating } from "~/.server/rating";
import ColorGrid from "~/components/ColorGrid";
import {
  AveragedValues,
  InterpolatedWeather,
  WeatherLocation,
} from "~/.server/interfaces";
import RatingDisplay from "~/components/RatingDisplay";
import LocationDisplay from "~/components/LocationDisplay";
import Alert from "~/components/Alert";

export const meta: MetaFunction = () => {
  return [{ title: "swv3" }, { name: "swv3", content: "" }];
};

export const loader: LoaderFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const city = url.searchParams.get("city");
  let error = url.searchParams.get("error");
  if (!lat || !lon || !city) {
    return { ok: false, message: error };
  }

  const { type: eventType, time: eventTime } = getRelevantSunEvent(
    Number(lat),
    Number(lon)
  );
  const apiKey = context.cloudflare.env.METEO_KEY;
  // @ts-ignore
  const coords = generateCoordinateString(lat, lon, eventType);
  const response = await fetch(
    `https://customer-api.open-meteo.com/v1/forecast?${coords}&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&past_days=1&forecast_days=2&apikey=${apiKey}`
  );
  const weatherData = await response.json();
  if (!eventTime) return null;
  const interpData = interpolateWeatherData(
    weatherData as WeatherLocation[],
    eventTime
  );
  const rating = skyRating(interpData as InterpolatedWeather[]);
  const stats = averageData(interpData);
  if ((!eventTime || !eventType) && !error)
    error = "No sunrise or sunset found";

  return {
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    city: String(city),
    eventType: eventType,
    eventTime: eventTime,
    now: Math.round(Date.now() / 1000),
    rating: rating,
    weatherData: interpData,
    allData: weatherData,
    stats: stats as AveragedValues,
    message: error,
    eventString: getStringLiteral(
      Math.round(Date.now() / 1000),
      eventTime,
      eventType
    ),
    relative: getRelative(Math.round(Date.now() / 1000), eventTime),
    ok: true,
  };
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

// @ts-expect-error
export const action: ActionFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const formData = await request.formData();
  const locationDataString = formData.get("locationData");
  if (typeof locationDataString !== "string") {
    return json({ error: "Invalid location data" }, { status: 400 });
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
          Error("Invalid locationData type");
      }

      const response = await fetch(geocodingUrl);
      const data = await response.json();
      // @ts-expect-error fts
      if (data.status === "OK") {
        return redirect(
          `/?lat=${encodeURIComponent(
            // @ts-expect-error fts
            data.results[0].geometry.location.lat
          )}&lon=${encodeURIComponent(
            // @ts-expect-error fts
            data.results[0].geometry.location.lng
            // @ts-expect-error fts
          )}&city=${encodeURIComponent(data.results[0].formatted_address)}`
        );
      } else {
        console.error("No geocoding results found");
        return redirect(
          appendErrorToUrl(
            url.search,
            `No results found for ${locationData.data}`
          )
        );
      }
    } else {
      return redirect(
        appendErrorToUrl(url.search, `Invalid location data format`)
      );
    }
  } catch (error) {
    console.error("Error parsing location data:", error);
    return redirect(
      appendErrorToUrl(url.search, `Error parsing location data: ${error}`)
    );
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

export default function Sunwatch() {
  return (
    <div className={"w-screen min-h-screen blob roboto overflow-x-hidden"}>
      <div className={"w-screen text-center mx-auto"}>
        <Link to={"/"} className={"text-white/50 text-xs cursor-pointer"}>
          SWV3
        </Link>
      </div>
      <LocationComponent />
      <Alert />
      <LocationDisplay />
      <RatingDisplay />
      <ColorGrid />
    </div>
  );
}
