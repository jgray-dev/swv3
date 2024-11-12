import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker, Overlay, ZoomControl } from "pigeon-maps";
import { AveragedValues, DbUpload, LoaderData } from "~/.server/interfaces";
import React, {
  useEffect,
  useState,
  useMemo,
  ReactElement,
  useRef,
} from "react";
import StatItem from "~/components/StatItem";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

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

  const visibleItems = useMemo(() => {
    return Object.values(submissions).filter((sub) =>
      isWithinBounds(sub.lat, sub.lon, currentBounds)
    );
  }, [submissions, currentBounds]);

  const overlays = useMemo(() => {
    return renderOverlays(visibleItems);
  }, [visibleItems]);

  function isWithinBounds(
    lat: number,
    lon: number,
    bounds: Bounds | null
  ): boolean {
    if (!bounds) return true;

    const tolerance = 0.5;
    return (
      lat <= bounds.ne[0] + tolerance &&
      lat >= bounds.sw[0] - tolerance &&
      lon >= bounds.sw[1] - tolerance &&
      lon <= bounds.ne[1] + tolerance
    );
  }

  //Submission grouping logic
  interface CoordGroup {
    center: [number, number];
    subs: DbUpload[];
    group: boolean;
  }

  function isWithinBuffer(
    point1: [number, number],
    point2: [number, number]
  ): boolean {
    const buffer = getBuffer();
    return (
      Math.abs(point1[0] - point2[0]) <= buffer &&
      Math.abs(point1[1] - point2[1]) <= buffer
    );
  }

  function getBuffer() {
    const maxZoom = 14,
      minZoom = 11,
      maxValue = 0.15,
      minValue = 0.01;
    const zoomRange = maxZoom - minZoom,
      valueRange = minValue - maxValue;
    const zoomFraction = (Math.min(currentZoom, 14) - minZoom) / zoomRange;
    return maxValue + zoomFraction * valueRange;
  }

  function groupCoordinates(subs: DbUpload[]): CoordGroup[] {
    const groups: CoordGroup[] = [];
    const used = new Set<number>();
    for (let i = 0; i < subs.length; i++) {
      if (used.has(i)) continue;
      let closestGroup: CoordGroup | null = null;
      let minDistance = Infinity;
      for (const group of groups) {
        if (isWithinBuffer([subs[i].lat, subs[i].lon], group.center)) {
          const distance = calculateDistance(
            [subs[i].lat, subs[i].lon],
            group.center
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestGroup = group;
          }
        }
      }
      if (closestGroup) {
        closestGroup.subs.push(subs[i]);
        closestGroup.group = true;
        used.add(i);
        closestGroup.center = [
          closestGroup.subs.reduce((sum, sub) => sum + sub.lat, 0) /
            closestGroup.subs.length,
          closestGroup.subs.reduce((sum, sub) => sum + sub.lon, 0) /
            closestGroup.subs.length,
        ];
      } else {
        const newGroup: CoordGroup = {
          center: [subs[i].lat, subs[i].lon],
          subs: [subs[i]],
          group: false,
        };
        groups.push(newGroup);
        used.add(i);
      }
    }
    return groups;
  }

  // Submission overlays
  function renderOverlays(subs: DbUpload[]): ReactElement[] | ReactElement {
    if (!(subs.length > 0)) return <></>;
    const groups = groupCoordinates(subs);
    if (!groups) return <></>;
    return groups.map((g) =>
      g.group ? (
        <Overlay
          anchor={g.center}
          key={Math.random() * g.center[0]}
          offset={[Math.min(g.subs.length, 3) * 32, 64]}
        >
          <div className={`gap-1 grid-cols-3 grid`}>
            {g.subs.map((sub) => (
              <button
                onClick={() => {
                  animateZoom(sub.lat, sub.lon);
                  setSelectedSubmission(sub);
                }}
                key={sub.time}
              >
                <img
                  src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${sub.image_id}/thumbnail`}
                  alt={sub.city}
                  className={`${
                    g.subs.length <= 3
                      ? "w-32 h-32"
                      : g.subs.length <= 6
                      ? "w-24 h-24"
                      : "w-16 h-16"
                  } object-cover rounded-md transition-transform hover:scale-105 ${getBorderColor(
                    sub.rating
                  )} border-2 drop-shadow-xl shadow-xl hover:z-50 z-10`}
                />
              </button>
            ))}
          </div>
        </Overlay>
      ) : (
        <Overlay
          anchor={g.center}
          key={Math.random() * g.center[0]}
          offset={[64, 64]}
        >
          <button
            onMouseDown={() => {
              animateZoom(g.subs[0].lat, g.subs[0].lon);
              setSelectedSubmission(g.subs[0]);
            }}
          >
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const currentScroll = window.scrollY;
      const delta = currentScroll - lastScrollY.current;
      lastScrollY.current = currentScroll;

      setParallaxOffset((prev) => {
        const newOffset = prev + delta * 1.5;
        return Math.min(Math.max(0, newOffset), maxScroll);
      });
    };

    const calculateMaxScroll = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.scrollWidth;
      const viewportWidth = window.innerWidth;
      setMaxScroll(Math.max(0, containerWidth - viewportWidth) + 32);
    };

    calculateMaxScroll();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", calculateMaxScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateMaxScroll);
    };
  }, [maxScroll]);

  const handleScroll = (direction: "left" | "right") => {
    setParallaxOffset((prev) => {
      const newOffset = direction === "left" ? prev - 300 : prev + 300;
      return Math.min(Math.max(0, newOffset), maxScroll);
    });
  };

  if (!allData?.uploads) return null;

  const sortedUploads = [...allData.uploads].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  );

  function animateZoom(
    targetLat: number,
    targetLon: number,
    targetZoom: number = 16
  ) {
    const startZoom = currentZoom;
    const [startLat, startLon] = currentCenter;
    const duration = 1200;
    const startTime = performance.now();

    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Quadratic ease-out for position (smooth start, slower end)
      const positionEased = progress * (2 - progress);

      // Cubic ease-in for zoom (slow start, rapid end)
      const zoomEased = progress * progress * progress;

      const newZoom = startZoom + (targetZoom - startZoom) * zoomEased;
      const newLat = startLat + (targetLat - startLat) * positionEased;
      const newLon = startLon + (targetLon - startLon) * positionEased;

      setCurrentZoom(newZoom);
      setCurrentCenter([newLat, newLon]);

      if (progress < 1) {
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

      <div className="relative w-screen overflow-x-hidden min-h-[20vh] mt-24 text-center font-bold">
        Featured user submissions
        <div
          className="flex gap-4 py-8 transition-transform duration-150 ease-in-out mr-4 ml-4 w-full"
          ref={containerRef}
          style={{ transform: `translateX(-${parallaxOffset}px)` }}
        >
          {sortedUploads.map((sub) => (
            <div
              key={sub.image_id}
              className="flex-shrink-0 w-[250px] h-[170px] overflow-hidden rounded-md"
              onClick={() => {
                setSelectedSubmission(sub);
                animateZoom(sub.lat, sub.lon);
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
        <button
          onClick={() => handleScroll("left")}
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 p-3 rounded-full text-white hover:bg-black/70 transition-opacity backdrop-blur-xs ${
            parallaxOffset === 0 ? "opacity-0" : "opacity-100"
          }`}
          disabled={parallaxOffset === 0}
        >
          <FaChevronLeft size={24} />
        </button>
        <button
          onClick={() => handleScroll("right")}
          className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 p-3 rounded-full text-white hover:bg-black/70 transition-opacity backdrop-blur-xs ${
            parallaxOffset >= maxScroll ? "opacity-0" : "opacity-100"
          }`}
          disabled={parallaxOffset >= maxScroll}
        >
          <FaChevronRight size={24} />
        </button>
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
              <ZoomControl />

              {currentZoom > 9 || visibleItems.length === 1
                ? overlays
                : // visibleItems.map((sub:DbUpload)=>(
                  //   <Overlay
                  //     anchor={[sub.lat, sub.lon]}
                  //     key={sub.time}
                  //     offset={[64, 64]}
                  //   >
                  //     <button
                  //       onMouseDown={() => {
                  //         animateZoom(sub.lat, sub.lon);
                  //         setSelectedSubmission(sub);
                  //       }}
                  //     >
                  //       <img
                  //         src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${sub.image_id}/thumbnail`}
                  //         alt={sub.city}
                  //         className={`max-w-32 max-h-32 aspect-auto rounded-lg transition-transform hover:scale-105 ${getBorderColor(
                  //           sub.rating
                  //         )} border-2 drop-shadow-xl shadow-xl hover:z-50 z-10`}
                  //       />
                  //     </button>
                  //   </Overlay>
                  // ))
                  visibleItems.map((sub: any) => (
                    <Marker
                      color={getHsl(sub.rating)}
                      anchor={[sub.lat, sub.lon]}
                      key={sub.time}
                      onClick={() => {
                        setSelectedSubmission(sub);
                        animateZoom(sub.lat, sub.lon, 12);
                      }}
                    />
                  ))}
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

function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
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
