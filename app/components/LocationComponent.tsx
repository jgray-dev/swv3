import React, { useEffect, useState } from "react";
import { Form, useFetcher, useRouteLoaderData } from "@remix-run/react";
import { CiLocationArrow1 } from "react-icons/ci";
import { FaSearchLocation } from "react-icons/fa";
import { BsSunrise, BsSunset } from "react-icons/bs";
import { LoaderData } from "~/.server/interfaces";

export interface LocationData {
  type: "geolocation" | "input";
  data: GeolocationPosition | string;
}

export default function LocationComponent() {
  const [geolocationError, setGeolocationError] = useState<boolean>(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [gotGeolocation, setGotGeolocation] = useState<boolean>(false);
  const [gettingGeolocation, setGettingGeolocation] = useState<boolean>(false);
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [input, setInput] = useState<string>(allData?.city ? allData.city : "");
  const fetcher = useFetcher();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [eventType, setEventType] = useState<"sunrise" | "sunset">(
    allData?.eventType || "sunrise"
  );

  useEffect(() => {
    if (locationData) {
      fetcher.submit(
        {
          locationData: JSON.stringify(locationData),
          element: "locationComponent",
          date: selectedDate,
          eventType: eventType,
        },
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
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
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
    <div
      className="p-4 sm:p-6 md:p-8"
      role="region"
      aria-label="Location Search"
    >
      <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <Form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="element" value="locationComponent" />

          {/* Location Input Group */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <label
                htmlFor="location-input"
                className="text-slate-300 text-sm mb-1 block"
              >
                Location
              </label>
              <div className="flex gap-2">
                <input
                  id="location-input"
                  type="text"
                  required
                  className="flex-1 px-4 py-2.5 
                           bg-white/10 border border-white/20 
                           rounded-lg text-slate-100 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-blue-400/50 
                           focus:bg-white/20 transition-all duration-200"
                  placeholder="Enter location manually"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    geolocationError
                      ? alert("Unable to use GPS. Did you deny the permission?")
                      : gettingGeolocation
                      ? null
                      : gotGeolocation
                      ? null
                      : handleGeolocation();
                  }}
                  className={`py-2.5 px-3 rounded-lg transition-all duration-200
                           flex items-center justify-center gap-2
                           border
                           ${
                             geolocationError
                               ? "bg-red-500/20 border-red-500/30 cursor-not-allowed"
                               : gotGeolocation
                               ? "bg-green-500/20 border-green-500/30"
                               : "bg-white/20 border-white/10 hover:bg-white/30 active:bg-white/10"
                           }`}
                  disabled={
                    geolocationError || gettingGeolocation || gotGeolocation
                  }
                  aria-label={
                    geolocationError
                      ? "GPS location unavailable"
                      : gotGeolocation
                      ? "GPS location acquired"
                      : "Use GPS location"
                  }
                >
                  <CiLocationArrow1
                    className={`h-5 w-5 transition-all duration-200 ${
                      geolocationError
                        ? "text-red-400"
                        : gotGeolocation
                        ? "text-green-400"
                        : "text-slate-100"
                    }`}
                  />
                  {gettingGeolocation && !gotGeolocation && (
                    <div
                      className="h-4 w-4 rounded-full border-2 border-slate-100 border-t-transparent animate-spin"
                      role="status"
                      aria-label="Loading location data"
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Date and Event Type Group */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 sm:flex-initial">
              <label
                htmlFor="date-input"
                className="text-slate-300 text-sm mb-1 block"
              >
                Date
              </label>
              <input
                type="date"
                id="date-input"
                name="date"
                min="2022-01-01"
                max={new Date().toISOString().split("T")[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-44 px-4 py-2.5 
                         bg-white/10 border border-white/20 
                         rounded-lg text-slate-100
                         focus:outline-none focus:ring-2 focus:ring-blue-400/50 
                         focus:bg-white/20 transition-all duration-200"
              />
            </div>

            <div className="flex-1 sm:flex-initial">
              <label
                htmlFor="event-type"
                className="text-slate-300 text-sm mb-1 block"
              >
                Event Type
              </label>
              <select
                id="event-type"
                name="eventType"
                value={eventType}
                onChange={(e) =>
                  setEventType(e.target.value as "sunrise" | "sunset")
                }
                className="w-full sm:w-44 px-4 py-2.5
                         bg-white/10 border border-white/20 
                         rounded-lg text-slate-100
                         focus:outline-none focus:ring-2 focus:ring-blue-400/50 
                         focus:bg-white/20 transition-all duration-200"
              >
                <option value="sunrise">Sunrise</option>
                <option value="sunset">Sunset</option>
              </select>
            </div>

            <div className="flex-1 sm:flex-initial flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2.5
                         bg-blue-500/20 border border-blue-500/30
                         rounded-lg hover:bg-blue-500/30 
                         active:bg-blue-500/10
                         transition-all duration-200
                         text-slate-100 flex items-center justify-center gap-2"
              >
                <FaSearchLocation className="w-5 h-5" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
