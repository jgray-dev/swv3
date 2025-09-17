import { useRouteLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { FaLongArrowAltUp } from "react-icons/fa";
import { LoaderData } from "~/.server/interfaces";
import StatItem from "~/components/StatItem";

export default function RatingDisplay() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [displayNumber, setDisplayNumber] = useState(allData?.rating || 0);
  const [userLocalTime, setUserLocalTime] = useState<string>("");
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef(displayNumber);

  // Calculate user's local time for hover tooltip
  useEffect(() => {
    if (!allData?.ok || !allData.eventTime) return;

    // eventTime is a Unix timestamp - when converted to Date, it automatically
    // displays in the user's local timezone, which is exactly what we want for the tooltip
    const eventDate = new Date(allData.eventTime * 1000);
    const userTimeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    setUserLocalTime(userTimeFormatter.format(eventDate));
  }, [allData?.eventTime]);

  useEffect(() => {
    if (!allData?.ok) return;

    startTimeRef.current = performance.now();
    startValueRef.current = displayNumber;
    let animationFrameId: number;
    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      if (progress < 1) {
        const newValue =
          startValueRef.current + (rating - startValueRef.current) * progress;
        setDisplayNumber(Math.min(Math.max(0, newValue), 100));
        animationFrameId = requestAnimationFrame(animateNumber);
      } else {
        setDisplayNumber(Math.min(Math.max(0, rating), 100));
      }
    };
    animationFrameId = requestAnimationFrame(animateNumber);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [allData?.rating]);

  if (!allData?.ok) return null;

  const rating = Math.max(0, Math.min(100, allData.rating));
  const ANIMATION_DURATION = 500;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (rating / 100) * circumference;
  const dashOffset = circumference - progress;

  const getColor = (rating: number) => {
    if (rating <= 10) return "stroke-red-700";
    if (rating <= 20) return "stroke-red-600";
    if (rating <= 30) return "stroke-red-500";
    if (rating <= 45) return "stroke-orange-500";
    if (rating <= 60) return "stroke-orange-400";
    if (rating <= 70) return "stroke-yellow-500";
    if (rating <= 80) return "stroke-lime-500";
    if (rating <= 85) return "stroke-green-500";
    if (rating <= 95) return "stroke-green-600";
    return "stroke-[url(#circleGradient)]";
  };

  return (
    <main
      className="w-screen flex justify-center transition-all duration-500"
      role="main"
    >
      <div
        className="w-full bg-white/10 border border-white/20 sm:w-[36rem] sm:mt-4 mt-8 mx-4 min-h-32 rounded-lg flex flex-col sm:flex-row"
        role="region"
        aria-label="Weather Conditions Panel"
      >
        <div className="sm:basis-1/3 h-40 sm:h-auto sm:aspect-square mx-2 my-3 sm:mx-3 sm:my-4 relative flex flex-col items-center justify-center">
          <svg
            className="w-32 h-32 sm:w-2/3 sm:h-2/3 -rotate-90"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Rating indicator showing ${Math.round(
              displayNumber,
            )}%`}
          >
            <defs>
              <linearGradient
                id="circleGradient"
                gradientTransform="rotate(90)"
              >
                <stop offset="0%" stopColor="#23d526">
                  <animate
                    attributeName="stop-color"
                    values="#23d526;#2ecc71;#27ae60;#1abc9c;#16a085;#52c234;#23d526"
                    dur="5s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor="#2ecc71">
                  <animate
                    attributeName="stop-color"
                    values="#2ecc71;#27ae60;#1abc9c;#16a085;#52c234;#23d526;#2ecc71"
                    dur="5s"
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
            </defs>
            {rating < 100 && (
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="black"
                strokeWidth="2"
                strokeDasharray="4,4"
                className="opacity-10"
                aria-hidden="true"
              />
            )}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="4"
              className={`${getColor(
                rating,
              )} transition-all duration-500 ease-in-out`}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              role="presentation"
            />
          </svg>
          <div className="absolute flex items-center justify-center md:-translate-y-2 -translate-y-5">
            <span
              className={`text-2xl sm:text-4xl md:-translate-y-3 font-bold ${
                rating >= 95 ? "gradient-quick default-gradient" : ""
              }`}
              aria-live="polite"
            >
              {Math.round(displayNumber)}
            </span>
          </div>
          <div
            className={`text-sm sm:text-base mt-1 relative rounded px-1 cursor-help ${
              allData.relative === "current"
                ? "gradient default-gradient font-bold"
                : allData.relative === "future"
                  ? "text-green-400"
                  : "text-red-400"
            }`}
            title={userLocalTime ? `${userLocalTime} your local time` : ""}
            aria-label={`Event timing: ${allData.eventString}`}
          >
            {allData.eventString.charAt(0).toUpperCase() +
              allData.eventString.slice(1)}
          </div>
          <div
            className="text-sm flex align-center content-center text-white/40 "
            title={`${
              allData.eventType.charAt(0).toUpperCase() +
              allData.eventType.slice(1)
            } direction ${Math.round(allData.bearing)}° (${degreesToCompass(
              Math.round(allData.bearing),
            )})`}
          >
            <FaLongArrowAltUp
              className="h-5 w-5 duration-500"
              style={{ transform: `rotate(${Math.round(allData.bearing)}deg)` }}
            />
            <span
              key={allData.bearing}
              className="ml-2 overflow-hidden transition-[width] duration-200 ease-in-out w-[3rem]"
            >
              {Math.round(allData.bearing)}°
            </span>
          </div>
        </div>
        <div
          className="flex-1 sm:basis-2/3 border-t sm:border-t-0 sm:border-l border-white/10 p-4 space-y-2"
          role="region"
          aria-label="Weather Statistics"
        >
          <h2 className="text-lg font-medium text-slate-100 mb-4">
            Condition Details
          </h2>
          <StatItem label="Cloud Cover" value={allData.stats.cloud_cover} />
          <StatItem label="High Clouds" value={allData.stats.high_clouds} />
          <StatItem label="Mid Clouds" value={allData.stats.mid_clouds} />
          <StatItem label="Low Clouds" value={allData.stats.low_clouds} />
          <StatItem
            label="Visibility"
            value={allData.stats.visibility}
            isVisibility={true}
          />
          <StatItem
            label="Temperature"
            value={allData.stats.temperature}
            maxValue={122}
            unit="°F"
          />
        </div>
      </div>
    </main>
  );
}

function degreesToCompass(degrees: number): string {
  degrees = ((degrees % 360) + 360) % 360;
  const directions: [string, number][] = [
    ["N", 348.75],
    ["NE", 33.75],
    ["E", 78.75],
    ["SE", 123.75],
    ["S", 168.75],
    ["SW", 213.75],
    ["W", 258.75],
    ["NW", 303.75],
    ["N", 348.75],
  ];
  for (let i = 0; i < directions.length - 1; i++) {
    if (degrees >= directions[i][1] && degrees < directions[i + 1][1]) {
      return directions[i][0];
    }
  }
  return "N";
}
