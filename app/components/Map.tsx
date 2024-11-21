import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker, ZoomControl } from "pigeon-maps";
import { AveragedValues, DbUpload, LoaderData } from "~/.server/interfaces";
import React, { useEffect, useState } from "react";
import StatItem from "~/components/StatItem";
import { useDeepCompareMemo } from "use-deep-compare";

export interface Bounds {
  ne: [number, number];
  sw: [number, number];
}

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");

  const [submissions, setSubmissions] = useState<DbUpload[]>(
    allData?.uploads ? allData.uploads : []
  );
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

  useEffect(() => {
    if (allData?.uploads) {
      const newSubmissions = allData.uploads.reduce((acc, upload) => {
        acc[upload.id] = upload;
        return acc;
      }, {} as DbUpload[]);
      setSubmissions(newSubmissions);
    }
  }, [allData?.uploads]);

  useEffect(() => {
    setIsMounted(true);
    setCurrentCenter(
      allData?.lat && allData?.lon
        ? [allData.lat, allData.lon]
        : [40.7128, -74.006]
    );
  }, [allData]);

  const visibleItems = useDeepCompareMemo(() => {
    return Object.values(submissions).filter((sub) =>
      isWithinBounds(sub.lat, sub.lon, currentBounds)
    );
  }, [submissions, currentBounds]);

  function isWithinBounds(
    lat: number,
    lon: number,
    bounds: Bounds | null
  ): boolean {
    if (!bounds) return true;

    const tolerance = 0.01;
    return (
      lat <= bounds.ne[0] + tolerance &&
      lat >= bounds.sw[0] - tolerance &&
      lon >= bounds.sw[1] - tolerance &&
      lon <= bounds.ne[1] + tolerance
    );
  }

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

    // Smoothstep function for better easing
    const smoothstep = (x: number): number => {
      // Improved smooth interpolation
      return x * x * x * (x * (x * 6 - 15) + 10);
    };

    // Custom ease-in-out that peaks during overlap
    const customEaseInOut = (t: number): number => {
      // Smoother acceleration and deceleration
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      // Calculate separate progress for position and zoom
      const positionProgress = Math.min(elapsed / stageDuration, 1);
      const zoomProgress = Math.min((elapsed - stageDelay) / stageDuration, 1);

      // Only animate position if we haven't reached the end
      if (positionProgress < 1) {
        // Smoother position easing
        const positionEased = smoothstep(positionProgress);
        const newLat = startLat + (targetLat - startLat) * positionEased;
        const newLon = startLon + (targetLon - startLon) * positionEased;
        setCurrentCenter([newLat, newLon]);
      }

      // Only animate zoom if we're past the delay and haven't reached the end
      if (elapsed >= stageDelay && zoomProgress < 1) {
        // Smoother zoom easing
        const zoomEased = customEaseInOut(zoomProgress);
        const newZoom = startZoom + (targetZoom - startZoom) * zoomEased;
        setCurrentZoom(newZoom);
      }

      // Continue animation if either stage isn't complete
      if (elapsed < totalDuration) {
        requestAnimationFrame(animateFrame);
      }
    };

    requestAnimationFrame(animateFrame);
  }

  return (
    <>
      <div
        className={`${allData?.ok ? "hidden" : "visible min-h-[10vh]"}`}
      ></div>

      <div className="relative w-screen overflow-x-hidden min-h-[20vh] mt-24 text-center font-bold mx-4">
        User submissions
        <div className="flex gap-4 py-8 transition-transform duration-150 ease-in-out w-full overflow-x-scroll min-h-[234px]">
          {[...visibleItems]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .map((sub) => (
              <div
                key={sub.image_id}
                className={`flex-shrink-0 w-[250px] h-[170px] overflow-hidden rounded-md ${getBorderColor(
                  sub.rating
                )} border`}
                onClick={() => {
                  setSelectedSubmission(sub);
                  animateZoom(sub.lat, sub.lon, 15);
                }}
              >
                <img
                  src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${sub.image_id}/public`}
                  alt="Featured submission"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
        </div>
      </div>
      <div className="max-w-screen min-h-screen p-4 flex md:flex-row flex-col gap-4">
        <div
          className={`transition-all duration-400 ease-in-out w-full md:w-3/4 transform ${
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
              {visibleItems.map((sub: any) => (
                <Marker
                  color={getHsl(sub.rating)}
                  anchor={[sub.lat, sub.lon]}
                  key={sub.time}
                  onClick={() => {
                    setSelectedSubmission(sub);
                    animateZoom(sub.lat, sub.lon, 16);
                  }}
                />
              ))}

              <ZoomControl
                style={{
                  right: 10,
                  top: 10,
                }}
                buttonStyle={{
                  width: "50px",
                  height: "50px",
                  fontSize: "24px",
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
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                <img
                  src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${selectedSubmission.image_id}/public`}
                  alt={selectedSubmission.city}
                  className="object-cover w-full max-h-full"
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
                  X
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
    </>
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
