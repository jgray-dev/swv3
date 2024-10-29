import React, { useEffect, useState } from "react";
import { Form, useFetcher } from "@remix-run/react";
import { CiLocationArrow1 } from "react-icons/ci";

export interface LocationData {
  type: "geolocation" | "input";
  data: GeolocationPosition | string;
}

export default function LocationService() {
  const [geolocationError, setGeolocationError] = useState<boolean>(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [gotGeolocation, setGotGeolocation] = useState<boolean>(false);
  const [gettingGeolocation, setGettingGeolocation] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
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
    <div className={"max-w-screen overflow-x-hidden m-16 flex flex-row"}>
      <Form onSubmit={handleManualSubmit}>
        <input
          type={"text"}
          required
          className={"h-8 w-64 bg-white/10 rounded-sm p-1 placeholder-white/65"}
          placeholder={"Enter location manually"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type={"submit"}
          className={
            "h-8 w-16 rounded-sm bg-white/10 hover:bg-white/15 duration-400 ml-2"
          }
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
        className={`h-8 w-8 ml-12 rounded-sm  group ${
          geolocationError
            ? "cursor-not-allowed bg-white/5"
            : gotGeolocation
            ? "bg-white/10"
            : "cursor-pointer bg-white/10 hover:bg-white/15"
        }`}
        title={geolocationError ? "Error using GPS" : "Use GPS Location"}
      >
        <CiLocationArrow1
          className={`-translate-x-[3.5%] translate-y-[1%] h-8 w-8 duration-200 ${
            geolocationError
              ? "fill-red-500"
              : gotGeolocation
              ? "fill-gray-200 group-hover:fill-green-600"
              : "fill-gray-200 group-hover:fill-white"
          } ${
            gettingGeolocation
              ? gotGeolocation
                ? "fill-green-500"
                : "animate-pulse fill-white"
              : ""
          }`}
        />
      </button>
      <br />
    </div>
  );
}
