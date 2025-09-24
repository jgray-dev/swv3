import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Form, useFetcher, useRouteLoaderData } from "@remix-run/react";
import React, { useEffect, useMemo, useState } from "react";
import { CiLocationArrow1 } from "react-icons/ci";
import { FaMapMarkerAlt, FaSearchLocation } from "react-icons/fa";
import { GiSunrise, GiSunset } from "react-icons/gi";
import { HiChevronDown } from "react-icons/hi";
import { LoaderData, LocationData } from "~/.server/interfaces";

export default function LocationComponent() {
  const fetcher = useFetcher();
  const allData = useRouteLoaderData<LoaderData>("routes/_index");

  const [input, setInput] = useState(allData?.city ?? "");
  const [useNextEvent, setUseNextEvent] = useState(allData?.useNext ?? true);
  const [selectedDate, setSelectedDate] = useState(
    allData?.eventDate ?? new Date().toISOString().split("T")[0],
  );
  const [eventType, setEventType] = useState<"sunrise" | "sunset">(
    allData?.eventType ?? "sunrise",
  );

  const [geolocationError, setGeolocationError] = useState(false);
  const [gettingGeolocation, setGettingGeolocation] = useState(false);
  const [gotGeolocation, setGotGeolocation] = useState(false);
  const [useGpsLocation, setUseGpsLocation] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<GeolocationPosition | null>(
    null,
  );
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const maxSelectableDate = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 6);
    return limit.toISOString().split("T")[0];
  }, []);

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
        { method: "post" },
      );
      if (locationData.type === "input") {
        resetGPSStates();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationData]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (useGpsLocation && gpsPosition) {
      setLocationData({
        type: "geolocation",
        data: gpsPosition,
      });
    } else if (input.trim()) {
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
    if (geolocationError) return;
    setGettingGeolocation(true);

    if ("geolocation" in navigator) {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      };

      try {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            if (position && position.coords) {
              setGotGeolocation(true);
              setGpsPosition(position);
              setInput("");
              setUseGpsLocation(true);
              setGettingGeolocation(false);
            } else {
              setGettingGeolocation(false);
            }
          },
          (err: GeolocationPositionError) => {
            const errorDetails: GeolocationErrorDetails = {
              code: err.code,
              message: err.message,
              timestamp: new Date().toISOString(),
            };

            switch (err.code) {
              case err.PERMISSION_DENIED: {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const errorMsg = isIOS
                  ? "Location permission denied on device."
                  : "Location permission denied.";
                console.error(errorMsg, errorDetails);
                setGeolocationError(true);
                break;
              }
              case err.POSITION_UNAVAILABLE:
                console.error("Unable to determine location.", errorDetails);
                break;
              case err.TIMEOUT:
                console.error("Location request timed out.", errorDetails);
                break;
              default:
                console.error("Unexpected geolocation error.", errorDetails);
            }

            setGettingGeolocation(false);
          },
          options,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      setUseGpsLocation(false);
    }
  };

  useEffect(() => {
    if (allData?.eventDate) {
      setSelectedDate(allData.eventDate);
    }
    if (allData?.eventType) {
      setEventType(allData.eventType);
    }
  }, [allData?.eventDate, allData?.eventType]);

  useEffect(() => {
    if (typeof allData?.useNext === "boolean") {
      setUseNextEvent(allData.useNext);
    }
  }, [allData?.useNext]);

  useEffect(() => {
    if (allData?.city) {
      setInput(allData.city);
    }
  }, [allData?.city]);

  useEffect(() => {
    if (selectedDate > maxSelectableDate) {
      setSelectedDate(maxSelectableDate);
    }
  }, [selectedDate, maxSelectableDate]);

  return (
    <section
      className="px-4 py-8 sm:px-6 sm:py-10"
      role="region"
      aria-label="Location controls"
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_42px_rgba(12,12,35,0.35)] backdrop-blur-xl transition-colors duration-300 sm:p-8">
          <Form onSubmit={handleManualSubmit} className="space-y-6">
            <input type="hidden" name="element" value="locationComponent" />

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-medium text-white/90">
                    <FaSearchLocation className="h-4 w-4 text-white/60" />
                    Location
                  </h3>
                  <p className="text-xs text-white/50 mt-1">Search for a city or use your device location</p>
                </div>
                {allData?.city ? (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
                    <FaMapMarkerAlt className="h-3 w-3 text-white/50" />
                    <span className="font-medium">{allData.city}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    id="location-input"
                    type="text"
                    className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 text-base text-white placeholder:text-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300/30 focus:bg-white/[0.08] hover:border-white/25"
                    placeholder={
                      useGpsLocation
                        ? "Using device coordinates"
                        : "e.g., San Francisco, CA"
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
                    aria-label="Search location"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGeolocation}
                  className={`flex h-11 min-w-11 items-center justify-center rounded-lg border text-base transition-all duration-200 ${
                    geolocationError
                      ? "cursor-not-allowed border-red-500/30 bg-red-500/10 text-red-300/70"
                      : gotGeolocation
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                        : "border-white/15 bg-white/[0.06] text-white/80 hover:border-white/30 hover:bg-white/[0.1] hover:text-white"
                  }`}
                  disabled={
                    geolocationError || gettingGeolocation || gotGeolocation
                  }
                  aria-label="Use device location"
                  title={
                    geolocationError 
                      ? "Location access blocked"
                      : gotGeolocation
                        ? "Location acquired"
                        : "Use my location"
                  }
                >
                  {gettingGeolocation && !gotGeolocation ? (
                    <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  ) : (
                    <CiLocationArrow1 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-medium text-white/90">
                    {eventType === "sunrise" ? (
                      <GiSunrise className="h-4 w-4 text-white/60" />
                    ) : (
                      <GiSunset className="h-4 w-4 text-white/60" />
                    )}
                    Event Timing
                  </h3>
                  <p className="text-xs text-white/50 mt-1">Choose a specific date and event, or let the app auto-select the next optimal viewing opportunity</p>
                </div>
                <label className="flex items-center gap-3 text-sm text-white/70 cursor-pointer">
                  <span>Auto mode</span>
                  <span className="relative inline-flex h-6 w-11 items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={useNextEvent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseNextEvent(checked);
                        if (checked) {
                          if (allData?.eventDate) {
                            setSelectedDate(allData.eventDate);
                          }
                          if (allData?.eventType) {
                            setEventType(allData.eventType);
                          }
                        }
                      }}
                    />
                    <span className="absolute inset-0 rounded-full border border-white/15 bg-white/[0.06] transition peer-checked:border-emerald-400/40 peer-checked:bg-emerald-500/20" />
                    <span className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-[20px] shadow-sm" />
                  </span>
                </label>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="submissionDate"
                      className="text-xs font-medium uppercase tracking-[0.25em] text-white/45"
                    >
                      Date
                    </label>
                    <div className="relative">
                      <input
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        type="date"
                        id="submissionDate"
                        min="2022-01-01"
                        max={maxSelectableDate}
                        name="submissionDate"
                        className={`h-12 w-full rounded-lg border px-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-300/60 transition-all duration-200 ${
                          useNextEvent
                            ? "border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed"
                            : "border-white/15 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.08]"
                        }`}
                        disabled={useNextEvent}
                      />
                      {useNextEvent ? (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] uppercase tracking-[0.25em] text-white/35">
                          Auto
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.25em] text-white/45">
                      Event
                    </span>
                    <div className="relative">
                      <Menu as="div" className="relative w-full text-left">
                        <MenuButton
                          disabled={useNextEvent}
                          className={`inline-flex h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300/60 ${
                            useNextEvent
                              ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/40"
                              : "border-white/15 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.08]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {eventType === "sunrise" ? (
                              <GiSunrise className="h-4 w-4" />
                            ) : (
                              <GiSunset className="h-4 w-4" />
                            )}
                            {eventType === "sunrise" ? "Sunrise" : "Sunset"}
                          </span>
                          <HiChevronDown
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                        </MenuButton>
                        <MenuItems className="absolute left-0 z-20 mt-2 w-full origin-top-right rounded-lg border border-white/10 bg-black/75 p-1 backdrop-blur">
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => setEventType("sunrise")}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition ${
                                  focus ? "bg-white/10" : ""
                                }`}
                              >
                                <GiSunrise className="h-4 w-4" />
                                Sunrise
                              </button>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => setEventType("sunset")}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition ${
                                  focus ? "bg-white/10" : ""
                                }`}
                              >
                                <GiSunset className="h-4 w-4" />
                                Sunset
                              </button>
                            )}
                          </MenuItem>
                        </MenuItems>
                      </Menu>
                      {useNextEvent ? (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] uppercase tracking-[0.25em] text-white/35">
                          Auto
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="min-h-[1.25rem] text-xs text-red-300/85">
                  {geolocationError
                    ? "Location access is blocked. Allow permission or search manually."
                    : null}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/20 px-6 text-sm font-medium text-white transition hover:border-sky-200/60 hover:bg-sky-500/30 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                >
                  <FaSearchLocation className="h-4 w-4" />
                  Update
                </button>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </section>
  );
}
