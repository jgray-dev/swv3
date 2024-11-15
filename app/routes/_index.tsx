import type { ActionFunction, MetaFunction } from "@remix-run/cloudflare";
import LocationComponent from "~/components/LocationComponent";
import React, { useEffect } from "react";
import { json, LoaderFunction } from "@remix-run/router";
import { Link, redirect, useRouteLoaderData } from "@remix-run/react";
import { LocationData } from "~/components/LocationComponent";
import {
  averageData,
  checkImage,
  createNoonDate,
  findNextSunEvent,
  generateCoordinateString, getCityFromGeocodeResponse,
  getRelative,
  getRelevantSunEvent,
  getStringLiteral,
  interpolateWeatherData,
  purgeDuplicates,
  unixToApproximateString,
} from "~/.server/data";
import { skyRating } from "~/.server/rating";
import {
  AveragedValues, GeocodeResponse,
  InterpolatedWeather,
  LoaderData,
  TimeZoneApiResponse,
  WeatherLocation,
} from "~/.server/interfaces";
import RatingDisplay from "~/components/RatingDisplay";
import LocationDisplay from "~/components/LocationDisplay";
import Alert from "~/components/Alert";
import CloudCoverDisplay from "~/components/CloudCoverDisplay";
import Map from "~/components/Map";
import SubmitComponent from "~/components/SubmitComponent";
import { createUpload, getSubmissions } from "~/.server/database";
import SunCalc from "suncalc";

export const meta: MetaFunction = () => {
  return [
    { title: "SWV3" },
    {
      name: "SWV3",
      content:
        "Sunwatch. An app designed to show visual ratings for sunrises and sunsets around the world.",
    },
  ];
};

