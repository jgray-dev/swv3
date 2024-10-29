import type { MetaFunction } from "@remix-run/cloudflare";
import LocationComponent from "~/components/LocationComponent";
import React from "react";
import { json, LoaderFunction } from "@remix-run/router";
import { redirect, useLoaderData } from "@remix-run/react";
import { LocationData } from "~/components/LocationComponent";
import { Details } from "~/components/Details";
import { getSunrise, getSunset } from "sunrise-sunset-js";
import { generateCoordinateString } from "~/.server/data";

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
  const eventType = sunrise > sunset ? "sunset" : "sunrise";
  const apiKey = context.cloudflare.env.METEO_KEY;
  const milesToDegrees = 20 / 69; // approximately 0.29 degrees per 20 miles
  const coords = generateCoordinateString(lat, lon, eventType);
  return {
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    city: String(city),
    data: {
      eventType: eventType,
      sunrise: sunrise,
      sunset: sunset,
      coords: coords,
    },
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

// @ts-expect-error fts
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
  const locationData = useLoaderData<{
    lat: number;
    lon: number;
    city: string;
  } | null>();
  return (
    <div className={"w-screen min-h-screen bg-gray-950"}>
      <div>
        <LocationComponent />
        {locationData && <Details />}
      </div>
    </div>
  );
}
