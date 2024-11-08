import { useFetcher, useRouteLoaderData } from "@remix-run/react";
import { Map, Marker, Overlay, ZoomControl } from "pigeon-maps";
import { AveragedValues, DbUpload, LoaderData } from "~/.server/interfaces";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  ReactElement,
} from "react";
import StatItem from "~/components/StatItem";

interface FetcherData {
  success: boolean;
  error?: string;
  message?: string;
  data?: DbUpload[] | null;
  more?: boolean;
}

interface Bounds {
  ne: [number, number];
  sw: [number, number];
}

interface PostMap {
  [id: number]: DbUpload;
}

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const fetcher = useFetcher<FetcherData>();

  const [submissions, setSubmissions] = useState<PostMap>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lockRefresh, setLockRefresh] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const [currentZoom, setCurrentZoom] = useState<number>(9);
  const [currentBounds, setCurrentBounds] = useState<Bounds | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<DbUpload | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number[]>(
    allData?.lat && allData?.lon
      ? [allData.lat, allData.lon]
      : [40.7128, -74.006]
  );
  const [currentLocation, setCurrentLocation] = useState<[number, number]>(
    allData?.lat && allData?.lon
      ? [allData.lat, allData.lon]
      : [40.7128, -74.006]
  );
  const [visibleMarkersCount, setVisibleMarkersCount] = useState<number>(0);

  useEffect(() => {
    if (allData?.uploads) {
      const newSubmissions = allData.uploads.reduce((acc, upload) => {
        acc[upload.id] = upload;
        return acc;
      }, {} as PostMap);
      setSubmissions(newSubmissions);
    }
  }, [allData?.uploads]);

  const visibleItems = useMemo(() => {
    return Object.values(submissions).filter((sub) =>
      isWithinBounds(sub.lat, sub.lon, currentBounds)
    );
  }, [submissions, currentBounds]);

  function getCenter(): [number, number] {
    if (!currentBounds) {
      return [40.7128, -74.006];
    }
    return [
      (currentBounds.ne[0] + currentBounds.sw[0]) / 2,
      (currentBounds.ne[1] + currentBounds.sw[1]) / 2,
    ];
  }

  useEffect(() => {
    if (lockRefresh) return;
    const curLoc = getCenter();
    if (
      Math.abs(curLoc[0] - lastRefresh[0]) > 2 ||
      Math.abs(curLoc[1] - lastRefresh[1]) > 2
    ) {
      void handleRefresh();
      setLastRefresh(curLoc);
    }
  }, [currentBounds, lockRefresh]);

  const handleRefresh = useCallback(async () => {
    if (lockRefresh) return;
    if (isRefreshing) return;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    setIsRefreshing(true);
    refreshTimeoutRef.current = setTimeout(() => {
      const location: [number, number] = getCenter();
      const currentIds = Object.keys(submissions).map(Number);
      fetcher.submit(
        {
          newLocation: JSON.stringify(location),
          element: "refreshMap",
          currentIds: JSON.stringify(currentIds),
        },
        { method: "post" }
      );
    }, 150);
  }, [submissions, isRefreshing, fetcher]);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.data) {
      setLockRefresh(!fetcher.data.more);
      setSubmissions((prev) => {
        const newSubmissions = { ...prev };
        fetcher.data?.data?.forEach((upload) => {
          if (!newSubmissions[upload.id]) {
            newSubmissions[upload.id] = upload;
          }
        });
        return newSubmissions;
      });
    } else if (fetcher.data?.error) {
      console.error("Failed to refresh:", fetcher.data.error);
    }
    setIsRefreshing(false);
  }, [fetcher.data]);

  useEffect(() => {
    setVisibleMarkersCount(visibleItems.length);
  }, [visibleItems]);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCurrentLocation(
      allData?.lat && allData?.lon
        ? [allData.lat, allData.lon]
        : [40.7128, -74.006]
    );
  }, [allData]);

  function isWithinBounds(
    lat: number,
    lon: number,
    bounds: Bounds | null
  ): boolean {
    if (!bounds) return true;
    return (
      lat <= bounds.ne[0] &&
      lat >= bounds.sw[0] &&
      lon >= bounds.sw[1] &&
      lon <= bounds.ne[1]
    );
  }

  const getHsl = (rating: number): string => {
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

  const getBorderColor = (rating: number): string => {
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
  };

  function isWithinBuffer(
    point1: [number, number],
    point2: [number, number],
    buffer: number = 0.05
  ): boolean {
    return (
      Math.abs(point1[0] - point2[0]) <= buffer &&
      Math.abs(point1[1] - point2[1]) <= buffer
    );
  }

  interface CoordGroup {
    center: [number, number];
    subs: DbUpload[];
    group: boolean;
  }

  function groupCoordinates(
    subs: DbUpload[],
    buffer: number = 0.005
  ): CoordGroup[] {
    const groups: CoordGroup[] = [];
    const used = new Set<number>();
    for (let i = 0; i < subs.length; i++) {
      if (used.has(i)) continue;

      const currentGroup: CoordGroup = {
        center: [subs[i].lat, subs[i].lon],
        subs: [],
        group: false,
      };

      const currentCoord: [number, number] = [subs[i].lat, subs[i].lon];

      currentGroup.subs.push(subs[i]);
      used.add(i);

      // Check remaining coordinates
      for (let j = i + 1; j < subs.length; j++) {
        if (used.has(j)) continue;

        const checkCoord: [number, number] = [subs[j].lat, subs[j].lon];
        if (isWithinBuffer(currentCoord, checkCoord, buffer)) {
          currentGroup.subs.push(subs[j]);
          currentGroup.group = true;
          used.add(j);
        }
      }

      groups.push(currentGroup);
    }
    return groups;
  }

  const overlays = useMemo(() => {
    return renderOverlays(visibleItems);
  }, [visibleItems]);

  function renderOverlays(subs: DbUpload[]): ReactElement[] {
    if (!(subs.length > 0)) return [<></>];
    const groups = groupCoordinates(subs);
    if (!groups) return [<></>];
    console.log(groups.map((g) => (g.group ? "" : [g.center, g.subs])));
    return groups.map((g) =>
      g.group ? (
        <Overlay></Overlay> //todo: render the grouped overlay (some sort of grid/smaller icons/etc etc)
      ) : (
        <Overlay
          anchor={g.center}
          key={JSON.stringify(g.center)}
          offset={[64, 64]}
        >
          <button onMouseDown={() => setSelectedSubmission(g.subs[0])}>
            <img
              src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${g.subs[0].image_id}/thumbnail`}
              alt={g.subs[0].city}
              className={`max-w-32 max-h-32 aspect-auto rounded-lg transition-transform hover:scale-105 ${getBorderColor(
                g.subs[0].rating
              )} border-2 drop-shadow-xl shadow-xl hover:z-50 z-10`}
            />
          </button>
        </Overlay>
      )
    );
  }

  return (
    <>
      <div
        className={`${allData?.ok ? "hidden" : "visible min-h-[10vh]"}`}
      ></div>
      <div className={"w-screen text-center font-bold"}>
        user submission map
      </div>
      <div
        className={`w-full flex justify-center text-white/50 translate-y-3 ${
          isRefreshing ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`ml-2 h-4 w-4 rounded-full border-2 border-white/50 border-t-transparent animate-spin z-50 mt-1 mr-3 `}
          role="status"
          aria-label="Loading location data"
        ></div>
        <div>Loading</div>
      </div>
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
              center={currentLocation}
              zoom={currentZoom}
              attribution={false}
              animate={true}
              minZoom={2}
              maxZoom={14}
              onBoundsChanged={({ zoom, bounds, center }) => {
                if (zoom !== currentZoom) {
                  setCurrentZoom(zoom);
                }
                if (
                  center[0] !== currentLocation[0] ||
                  center[1] !== currentLocation[1]
                ) {
                  setCurrentLocation(center);
                }
                if (bounds !== currentBounds) {
                  setCurrentBounds(bounds);
                }
              }}
            >
              <ZoomControl />

              {currentZoom > 10 || visibleMarkersCount === 1
                ? overlays
                : visibleItems.map((sub: any) => (
                    <Marker
                      color={getHsl(sub.rating)}
                      anchor={[sub.lat, sub.lon]}
                      key={sub.time}
                      hover={false}
                      onClick={() => {
                        setCurrentLocation([sub.lat, sub.lon]);
                        setSelectedSubmission(sub);
                        const startZoom = currentZoom;
                        const targetZoom = 12;
                        const duration = 1200;
                        const startTime = performance.now();

                        const animateZoom = (currentTime: number) => {
                          const elapsed = currentTime - startTime;
                          const progress = Math.min(elapsed / duration, 1);
                          const eased = progress * (2 - progress);
                          const newZoom =
                            startZoom + (targetZoom - startZoom) * eased;
                          setCurrentZoom(newZoom);
                          if (progress < 1) {
                            requestAnimationFrame(animateZoom);
                          }
                        };
                        requestAnimationFrame(animateZoom);
                      }}
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
