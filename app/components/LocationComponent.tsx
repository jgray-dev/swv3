import React, { useEffect, useState } from "react";
import {Form, useFetcher, useRouteLoaderData} from "@remix-run/react";
import { CiLocationArrow1 } from "react-icons/ci";

export interface LocationData {
  type: "geolocation" | "input";
  data: GeolocationPosition | string;
}

export default function LocationComponent() {
  const [geolocationError, setGeolocationError] = useState<boolean>(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [gotGeolocation, setGotGeolocation] = useState<boolean>(false);
  const [gettingGeolocation, setGettingGeolocation] = useState<boolean>(false);
  const data = useRouteLoaderData("routes/_index")
  const [input, setInput] = useState<string>(data?.city);
  const fetcher = useFetcher();
  useEffect(() => {
    if (locationData) {
      fetcher.submit(
        { locationData: JSON.stringify(locationData) },
        { method: "post" }
      );
    }
  }, [locationData]);

  
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocationData({
      type: "input",
      data: input,
    });
  };

  function handleGeolocation() {
    if (!geolocationError) {
      setGettingGeolocation(true);
      console.log("Using geolocation function");
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log(position);
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
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
        <Form
          onSubmit={handleManualSubmit}
          className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
        >
          <input
            type="text"
            required
            className="w-full sm:w-64 px-4 py-2 bg-slate-800 border border-slate-700 
                   rounded-lg text-slate-100 placeholder-slate-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500 
                   transition-all duration-200"
            placeholder="Enter location manually"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-slate-700 text-slate-100
                   rounded-lg hover:bg-slate-600 active:bg-slate-800
                   transition-colors duration-200"
          >
            Submit
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
                   w-full sm:w-auto flex items-center justify-center ${
                     geolocationError
                       ? "bg-slate-800 cursor-not-allowed"
                       : gotGeolocation
                       ? "bg-slate-700"
                       : "bg-slate-700 hover:bg-slate-600 active:bg-slate-800 cursor-pointer"
                   }`}
          title={geolocationError ? "Error using GPS" : "Use GPS Location"}
        >
          <span className="block sm:hidden mr-2">Use location</span>
          <CiLocationArrow1
            className={`h-6 w-6 transition-all duration-200 ${
              geolocationError
                ? "text-red-500"
                : gotGeolocation
                ? "text-green-500"
                : "text-slate-100"
            } ${
              gettingGeolocation
                ? gotGeolocation
                  ? "text-green-500"
                  : "animate-pulse text-blue-400"
                : ""
            }`}
          />
        </button>
      </div>
    </div>
  ); 
}
