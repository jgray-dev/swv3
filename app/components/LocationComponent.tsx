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
  const [lastGPSInput, setLastGPSInput] = useState<string>("");
  const fetcher = useFetcher();
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(
    allData?.eventDate ?? new Date().toISOString().split("T")[0]
  );
  const [eventType, setEventType] = useState<"sunrise" | "sunset">(
    allData?.eventType ?? "sunrise"
  );

  const resetGPSStates = () => {
    setGeolocationError(false);
    setGotGeolocation(false);
    setGettingGeolocation(false);
    setCoordinates(null);
    setLastGPSInput("");
  };

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

    // If we have coordinates AND the input hasn't changed since getting GPS
    if (coordinates && input === lastGPSInput) {
      setLocationData({
        type: "geolocation",
        data: {
          coords: {
            latitude: coordinates.lat,
            longitude: coordinates.lng,
          },
        } as GeolocationPosition,
      });
    } else {
      // If input has changed or we don't have coordinates, use manual input
      setLocationData({
        type: "input",
        data: input,
      });
      // Reset GPS states if we're using manual input
      resetGPSStates();
    }
  };

  function handleGeolocation() {
    if (!geolocationError) {
      setGettingGeolocation(true);

      if ("geolocation" in navigator) {
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        };

        try {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (position && position.coords) {
                console.log("Geolocation success:", {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  timestamp: new Date(position.timestamp).toISOString(),
                });

                setGotGeolocation(true);
                setCoordinates({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
                setLastGPSInput(input); // Store the input value when GPS was acquired
                setGettingGeolocation(false);
              } else {
                console.error("Invalid position data:", {
                  position: position,
                  browserInfo: navigator.userAgent,
                  timestamp: new Date().toISOString(),
                });
                throw new Error("Invalid position data received");
              }
            },
            (err) => {
              // Detailed error logging
              const errorDetails = {
                code: err.code,
                message: err.message,
                browserInfo: navigator.userAgent,
                timestamp: new Date().toISOString(),
              };

              switch (err.code) {
                case err.PERMISSION_DENIED:
                  console.error("Location Permission Denied:", {
                    ...errorDetails,
                    type: "PERMISSION_DENIED",
                    hint: "User denied the request for geolocation",
                  });
                  break;
                case err.POSITION_UNAVAILABLE:
                  console.error("Position Unavailable:", {
                    ...errorDetails,
                    type: "POSITION_UNAVAILABLE",
                    hint: "Location information is unavailable. Device GPS might be disabled or hardware error",
                  });
                  break;
                case err.TIMEOUT:
                  console.error("Geolocation Timeout:", {
                    ...errorDetails,
                    type: "TIMEOUT",
                    hint: "The request to get user location timed out. Check internet connection or try again",
                  });
                  break;
                default:
                  console.error("Unknown Geolocation Error:", {
                    ...errorDetails,
                    type: "UNKNOWN",
                  });
              }

              // Only set error if it's a permanent failure
              if (err.code === err.PERMISSION_DENIED) {
                setGeolocationError(true);
              }

              setGettingGeolocation(false);
            },
            options
          );
        } catch (error) {
          console.error("Geolocation System Error:", {
            error: error,
            name: error.name,
            message: error.message,
            stack: error.stack,
            browserInfo: navigator.userAgent,
            timestamp: new Date().toISOString(),
            geolocationSupport: "geolocation" in navigator,
            secureContext: window.isSecureContext,
          });

          setGettingGeolocation(false);
          if (error.name === "PermissionDeniedError") {
            setGeolocationError(true);
          }
        }
      } else {
        console.error("Geolocation Not Supported:", {
          browserInfo: navigator.userAgent,
          timestamp: new Date().toISOString(),
          window: {
            isSecureContext: window.isSecureContext,
            protocol: window.location.protocol,
          },
        });
        setGettingGeolocation(false);
        setGeolocationError(true);
      }
    } else {
      console.log("Geolocation already in error state, skipping request");
    }
  }

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
                  required
                  className={`w-full px-4 py-2.5
                      bg-white/10 border border-white/20
                      rounded-lg text-slate-100 placeholder-slate-400
                      focus:outline-none focus:ring-2 focus:ring-blue-400/50
                      focus:bg-white/20 transition-all duration-200
                      ${coordinates ? "border-green-500/30" : ""}`}
                  placeholder="Enter location manually"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleManualSubmit(e);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (geolocationError) {
                    alert("Unable to use GPS. Did you deny the permission?");
                  } else if (!gettingGeolocation) {
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
                disabled={geolocationError || gettingGeolocation}
                aria-label={
                  geolocationError
                    ? "GPS location unavailable"
                    : gotGeolocation
                    ? "GPS location acquired"
                    : "Use GPS location"
                }
              >
                {gettingGeolocation ? (
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
                  new Date(Date.now() + 86400000).toISOString().split("T")[0]
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
              <Menu as="div" className="relative inline-block w-full text-left">
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
                      {({ active }) => (
                        <button
                          onClick={() => setEventType("sunrise")}
                          className={`${
                            active ? "bg-white/20" : ""
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
                      {({ active }) => (
                        <button
                          onClick={() => setEventType("sunset")}
                          className={`${
                            active ? "bg-white/20" : ""
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
