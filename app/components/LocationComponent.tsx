import React, { useEffect, useState } from "react";
import { Form, useFetcher, useRouteLoaderData } from "@remix-run/react";
import { CiLocationArrow1 } from "react-icons/ci";
import {LoaderData} from "~/.server/interfaces";
import {FaSearchLocation} from "react-icons/fa";
import {GiMoebiusTriangle} from "react-icons/gi";

export interface LocationData {
  type: "geolocation" | "input";
  data: GeolocationPosition | string;
}

export default function LocationComponent() {
  const [geolocationError, setGeolocationError] = useState<boolean>(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [gotGeolocation, setGotGeolocation] = useState<boolean>(false);
  const [gettingGeolocation, setGettingGeolocation] = useState<boolean>(false);
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [input, setInput] = useState<string>(allData? allData.city:"");
  const fetcher = useFetcher();
  useEffect(() => {
    if (locationData) {
      console.log(locationData)
      fetcher.submit(
        { locationData: JSON.stringify(locationData) },
        { method: "post" }
      );
    }
  }, [locationData]);

  const handleManualSubmit = (e: React.FormEvent) => {
    console.log(input)
    e.preventDefault();
    setLocationData({
      type: "input",
      data: input,
    });
  };

  function handleGeolocation() {
    if (!geolocationError) {
      setGettingGeolocation(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log(position)
            setGotGeolocation(true);
            setLocationData({
              type: "geolocation",
              data: position,
            });
          },
          (err) => {
            setGettingGeolocation(false);
            setGeolocationError(true);
            console.error(err);
          }
        );
      } else {
        setGettingGeolocation(false);
        setGeolocationError(true);
      }
    }
  }
  return (
    <div className="p-4 sm:p-6 md:p-8" role="region" aria-label="Location Search">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
        <Form
          onSubmit={handleManualSubmit}
          className="flex flex-row gap-2 w-full sm:w-auto"
        >
          <label htmlFor="location-input" className="sr-only">
            Enter location manually
          </label>
          <input
            id="location-input"
            type="text"
            required
            className="w-full sm:w-64 px-4 py-2 
                     bg-white/10 backdrop-blur-sm
                     border border-white/20 
                     rounded-lg text-slate-100 placeholder-slate-400
                     focus:outline-none focus:ring-2 focus:ring-blue-400/50 
                     focus:bg-white/20 focus:backdrop-blur-md
                     transition-all duration-200"
            placeholder="Enter location manually"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={e => e.target.select()}
            aria-label="Location input"
          />
          <button
            type="submit"
            className="px-4 py-2 
                     bg-white/20 backdrop-blur-sm
                     border border-white/10
                     rounded-lg hover:bg-white/30 
                     active:bg-white/10
                     transition-all duration-200 w-auto
                     text-slate-100"
            aria-label="Submit location search"
          >
            <FaSearchLocation className="w-6 h-6 block sm:hidden" aria-hidden="true" />
            <span className="hidden sm:block">Submit</span>
          </button>
        </Form>
        <button
          onClick={() => {
            geolocationError
              ? alert("Unable to use GPS. Did you deny the permission?")
              : gettingGeolocation
                ? null
                : gotGeolocation
                  ? null
                  : handleGeolocation();
          }}
          className={`py-2 px-4 rounded-lg transition-all duration-200 sm:ml-2 
                   w-full sm:w-auto flex items-center justify-center
                   backdrop-blur-sm border
                   ${
            geolocationError
              ? "bg-red-500/20 border-red-500/30 cursor-not-allowed"
              : gotGeolocation
                ? "bg-green-500/20 border-green-500/30"
                : "bg-white/20 border-white/10 hover:bg-white/30 active:bg-white/10 cursor-pointer"
          }`}
          disabled={geolocationError || gettingGeolocation || gotGeolocation}
          aria-label={
            geolocationError
              ? "GPS location unavailable"
              : gotGeolocation
                ? "GPS location acquired"
                : "Use GPS location"
          }
          aria-live="polite"
        >
          <span className="block sm:hidden mr-2">Use location</span>
          <CiLocationArrow1
            className={`h-6 w-6 transition-all duration-200 ${
              geolocationError
                ? "text-red-400"
                : gotGeolocation
                  ? "text-green-400"
                  : "text-slate-100"
            } ${
              gettingGeolocation
                ? gotGeolocation
                  ? "text-green-400"
                  : "animate-pulse text-blue-400"
                : ""
            }`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
