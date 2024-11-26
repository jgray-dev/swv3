import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker, ZoomControl } from "pigeon-maps";
import React, { useEffect, useState } from "react";
import { AveragedValues, DbUpload, LoaderData } from "~/.server/interfaces";
import StatItem from "~/components/StatItem";
import { useScrollLock } from "~/hooks/useScrollLock";

export interface Bounds {
  ne: [number, number];
  sw: [number, number];
}

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");

  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [currentBounds, setCurrentBounds] = useState<Bounds | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<DbUpload | null>(
    null
  );

  const [isMounted, setIsMounted] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(
    allData?.lat && allData?.lon
      ? [allData.lat, allData.lon]
      : [40.7128, -74.006]
  );
  const [imgModal, setImgModal] = useState<string | null>(null);
  useScrollLock(!!imgModal);

  useEffect(() => {
    setIsMounted(true);
    setCurrentCenter(
      allData?.lat && allData?.lon
        ? [allData.lat, allData.lon]
        : [40.7128, -74.006]
    );
  }, [allData]);

  if (!allData?.uploads) return null;

  function animateZoom(
    targetLat: number,
    targetLon: number,
    targetZoom: number = 16
  ) {
    const startZoom = currentZoom;
    const [startLat, startLon] = currentCenter;
    const totalDuration = 600;
    const stageDuration = 450;
    const stageDelay = 225;
    const startTime = performance.now();
    const smoothstep = (x: number): number => {
      return x * x * x * (x * (x * 6 - 15) + 10);
    };
    const customEaseInOut = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const positionProgress = Math.min(elapsed / stageDuration, 1);
      const zoomProgress = Math.min((elapsed - stageDelay) / stageDuration, 1);
      if (positionProgress < 1) {
        const positionEased = smoothstep(positionProgress);
        const newLat = startLat + (targetLat - startLat) * positionEased;
        const newLon = startLon + (targetLon - startLon) * positionEased;
        setCurrentCenter([newLat, newLon]);
      }
      if (elapsed >= stageDelay && zoomProgress < 1) {
        const zoomEased = customEaseInOut(zoomProgress);
        const newZoom = startZoom + (targetZoom - startZoom) * zoomEased;
        setCurrentZoom(newZoom);
      }
      if (elapsed < totalDuration) {
        requestAnimationFrame(animateFrame);
      }
    };
    requestAnimationFrame(animateFrame);
  }

  return (
    <div className={"w-screen"}>
      <div
        className={`${allData?.ok ? "hidden" : "visible min-h-[10vh]"}`}
      ></div>
      <div className="w-full min-h-[20vh] mt-24 text-center font-bold">
        <span className={"select-none"}>
          {" "}
          User submissions near {allData.city ?? "New York City"}
        </span>
        {/* start */}
        <div className="flex gap-4 py-8 transition-transform duration-150 ease-in-out w-full px-4 overflow-x-scroll min-h-[234px] scrollbar scrollbar-thumb-white/10">
          {[...allData.uploads]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .map((sub) => (
              <div
                key={sub.image_id}
                className={`flex-shrink-0 w-[250px] h-[170px] overflow-hidden rounded-md cursor-pointer ${getBorderColor(
                  sub.rating
                )} border`}
                onClick={() => {
                  setSelectedSubmission(sub);
                  animateZoom(sub.lat, sub.lon, Math.min(16, currentZoom + 4));
                }}
              >
                <img
                  src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${sub.image_id}/mid`}
                  alt="Featured submission"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
        </div>
        {/* end */}
      </div>
      <div className="max-w-screen min-h-screen p-4 flex md:flex-row flex-col gap-4">
        <div
          className={`transition-all duration-400 ease-in-out w-full md:w-3/4 transform select-none ${
            selectedSubmission ? "md:!w-1/2" : ""
          } h-[500px] md:h-[800px] rounded-lg overflow-hidden shadow-lg mx-auto`}
          role="region"
          aria-label="Interactive location map"
        >
          {isMounted && (
            <Map
              center={currentCenter}
              zoom={currentZoom}
              attribution={false}
              animate={true}
              minZoom={2}
              maxZoom={16}
              onBoundsChanged={({ zoom, bounds, center }) => {
                if (zoom !== currentZoom) {
                  setCurrentZoom(zoom);
                }
                setCurrentCenter(center);
                if (center !== currentCenter || zoom !== currentZoom) {
                }
                if (bounds !== currentBounds) {
                  setCurrentBounds(bounds);
                }
              }}
            >
              {allData.uploads.map((sub: any) => (
                <Marker
                  color={getHsl(sub.rating)}
                  anchor={[sub.lat, sub.lon]}
                  key={sub.time}
                  onClick={() => {
                    setSelectedSubmission(sub);
                    animateZoom(
                      sub.lat,
                      sub.lon,
                      Math.min(16, currentZoom + 4)
                    );
                  }}
                />
              ))}

              <ZoomControl
                style={{
                  right: 90,
                  top: 10,
                }}
                buttonStyle={{
                  width: "40px",
                  height: "40px",
                  fontSize: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "5px",
                  cursor: "pointer",
                  backgroundColor: "white",
                  border: "2px solid rgba(0,0,0,0.2)",
                  borderRadius: "4px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }}
              />
            </Map>
          )}
        </div>

        {selectedSubmission ? (
          <div
            className={` flex flex-col gap-4 md:max-h-[800px] transition duration-300 ${
              selectedSubmission ? "md:w-1/2 w-full" : "w-0"
            }`}
          >
            <div className="md:max-h-[400px] w-full">
              <div className="relative w-full h-full rounded-lg overflow-hidden group">
                <img
                  src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${selectedSubmission.image_id}/public`}
                  alt={selectedSubmission.city}
                  className="object-cover w-full max-h-full group-hover:scale-105 duration-150 select-none"
                  onClick={() =>
                    setImgModal(
                      `https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${selectedSubmission.image_id}/public`
                    )
                  }
                />
                <div className="absolute bottom-0 left-0 right-0 max-h-fit bg-black/50 backdrop-blur-sm px-4 py-3 w-full flex justify-between">
                  <h2 className="text-slate-100 text-md font-bold">
                    {selectedSubmission.city}
                  </h2>
                  <h2 className="text-slate-100 text-sm pt-0.5">
                    {getDateString(selectedSubmission.time)}
                  </h2>
                </div>
                <button
                  className={
                    "absolute top-2 left-2 h-8 w-8 bg-red-600 rounded-full hover:bg-red-700 duration-200 text-center"
                  }
                  onMouseDown={() => setSelectedSubmission(null)}
                >
                  x
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white/10 border border-white/20 rounded-lg p-6 overflow-y-auto">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-100">Rating</span>
                  <span className="text-slate-100 font-semibold">
                    {selectedSubmission.rating}/100
                  </span>
                </div>
                <div className="space-y-0.5">
                  <StatItem
                    label="High Clouds"
                    value={
                      (JSON.parse(selectedSubmission.data) as AveragedValues)
                        .high_clouds
                    }
                  />
                  <StatItem
                    label="Mid Clouds"
                    value={
                      (JSON.parse(selectedSubmission.data) as AveragedValues)
                        .mid_clouds
                    }
                  />
                  <StatItem
                    label="Low Clouds"
                    value={
                      (JSON.parse(selectedSubmission.data) as AveragedValues)
                        .low_clouds
                    }
                  />
                  <StatItem
                    label="Visibility"
                    value={
                      (JSON.parse(selectedSubmission.data) as AveragedValues)
                        .visibility
                    }
                    isVisibility={true}
                  />
                  <StatItem
                    label="Temperature"
                    value={
                      (JSON.parse(selectedSubmission.data) as AveragedValues)
                        .temperature
                    }
                    maxValue={122}
                    unit="°F"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={"w-0 duration-300"}></div>
        )}
      </div>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-400 backdrop-blur-sm ${
          imgModal ? "visible bg-black/80" : "invisible"
        }`}
        onClick={() => setImgModal(null)}
      >
        <div
          className={`relative max-w-[90vw] max-h-[90vh] transition-all duration-400 ${
            imgModal ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`absolute -top-4 -right-4 h-8 w-8 bg-red-600 hover:bg-red-700 rounded-full text-white font-bold transition-colors duration-200 ${
              imgModal ? "visible" : "hidden"
            }`}
            onClick={() => setImgModal(null)}
          >
            ×
          </button>
          {imgModal && (
            <img
              src={imgModal}
              alt="Modal content"
              className="rounded-lg shadow-2xl max-w-full max-h-[90vh] object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function getDateString(eventTime: number): string {
  const now = Date.now();
  const eventTimeMs = eventTime * 1000;
  const differenceInSeconds = Math.floor((now - eventTimeMs) / 1000);
  if (differenceInSeconds <= 0) {
    return "just now";
  }
  const timeUnits = [
    { seconds: 31536000, unit: "year" },
    { seconds: 2592000, unit: "month" },
    { seconds: 604800, unit: "week" },
    { seconds: 86400, unit: "day" },
    { seconds: 3600, unit: "hour" },
    { seconds: 60, unit: "minute" },
    { seconds: 1, unit: "second" },
  ];
  for (const { seconds, unit } of timeUnits) {
    const value = Math.floor(differenceInSeconds / seconds);
    if (value >= 1) {
      const plural = value === 1 ? "" : "s";
      return `${value} ${unit}${plural} ago`;
    }
  }
  return "just now";
}

function getHsl(rating: number): string {
  if (rating <= 10) return "hsl(0, 74%, 42%)";
  if (rating <= 20) return "hsl(0, 72%, 51%)";
  if (rating <= 30) return "hsl(0, 84%, 60%)";
  if (rating <= 45) return "hsl(24, 95%, 53%)";
  if (rating <= 60) return "hsl(27, 96%, 61%)";
  if (rating <= 70) return "hsl(48, 96%, 53%)";
  if (rating <= 80) return "hsl(84, 81%, 44%)";
  if (rating <= 85) return "hsl(142, 76%, 36%)";
  if (rating <= 95) return "hsl(142, 72%, 29%)";
  return "hsl(153, 73%, 25%)";
}

function getBorderColor(rating: number): string {
  if (rating <= 10) return "border-red-700";
  if (rating <= 20) return "border-red-600";
  if (rating <= 30) return "border-red-500";
  if (rating <= 45) return "border-orange-500";
  if (rating <= 60) return "border-orange-400";
  if (rating <= 70) return "border-yellow-500";
  if (rating <= 80) return "border-lime-500";
  if (rating <= 85) return "border-green-500";
  if (rating <= 95) return "border-green-600";
  return "border-emerald-700";
}
