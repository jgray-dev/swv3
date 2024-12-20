import type { ActionFunction, MetaFunction } from "@remix-run/cloudflare";
import { Link, redirect, useRouteLoaderData } from "@remix-run/react";
import { json, LoaderFunction } from "@remix-run/router";
import React, { Suspense, useEffect } from "react";
import SunCalc from "suncalc";
import jwt from "@tsndr/cloudflare-worker-jwt";
import {
  averageData,
  checkImage,
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

import Alert from "~/components/Alert";
import LocationComponent from "~/components/LocationComponent";

import LocationDisplay from "~/components/LocationDisplay";
import RatingDisplay from "~/components/RatingDisplay";

const CloudCoverDisplay = React.lazy(
  () => import("~/components/CloudCoverDisplay")
);
// import CloudCoverDisplay from "~/components/CloudCoverDisplay";

import MapSuspense from "~/components/MapSuspense";
const Map = React.lazy(() => import("~/components/Map"));
// import Map from "~/components/Map";

const SubmitComponent = React.lazy(
  () => import("~/components/SubmitComponent")
);
// import SubmitComponent from "~/components/SubmitComponent";

const Footer = React.lazy(() => import("~/components/Footer"));
// import Footer from "~/components/Footer";

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

    //Grab one day before and one day after of dates in YYYY-MM-DD format, for use in the open meteo api call
    let dayBefore, dayAfter;
    let historic = false;
    if (dateUrl === "next" || !dateUrl) {
      historic = true;
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

    const [coords, bearing] = generateCoordinateString(
      Number(lat),
      Number(lon),
      eventType,
      eventDate
    );

    const googleApiKey = context.cloudflare.env.GOOGLE_MAPS_API_KEY;
    const currentUnixTime = Math.floor(Date.now() / 1000);
    const basePromises = [
      await getSubmissions(context),
      await fetch(
        `https://customer-historical-forecast-api.open-meteo.com/v1/forecast?${coords}&start_date=${dayBefore}&end_date=${dayAfter}&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,freezing_level_height&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&apikey=${meteoApiKey}`
      ),
    ] as const;

    const responses = historic
      ? await Promise.all([
          ...basePromises,
          fetch(
            `https://maps.googleapis.com/maps/api/timezone/json?location=${encodeURIComponent(
              lat
            )}%2C${encodeURIComponent(lon)}&timestamp=${encodeURIComponent(
              currentUnixTime
            )}&key=${googleApiKey}`
          ),
        ])
      : await Promise.all(basePromises);

    const [mapData, meteoResponse] = responses;
    const permaLink = historic
      ? await (async () => {
          const timezoneResponse = responses[2];
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

          return generatePermaLink(
            unixToDateString(eventTime, parsedTimezoneResponse.timeZoneId),
            searchParams.toString(),
            eventType
          );
        })()
      : generatePermaLink(dateUrl, searchParams.toString(), eventType);

    // Return error for failure to fetch database
    if (!mapData)
      return {
        ok: false,
        message: error ?? "Error fetching database",
        authorized: authorized,
      };

    // Parse our weather data as json.
    let parsedAllWeatherData;

    try {
      parsedAllWeatherData = await meteoResponse.json();
    } catch (e) {
      return {
        message: `Error fetching weather API. Try again later [0]`,
        ok: false,
        uploads: await getSubmissions(context),
        authorized: authorized,
      };
    }
    // @ts-ignore
    if (parsedAllWeatherData?.error) {
      return {
        message: `Error fetching weather API. Try again later [1]`,
        ok: false,
        uploads: await getSubmissions(context),
        authorized: authorized,
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
      authorized: authorized,
      permaLink: `${url.origin}/share?${permaLink}`,
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
      bearing: bearing,
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
      useNext: historic,
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
    return json({ error: "Missing form identifier" }, { status: 500 });
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
          return json(
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
        return json(
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
        return json(
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

      // Check image safety
      try {
        const safe = await checkImage(context, imageFile);
        if (!safe) {
          return json(
            {
              error: "Unsafe image detected",
              success: false,
            },
            { status: 418 }
          );
        }
      } catch (error) {
        console.error(error);
        return json(
          {
            error: "Failed to check image safety. Please try again",
            details: error instanceof Error ? error.message : "Unknown error",
            success: false,
          },
          { status: 500 }
        );
      }

      try {
        const API_URL = `https://api.cloudflare.com/client/v4/accounts/${context.cloudflare.env.CF_ACCOUNT_ID}/images/v1`;

        // Validate Cloudflare credentials
        if (
          !context.cloudflare.env.CF_ACCOUNT_ID ||
          !context.cloudflare.env.CF_TOKEN
        ) {
          return json(
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
          return json(
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
          return json(
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

          return json(
            {
              message: "Uploaded to database",
              image_id,
              success: true,
            },
            { status: 201 }
          );
        } catch (error) {
          console.error("Error posting to database:", error);
          return json(
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
        return json(
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
        return json({ error: "Invalid location data" }, { status: 400 });
      }
      if (!eventType || typeof eventType !== "string") {
        console.log("Error: Invalid eventType, 400");
        return json({ error: "Invalid eventType" }, { status: 400 });
      }
      if (!date || typeof date !== "string") {
        console.log("Error: Invalid date, 400");
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
  useEffect(() => {
    if (allData?.rating) {
      const colors = getBackgroundColors(
        !allData.lat && !allData.lon ? null : allData.rating
      );
      const root = document.documentElement;

      root.style.setProperty("--bg-base-color", colors.base);
      root.style.setProperty("--gradient-1-color", colors.gradient1);
      root.style.setProperty("--gradient-2-color", colors.gradient2);

      const backgroundElement = document.querySelector(".background-colors");
      if (backgroundElement) {
        if (allData.rating > 95) {
          backgroundElement.classList.add("high-rating");
        } else {
          backgroundElement.classList.remove("high-rating");
        }
      }
    }
  }, [allData?.rating, allData?.lat, allData?.lon]);

  return (
    <div
      className={`w-screen min-h-screen background-colors overflow-x-hidden ${
        allData?.rating && allData?.rating > 95 ? "high-rating" : ""
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
      <CloudCoverDisplay />
      <Suspense fallback={<MapSuspense />}>
        <Map />
      </Suspense>
      <SubmitComponent />
      <Footer />
    </div>
  );
}
