import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker, Overlay, ZoomControl } from "pigeon-maps";
import { AveragedValues, dbUpload, LoaderData } from "~/.server/interfaces";
import { useEffect, useState, useMemo } from "react";
import StatItem from "~/components/StatItem";

interface Marker extends dbUpload {
  cluster: boolean;
  amount: number;
}

interface Bounds {
  ne: [number, number];
  sw: [number, number];
}

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [currentZoom, setCurrentZoom] = useState<number>(9);
  const [currentBounds, setCurrentBounds] = useState<Bounds | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<dbUpload | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<number[]>(
    allData?.lat && allData?.lon
      ? [allData.lat, allData.lon]
      : [40.7128, -74.006]
  );
  const [visibleMarkersCount, setVisibleMarkersCount] = useState<number>(0);


  const visibleItems = useMemo(() => {
    if (!allData?.uploads) return [];
    return allData.uploads.filter((sub) =>
      isWithinBounds(sub.lat, sub.lon, currentBounds)
    );
  }, [allData?.uploads, currentBounds]);

  useEffect(() => {
    setVisibleMarkersCount(visibleItems.length);
  }, [visibleItems]);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    if (selectedSubmission) {
      console.log(selectedSubmission);
    }
  }, [selectedSubmission]);

  useEffect(() => {
    setCurrentLocation(
      allData?.lat && allData?.lon
        ? [allData.lat, allData.lon]
        : [40.7128, -74.006]
    );
  }, [allData]);

  if (!allData?.ok) return null;

  const getColor = (rating: number): string => {
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
  };

  function isWithinBounds(
    lat: number,
    lon: number,
    bounds: Bounds | null
  ): boolean {
    if (!bounds) return true;
    return (
      lat <= bounds.ne[0] + 1 &&
      lat >= bounds.sw[0] - 1 &&
      lon >= bounds.sw[1] - 1 &&
      lon <= bounds.ne[1] + 1
    );
  }
  return (
    <div className="max-w-screen min-h-screen p-4 flex md:flex-row flex-col gap-4">
      <div
        className={`${
          selectedSubmission ? "md:w-1/2" : "md:w-3/4"
        } w-full h-[600px] md:h-[800px] rounded-lg overflow-hidden shadow-lg mx-auto transition-all duration-200`}
        role="region"
        aria-label="Interactive location map"
      >
        {isMounted && (
          <Map
            // @ts-ignore
            center={currentLocation}
            animate={true}
            defaultCenter={[allData.lat, allData.lon]}
            defaultZoom={9}
            onBoundsChanged={({ zoom, bounds }) => {
              setCurrentZoom(zoom);
              setCurrentBounds(bounds);
            }}
          >
            <ZoomControl />
            {currentZoom > 9 || visibleMarkersCount==1
              ? visibleItems.map((sub) => (
                    <Overlay
                      anchor={[sub.lat, sub.lon]}
                      key={sub.time}
                      offset={[64, 64]}
                    >
                      <button onClick={() => setSelectedSubmission(sub)}>
                        <img
                          src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${sub.image_id}/thumbnail`}
                          alt={sub.city}
                          className="max-w-32 aspect-auto rounded-lg shadow-md transition-transform hover:scale-105"
                        />
                      </button>
                    </Overlay>
                  ))
              : allData.uploads
                  .filter((sub) =>
                    isWithinBounds(sub.lat, sub.lon, currentBounds)
                  )
                  .map((sub) => (
                    <Marker
                      color={getColor(sub.rating)}
                      anchor={[sub.lat, sub.lon]}
                      key={sub.time}
                      hover={false}
                      onClick={() => setSelectedSubmission(sub)}
                    />
                  ))}
          </Map>
        )}
      </div>

      {selectedSubmission && (
        <div className="md:w-1/2 w-full flex flex-col gap-4 animate-fade-in md:max-h-[800px] transition-opacity duration-200">
          <div className="md:max-h-[400px] w-full">
            <div className="relative w-full h-full rounded-lg overflow-hidden">
              <img
                src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${selectedSubmission.image_id}/public`}
                alt={selectedSubmission.city}
                className="object-cover w-full h-full max-h-[400px]"
              />
              <div className="absolute bottom-0 left-0 right-0 max-h-fit bg-black/50 backdrop-blur-sm px-4 py-3 w-full flex justify-between">
                <h2 className="text-slate-100 text-md font-bold">
                  {selectedSubmission.city}
                </h2>
                <h2 className="text-slate-100 text-sm pt-0.5">
                  {getDateString(selectedSubmission.time)}
                </h2>
              </div>
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
      )}
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
