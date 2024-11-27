import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Form, useFetcher, useRouteLoaderData } from "@remix-run/react";
import React, { useEffect, useState } from "react";
import { CiLocationArrow1 } from "react-icons/ci";
import { FaSearchLocation } from "react-icons/fa";
import { GiSunrise, GiSunset } from "react-icons/gi";
import { HiChevronDown } from "react-icons/hi";
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
  const [useNextEvent, setUseNextEvent] = useState(allData?.useNext ?? true);

  const [selectedDate, setSelectedDate] = useState<string>(
    allData?.eventDate ?? new Date().toISOString().split("T")[0]
  );
  const [eventType, setEventType] = useState<"sunrise" | "sunset">(
    allData?.eventType ?? "sunrise"
  );

  const [useGpsLocation, setUseGpsLocation] = useState<boolean>(false);
  const [gpsPosition, setGpsPosition] = useState<GeolocationPosition | null>(
    null
  );

  const resetGPSStates = () => {
    setGeolocationError(false);
    setGotGeolocation(false);
    setGettingGeolocation(false);
  };

  useEffect(() => {
    if (locationData) {
      fetcher.submit(
        {
          locationData: JSON.stringify(locationData),
          element: "locationComponent",
          date: useNextEvent ? "next" : selectedDate,
          eventType: useNextEvent ? "next" : eventType,
        },
        { method: "post" }
      );
      if (locationData.type === "input") {
        resetGPSStates();
      }
    }
  }, [locationData]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (useGpsLocation && gpsPosition) {
      // Submit with GPS coordinates
      setLocationData({
        type: "geolocation",
        data: gpsPosition,
      });
    } else if (input.trim()) {
      // Submit with manual input
      setLocationData({
        type: "input",
        data: input,
      });
    }
  };

  interface GeolocationErrorDetails {
    code: number;
    message: string;
    timestamp: string;
  }

  function handleGeolocation(): void {
    if (!geolocationError) {
      setGettingGeolocation(true);

      if ("geolocation" in navigator) {
        const options: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        };

        try {
          navigator.geolocation.getCurrentPosition(
            (position: GeolocationPosition) => {
              if (position && position.coords) {
                setGotGeolocation(true);
                setGpsPosition(position);
                setUseGpsLocation(true);
                setGettingGeolocation(false);
              } else {
                console.error("Invalid position data received");
              }
            },
            (err: GeolocationPositionError) => {
              const errorDetails: GeolocationErrorDetails = {
                code: err.code,
                message: err.message,
                timestamp: new Date().toISOString(),
              };

              if (err.code === err.PERMISSION_DENIED) {
                const errorMsg = "Location permission denied";
                console.error(errorMsg, errorDetails);
                setGeolocationError(true);
              } else if (err.code === err.POSITION_UNAVAILABLE) {
                const errorMsg = "Position unavailable";
                console.error(errorMsg, errorDetails);
              }

              setGettingGeolocation(false);
            },
            options
          );
        } catch (error) {
          const typedError = error as Error;
          console.error(`Geolocation error: ${typedError.message}`);

          setGettingGeolocation(false);
          if (typedError.name === "PermissionDeniedError") {
            setGeolocationError(true);
          }
        }
      } else {
        console.error("Geolocation not supported in this browser");
        setGettingGeolocation(false);
        setGeolocationError(true);
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // If user starts typing, disable GPS location
    if (e.target.value.trim()) {
      setUseGpsLocation(false);
    }
  };

  return (
    <div
      className="p-4 sm:p-6 md:p-8"
      role="region"
      aria-label="Location Search"
    >
      <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 transition-transform duration-200">
        <Form onSubmit={handleManualSubmit} className="flex flex-col gap-6">
          <input type="hidden" name="element" value="locationComponent" />

          {/* Location Input Group */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="location-input"
              className="text-slate-300 text-sm font-medium"
            >
              Location
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="location-input"
                  type="text"
                  className="w-full px-4 py-2.5
                        bg-white/10 border border-white/20
                        rounded-lg text-slate-100 placeholder-slate-400
                        focus:outline-none focus:ring-2 focus:ring-blue-400/50
                        focus:bg-white/20 transition-all duration-200"
                  placeholder={
                    useGpsLocation
                      ? "Using GPS location"
                      : "Enter location manually"
                  }
                  value={input}
                  onChange={handleInputChange}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleManualSubmit(e);
                    }
                  }}
                  // Remove required attribute since we can now submit with GPS
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (geolocationError) {
                    alert("Unable to use GPS. Did you deny the permission?");
                  } else if (!gettingGeolocation && !gotGeolocation) {
                    handleGeolocation();
                  }
                }}
                className={`min-w-12 h-11 rounded-lg transition-all duration-200
             flex items-center justify-center
             border ${
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
                {gettingGeolocation && !gotGeolocation ? (
                  <div
                    className="h-5 w-5 rounded-full border-2 border-slate-100 border-t-transparent animate-spin"
                    role="status"
                    aria-label="Loading location data"
                  />
                ) : (
                  <CiLocationArrow1
                    className={`h-5 w-5 transition-all duration-200 ${
                      geolocationError
                        ? "text-red-400"
                        : gotGeolocation
                        ? "text-green-400"
                        : "text-slate-100"
                    }`}
                  />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-start">
              <label className="inline-flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={useNextEvent}
                    onChange={(e) => setUseNextEvent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 border border-white/20 peer-checked:bg-green-500/20 peer-checked:border-green-500/30 rounded-full duration-200 ease-in-out transition-all"></div>
                  <div
                    className="absolute left-[2px] top-[2px] bg-slate-100 w-5 h-5 rounded-full
                    duration-200 ease-in-out
                    peer-checked:translate-x-[20px]"
                  ></div>
                </div>
                <span className="ml-3 text-sm font-medium text-slate-100">
                  Use the next event
                </span>
              </label>
            </div>

            {!useNextEvent && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="imageDate"
                    className="block text-sm text-slate-100 mb-1"
                  >
                    Select date
                  </label>
                  <input
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    type="date"
                    id="submissionDate"
                    min="2022-01-01"
                    max={
                      new Date(Date.now() + 86400000)
                        .toISOString()
                        .split("T")[0]
                    }
                    name="submissionDate"
                    required
                    className="w-full p-2 rounded-md
                bg-white/10 border border-white/20
                focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20
                transition-all duration-200
                text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="imageType"
                    className="block text-sm text-slate-100 mb-1"
                  >
                    Select type of event
                  </label>
                  <Menu
                    as="div"
                    className="relative inline-block w-full text-left"
                  >
                    <MenuButton
                      className="inline-flex w-full justify-between items-center gap-x-1.5 rounded-md
    bg-white/10 px-3 py-2 text-sm text-slate-100
    border border-white/20
    hover:bg-white/20
    focus:outline-none focus:ring-2 focus:ring-white/50
    transition-all duration-200"
                    >
                      <span className="flex items-center gap-2">
                        {eventType === "sunrise" ? (
                          <GiSunrise className="size-4" />
                        ) : (
                          <GiSunset className="size-4" />
                        )}
                        {eventType === "sunrise" ? "Sunrise" : "Sunset"}
                      </span>
                      <HiChevronDown className="size-5" aria-hidden="true" />
                    </MenuButton>

                    <MenuItems
                      className="absolute left-0 z-10 mt-2 w-full origin-top-right rounded-md
    bg-black/90 backdrop-blur-md
    shadow-lg ring-1 ring-black/5 focus:outline-none"
                    >
                      <div className="px-1 py-1">
                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={() => setEventType("sunrise")}
                              className={`${
                                focus ? "bg-white/20" : ""
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm text-slate-100`}
                            >
                              <GiSunrise
                                className="mr-2 size-4"
                                aria-hidden="true"
                              />
                              Sunrise
                            </button>
                          )}
                        </MenuItem>
                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={() => setEventType("sunset")}
                              className={`${
                                focus ? "bg-white/20" : ""
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm text-slate-100`}
                            >
                              <GiSunset
                                className="mr-2 size-4"
                                aria-hidden="true"
                              />
                              Sunset
                            </button>
                          )}
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Menu>
                </div>
              </div>
            )}

            <div className="flex-1 sm:flex-initial flex items-end">
              <button
                type="submit"
                className="w-full h-11 px-6
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
