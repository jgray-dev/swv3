import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData } from "~/.server/interfaces";
import { useEffect, useState, useRef } from "react";
import StatItem from "~/components/StatItem";
import SparkleText from "~/components/SparkleText";

export default function RatingDisplay() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData) return null;

  const rating = Math.max(0, Math.min(100, allData.rating));
  const [displayNumber, setDisplayNumber] = useState(rating);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef(displayNumber);
  const ANIMATION_DURATION = 500;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (rating / 100) * circumference;
  const dashOffset = circumference - progress;

  useEffect(() => {
    startTimeRef.current = performance.now();
    startValueRef.current = displayNumber;
    let animationFrameId: number;

    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      if (progress < 1) {
        const newValue =
          startValueRef.current + (rating - startValueRef.current) * progress;
        setDisplayNumber(newValue);
        animationFrameId = requestAnimationFrame(animateNumber);
      } else {
        setDisplayNumber(rating);
      }
    };

    animationFrameId = requestAnimationFrame(animateNumber);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [rating]);

  const getColor = (rating: number) => {
    if (rating <= 10) return "stroke-[#991b1b]";
    if (rating <= 30) return "stroke-[#dc2626]";
    if (rating <= 50) return "stroke-[#ea580c]";
    if (rating <= 70) return "stroke-[#eab308]";
    if (rating <= 90) return "stroke-[#22c55e]";
    return "stroke-[#059669]";
  };

  return (
    <div className="w-screen flex justify-center">
      <div className="w-full bg-white/10 backdrop-blur-sm border border-white/20 sm:w-[36rem] sm:mt-4 mt-8 mx-4 min-h-32 rounded-lg flex flex-col sm:flex-row">
        <div className="sm:basis-1/3 h-40 sm:h-auto sm:aspect-square mx-2 my-3 sm:mx-3 sm:my-4 relative flex flex-col items-center justify-center">
          <svg
            className="w-32 h-32 sm:w-2/3 sm:h-2/3 -rotate-90"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
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
              />
            )}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="4"
              className={`${getColor(
                rating
              )} transition-all duration-500 ease-in-out`}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex items-center justify-center">
            <span className="text-2xl sm:text-4xl font-bold">
              {Math.round(displayNumber)}
            </span>
          </div>
          <span
            className={`text-sm sm:text-base mt-1 relative rounded px-1 ${
              allData.relative === "current"
                ? "gradient default font-bold"
                : allData.relative === "future"
                ? "text-green-300"
                : "text-red-300"
            }`}
          >
             {allData.eventString.charAt(0).toUpperCase() +
               allData.eventString.slice(1)}
          </span>
        </div>
        <div className="flex-1 sm:basis-2/3 border-t sm:border-t-0 sm:border-l border-white/10 p-4 space-y-2">
          <h3 className="text-lg font-medium text-slate-100 mb-4">
            Condition Details
          </h3>
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
    </div>
  );
}
