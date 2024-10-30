import React, { useEffect, useState } from "react";
import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData } from "~/.server/interfaces";

interface SparkleData {
  id: number;
  top: string;
  left: string;
  scale: number;
  delay: string;
}


const SparkleText = () => {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData) return null;
  console.log(allData.relative)
  const [sparkles, setSparkles] = useState<SparkleData[]>([]);

  useEffect(() => {
    if (allData.relative === "current") {
      const newSparkles = Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        scale: 0.5 + Math.random() * 0.5,
        delay: `${i * 300}ms`,
      }));
      setSparkles(newSparkles);
    } else {
      setSparkles([]);
    }
  }, [allData.relative]);

  return (
    <div className="relative">
      {/* Sparkle elements */}
      {allData.relative === "current" &&
        sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            style={{
              position: "absolute",
              top: sparkle.top,
              left: sparkle.left,
              transform: `scale(${sparkle.scale})`,
              animationDelay: sparkle.delay,
            }}
            className="pointer-events-none absolute animate-[sparkle_1.5s_ease-in-out_infinite]"
          >
            <div className="relative h-2 w-2">
              <div className="absolute rotate-45 h-2 w-0.5 bg-gray-200/20" />
              <div className="absolute rotate-[135deg] h-2 w-0.5 bg-gray-200/20" />
              <div className="absolute h-0.5 w-2 top-[6px] -mt-[4px] bg-gray-200/20" />
              <div className="absolute h-2 w-0.5 left-[6px] -ml-[4px] bg-gray-200/20" />
            </div>
          </div>
        ))}

      {/* Main text */}
      <span
        className={`text-sm sm:text-base mt-1 relative ${
          allData.relative === "current"
            ? "animate-pulse text-green-400"
            : allData.relative === "future"
            ? "animate-pulse-subtle text-green-300"
            : "text-red-300"
        }`}
      >
        {allData.eventString.charAt(0).toUpperCase() +
          allData.eventString.slice(1)}
      </span>
    </div>
  );
};

export default SparkleText;
