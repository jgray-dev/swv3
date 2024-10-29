import type { MetaFunction } from "@remix-run/cloudflare";
import LocationComponent from "~/components/LocationComponent";
import React from "react";
import { json, LoaderFunction } from "@remix-run/router";
import { redirect, useRouteLoaderData } from "@remix-run/react";
import { LocationData } from "~/components/LocationComponent";
import { Details } from "~/components/Details";
import { getSunrise, getSunset } from "sunrise-sunset-js";
import {
  generateCoordinateString,
  interpolateWeatherData,
} from "~/.server/data";
import { skyRating } from "~/.server/rating";
import ColorGrid from "~/components/ColorGrid";
import {WeatherLocation} from "~/.server/interfaces";

export const meta: MetaFunction = () => {
  return [{ title: "swv3" }, { name: "swv3", content: "attempt 6??" }];
};

export const loader: LoaderFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const city = url.searchParams.get("city");
  if (!lat || !lon || !city) return null;
  const sunrise = Math.round(
    new Date(getSunrise(parseFloat(lat), parseFloat(lon))).getTime() / 1000
  );
  const sunset = Math.round(
    new Date(getSunset(parseFloat(lat), parseFloat(lon))).getTime() / 1000
  );
  const now = Math.round(Date.now() / 1000);

  let eventType;
  let eventTime;
  console.log(sunrise)
  console.log(sunset)
  console.log(now)
  if (sunrise > now && sunset > now) {
    // Both events are in the future, pick the nearest one
    eventType = sunrise < sunset ? "sunrise" : "sunset";
    eventTime = sunrise < sunset ? sunrise : sunset;
  } else if (sunrise <= now && sunset <= now) {
    // Both events are in the past, assume next day's sunrise
    eventType = "sunrise";
    eventTime = sunrise + 86400
    console.error("Both times are in the past (index loader eventType)");
  } else {
    // One event is in the past, one in future - pick the future event
    eventType = sunrise > now ? "sunrise" : "sunset";
    eventTime = sunrise > now ? sunrise : sunset;
  }
  const apiKey = context.cloudflare.env.METEO_KEY;
  // @ts-ignore
  const coords = generateCoordinateString(lat, lon, eventType);
  const response = await fetch(
    `https://customer-api.open-meteo.com/v1/forecast?${coords}&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&past_days=1&forecast_days=2&apikey=${apiKey}`
  );
  const weatherData = await response.json();
  const rating = skyRating(weatherData as WeatherLocation[]);
  if (!eventTime) return null;
  const interpData = interpolateWeatherData(
    weatherData as WeatherLocation[],
    eventTime
  );
  return {
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    city: String(city),
    eventType: eventType,
    eventTime: eventTime,
    now: Math.round(Date.now() / 1000),
    rating: rating,
    weatherData: interpData,
    allData: weatherData
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
        console.log(data);
        console.error("No geocoding results found");
        return { error: "No results found" };
      }
    } else {
      return json({ error: "Invalid location data format" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error parsing location data:", error);
    return json({ error: "Error parsing location data" }, { status: 400 });
  }
};

export default function Sunwatch() {
  return (
    <div className={"w-screen min-h-screen bg-gray-950"}>
      <div>
        <LocationComponent />
        <Details />
        <ColorGrid />
      </div>
    </div>
  );
}