export const loader: LoaderFunction = async ({ request, context }) => {
  const currentUnixTime = Math.floor(Date.now() / 1000);
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const city = url.searchParams.get("city");
  let error = url.searchParams.get("error");
  if (!lat || !lon || !city) {
    let mapData = await getSubmissions(context);
    return { ok: false, message: error, uploads: mapData };
  }

  const meteoApiKey = context.cloudflare.env.METEO_KEY;
  const googleApiKey = context.cloudflare.env.GOOGLE_MAPS_API_KEY;

  //Generate a coordinate string of locations looking in east/west (dep on eventType)
  let { type: eventType, time: eventTime } = getRelevantSunEvent(
    Number(lat),
    Number(lon)
  );
  const coords = generateCoordinateString(Number(lat), Number(lon), eventType);

  //Grab one day before and one day after of dates in YYYY-MM-DD format, for use in the open meteo api call
  let dayBefore, dayAfter;
  let historic = false;
  let dateUrl = url.searchParams.get("date");
  if (dateUrl === "next" || !dateUrl) {
    historic = true
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
  const [mapData, meteoResponse, timezoneResponse] = await Promise.all([
    getSubmissions(context),
    fetch(
      `https://customer-historical-forecast-api.open-meteo.com/v1/forecast?${coords}&start_date=${dayBefore}&end_date=${dayAfter}&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,freezing_level_height&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&apikey=${meteoApiKey}`
    ),
    fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${encodeURIComponent(
        lat
      )}%2C${encodeURIComponent(lon)}&timestamp=${encodeURIComponent(
        currentUnixTime
      )}&key=${googleApiKey}`
    ),
  ]);

  // Return error for failure to fetch database
  if (!mapData) return;

  // Await json and parse the timezone response
  const parsedTimezoneResponse =
    (await timezoneResponse.json()) as TimeZoneApiResponse;
  // Return error for failure to parse timezone api response
  if (parsedTimezoneResponse.status !== "OK")
    redirect(
      appendErrorToUrl(
        url.search,
        `Error fetching TimeZone API [${parsedTimezoneResponse.status}]`
      )
    );
  //Grab the specific timezone from the api response
  const timezone = parsedTimezoneResponse.timeZoneId;

  //Create a correctly formatted date object at noon in the specified timezone
  const noon = createNoonDate(dateUrl, timezone);
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
        break;
      case "sunset":
        eventType = "sunset";

        eventTime = Math.round(
          SunCalc.getTimes(noon, Number(lat), Number(lon)).sunset.getTime() /
            1000
        );
        break;
      default:
        console.error("invalid type url");
    }
  }

  // Parse our weather data as json.
  let parsedAllWeatherData = await meteoResponse.json();
  // @ts-ignore
  if (parsedAllWeatherData?.error) {
    return {
      // @ts-ignore
      message: `Error fetching weather API ${parsedAllWeatherData?.reason}`,
      ok: false,
      uploads: await getSubmissions(context),
    };
  }
  //@ts-ignore
  if (!eventType) {
    return {
      message: "No sunrise or sunsets found in the next 48 hours.",
      ok: false,
      uploads: await getSubmissions(context),
    };
  }
  if (!eventTime) {
    return {
      message: `No ${eventType} time found | Next event in approximately ${unixToApproximateString(
        findNextSunEvent(Number(lat), Number(lon))
      )}`,
      ok: false,
      uploads: await getSubmissions(context),
    };
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
  if ((!eventTime || !eventType) && !error)
    error = "No sunrise or sunset found";
  return {
    allData: parsedAllWeatherData,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    city: String(city),
    eventType: eventType,
    eventTime: eventTime,
    now: Math.round(Date.now() / 1000),
    rating: rating,
    weatherData: interpData,
    stats: stats as AveragedValues,
    message: error,
    ratingDebug: debugData,
    eventString: getStringLiteral(
      Math.round(Date.now() / 1000),
      eventTime,
      eventType
    ),
    relative: getRelative(Math.round(Date.now() / 1000), eventTime),
    ok: true,
    uploads: mapData,
    eventDate: dateUrl,
    useNext: historic
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

export const action: ActionFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const formData = await request.formData();
  const element = formData.get("element");
  if (!element || typeof element !== "string") {
    return json({ error: "Missing form identifier" }, { status: 500 });
  }
  switch (element) {
    case "userSubmission": {
      const imageFile = formData.get("image");
      const rating = formData.get("rating");
      const lat = formData.get("lat");
      const lon = formData.get("lon");
      const city = formData.get("city");
      const data = formData.get("data");
      const eventTime = formData.get("eventTime");
      const eventType = formData.get("eventType");
      
      if (imageFile && imageFile instanceof Blob) {
        const safe = await checkImage(context, imageFile);
        if (!safe)
          return json(
            {
              error: `Unsafe image detected.`,
              success: false,
            },
            { status: 418 }
          );

        try {
          const API_URL = `https://api.cloudflare.com/client/v4/accounts/${context.cloudflare.env.CF_ACCOUNT_ID}/images/v1`;
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
          const responseData = await response.json();
          if (!response.ok) {
            return json(
              {
                error: `Error uploading image to images provider`,
                success: false,
              },
              { status: 500 }
            );
          }
          // @ts-ignore
          const image_id = responseData?.result?.id;
          if (!image_id) {
            return json(
              {
                error: `Error uploading image to images provider [invalid image_id]`,
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
              city: `${city}`,
              data: data,
              time: Number(eventTime),
              type: `${eventType}`
            });
            return json(
              { message: "Uploaded to database", success: true },
              { status: 201 }
            );
          } catch (error) {
            console.error("Error posting database: ", error);
            return json(
              { error: "Failed to post database", success: false },
              { status: 500 }
            );
          }
        } catch (error) {
          console.error("Error uploading image:", error);
          return json(
            { error: "Failed to upload image", success: false },
            { status: 500 }
          );
        }
      }
      return json({ error: "No image file provided" }, { status: 400 });
    }

    case "locationComponent": {
      const eventType = formData.get("eventType");
      const date = formData.get("date");
      const locationDataString = formData.get("locationData");
      if (!locationDataString || typeof locationDataString !== "string") {
        return json({ error: "Invalid location data" }, { status: 400 });
      }
      if (!eventType || typeof eventType !== "string") {
        return json({ error: "Invalid eventType" }, { status: 400 });
      }
      if (!date || typeof date !== "string") {
        return json({ error: "Invalid date" }, { status: 400 });
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
          const data = await response.json() as GeocodeResponse;

          if (data.status === "OK" && data) {
            const lat = data.results[0].geometry.location.lat;
            const lon = data.results[0].geometry.location.lng;
            const redirectUrl = new URL(url.origin);
            redirectUrl.searchParams.set("lat", `${lat}`);
            redirectUrl.searchParams.set("lon", `${lon}`);
            redirectUrl.searchParams.set(
              "city", getCityFromGeocodeResponse(data)
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
      return json({ error: "Unknown element type" }, { status: 400 });
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
      base: "hsl(220, 48%, 6%)",
      gradient1: "hsla(225, 69%, 20%, 0.75)",
      gradient2: "hsla(262, 68%, 19%, 0.45)",
    };
  if (rating <= 10)
    return {
      base: "hsl(0, 45%, 8%)",
      gradient1: "hsla(0, 55%, 32%, 0.35)",
      gradient2: "hsla(0, 55%, 22%, 0.25)",
    };
  if (rating <= 20)
    return {
      base: "hsl(4, 45%, 9%)",
      gradient1: "hsla(4, 55%, 35%, 0.35)",
      gradient2: "hsla(4, 55%, 25%, 0.25)",
    };
  if (rating <= 30)
    return {
      base: "hsl(8, 45%, 10%)",
      gradient1: "hsla(8, 55%, 38%, 0.35)",
      gradient2: "hsla(8, 55%, 28%, 0.25)",
    };
  if (rating <= 45)
    return {
      base: "hsl(24, 45%, 10%)",
      gradient1: "hsla(24, 55%, 38%, 0.35)",
      gradient2: "hsla(24, 55%, 28%, 0.25)",
    };
  if (rating <= 60)
    return {
      base: "hsl(36, 45%, 10%)",
      gradient1: "hsla(36, 55%, 38%, 0.35)",
      gradient2: "hsla(36, 55%, 28%, 0.25)",
    };
  if (rating <= 70)
    return {
      base: "hsl(48, 45%, 10%)",
      gradient1: "hsla(48, 55%, 38%, 0.35)",
      gradient2: "hsla(48, 55%, 28%, 0.25)",
    };
  if (rating <= 80)
    return {
      base: "hsl(84, 45%, 10%)",
      gradient1: "hsla(84, 55%, 38%, 0.35)",
      gradient2: "hsla(84, 55%, 28%, 0.25)",
    };
  if (rating <= 85)
    return {
      base: "hsl(142, 45%, 10%)",
      gradient1: "hsla(142, 55%, 38%, 0.35)",
      gradient2: "hsla(142, 55%, 28%, 0.25)",
    };
  if (rating <= 95)
    return {
      base: "hsl(152, 45%, 11%)",
      gradient1: "hsla(152, 55%, 40%, 0.35)",
      gradient2: "hsla(152, 55%, 30%, 0.25)",
    };
  return {
    base: "hsl(160, 45%, 11%)",
    gradient1: "hsla(160, 55%, 40%, 0.35)",
    gradient2: "hsla(160, 55%, 30%, 0.25)",
  };
};

export default function Sunwatch() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");

  useEffect(() => {
    if (allData?.rating) {
      const colors = getBackgroundColors(
        !allData.lat && !allData.lon ? null : allData.rating
      );
      const root = document.documentElement;

      root.style.setProperty("--bg-base-color", colors.base);
      root.style.setProperty("--gradient-1-color", colors.gradient1);
      root.style.setProperty("--gradient-2-color", colors.gradient2);
    }
  }, [allData?.rating, allData?.lat, allData?.lon]);

  return (
    <div className={"w-screen min-h-screen blob overflow-x-hidden"}>
      <div className={"w-screen text-center mx-auto"}>
        <Link
          to={"/"}
          className={"text-white/50 text-xs cursor-pointer"}
          onMouseDown={() => {
            const colors = getBackgroundColors(null);
            const root = document.documentElement;

            root.style.setProperty("--bg-base-color", colors.base);
            root.style.setProperty("--gradient-1-color", colors.gradient1);
            root.style.setProperty("--gradient-2-color", colors.gradient2);
          }}
        >
          SWV3
        </Link>
      </div>
      <LocationComponent />
      <Alert />
      <LocationDisplay />
      <RatingDisplay />
      <CloudCoverDisplay />
      <Map />
      <SubmitComponent />
    </div>
  );
}
