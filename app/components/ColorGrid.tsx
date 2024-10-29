import { useState} from "react";
import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData} from "~/.server/interfaces";

const DISTANCES = [0, 20, 40, 60, 80, 100];

export function ColorGrid() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData) return null
  const weatherData = allData.weatherData;
  const [showImpact, setShowImpact] = useState(false);

  const getDirection = (data: any): string => {
    return data["event-type"] === "sunset" ? "flex-row-reverse" : "flex-row";
  };

  const getHighCloudImpact = (coverage: number, index: number): number => {
    const isInFarZone = index >= 3; // 60 miles or more
    if (isInFarZone) {
      return Math.round((100 - Math.min(Math.abs(coverage - 55) * 2, 100)) * 0.7);
    }
    return 0;
  };

  const getMidCloudImpact = (coverage: number, index: number): number => {
    if (index === 3 || index === 4) { // 60 or 80 miles
      return Math.round((100 - Math.min(Math.abs(coverage - 30) * 2, 100)) * 0.3);
    }
    return Math.round(-coverage * 0.4);
  };

  const getLowCloudImpact = (coverage: number, index: number): number => {
    if (index <= 2) { // 0-40 miles
      return Math.round(-coverage * 0.8);
    }
    return Math.round(-coverage * 0.2);
  };

  const getImpactColor = (impact: number): string => {
    if (impact <= -50) return "bg-red-700";
    if (impact <= -40) return "bg-red-600";
    if (impact <= -30) return "bg-red-500";
    if (impact <= -20) return "bg-red-400";
    if (impact <= -10) return "bg-red-300";
    if (impact < 0) return "bg-red-200";
    if (impact === 0) return "bg-gray-200";
    if (impact > 0 && impact < 10) return "bg-green-200";
    if (impact <= 10) return "bg-green-300";
    if (impact <= 20) return "bg-green-400";
    if (impact <= 30) return "bg-green-500";
    if (impact <= 40) return "bg-green-600";
    if (impact <= 50) return "bg-green-700";
    return "bg-green-600";
  };

  const getDefaultColor = (height: string, index: number): string => {
    const colors = {
      high: ["bg-red-200", "bg-orange-200", "bg-yellow-300", "bg-green-300", "bg-green-400", "bg-blue-200"],
      mid: ["bg-red-300", "bg-orange-300", "bg-yellow-400", "bg-green-200", "bg-green-200", "bg-blue-100"],
      low: ["bg-red-600", "bg-red-500", "bg-red-400", "bg-yellow-200", "bg-yellow-100", "bg-gray-200"]
    };
    return colors[height as keyof typeof colors][index];
  };

  return (
    <div className="bg-gray-400 mt-12 w-screen min-h-16 flex flex-col font-semibold">

      <div className="flex justify-end px-4 py-2">
        <label className="inline-flex items-center cursor-pointer">
          <span className="mr-3 text-sm">Default</span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={showImpact}
              onChange={() => setShowImpact(!showImpact)}
            />
            <div
              className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"/>
          </div>
          <span className="ml-3 text-sm">Impact</span>
        </label>
      </div>

      <div className={`flex justify-center ${getDirection(allData)}`}>
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-4"></div>
        {DISTANCES.map((distance) => (
          <div key={distance} className="bg-gray-400 min-h-12 min-w-12 text-center pt-4">
            {distance}
          </div>
        ))}
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-4">miles</div>
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2"></div>
      </div>

      {/* High clouds row */}
      <div className={`flex justify-center ${getDirection(allData)}`}>
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2">High</div>
        {weatherData.map((weather, index) => {
          const impact = getHighCloudImpact(weather.cloud_cover_high, index);
          const bgColor = showImpact ? getImpactColor(impact) : getDefaultColor("high", index);
          return (
            <div
              key={index}
              className={`${bgColor} min-h-12 min-w-12 border border-black text-center pt-1 text-black`}
              title={`Impact: ${impact}`}
            >
              {Math.round(weather.cloud_cover_high)}%
            </div>
          );
        })}
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2"></div>
      </div>

      {/* Mid clouds row */}
      <div className={`flex justify-center ${getDirection(allData)}`}>
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2">Mid</div>
        {weatherData.map((weather, index) => {
          const impact = getMidCloudImpact(weather.cloud_cover_mid, index);
          const bgColor = showImpact ? getImpactColor(impact) : getDefaultColor("mid", index);
          return (
            <div
              key={index}
              className={`${bgColor} min-h-12 min-w-12 border border-black text-center pt-1 text-black`}
              title={`Impact: ${impact}`}
            >
              {Math.round(weather.cloud_cover_mid)}%
            </div>
          );
        })}
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2"></div>
      </div>

      {/* Low clouds row */}
      <div className={`flex justify-center ${getDirection(allData)}`}>
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2">Low</div>
        {weatherData.map((weather, index) => {
          const impact = getLowCloudImpact(weather.cloud_cover_low, index);
          const bgColor = showImpact ? getImpactColor(impact) : getDefaultColor("low", index);
          const isObservingLocation = index === 0;
          return (
            <div
              key={index}
              className={`${bgColor} min-h-12 min-w-12 ${
                isObservingLocation ? "border-2 border-white" : "border border-black"
              } text-center pt-1 text-black`}
              title={`Impact: ${impact}${isObservingLocation ? "\nObserving location" : ""}`}
            >
              {Math.round(weather.cloud_cover_low)}%
            </div>
          );
        })}
        <div className="bg-gray-400 min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-amber-500 min-h-12 min-w-12 text-center pt-2 border-[13px] border-gray-400"
             title="Sun"></div>
      </div>

      {/* Bottom row remains unchanged */}
    </div>
  );
}

export default ColorGrid;