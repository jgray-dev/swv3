import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData } from "~/.server/interfaces";

const DISTANCES = [0, 20, 40, 60, 80, 100];

export function ColorGrid() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData?.ok) return null;
  const weatherData = allData.weatherData;

  const getHighCloudImpact = (coverage: number, index: number): number => {
    const isInFarZone = index >= 3; // 60 miles or more
    if (isInFarZone) {
      return Math.round(
        (100 - Math.min(Math.abs(coverage - 55) * 2, 100)) * 0.7
      );
    }
    return 0;
  };

  const getMidCloudImpact = (coverage: number, index: number): number => {
    if (index === 3 || index === 4) {
      // 60 or 80 miles
      return Math.round(
        (100 - Math.min(Math.abs(coverage - 30) * 2, 100)) * 0.3
      );
    }
    return Math.round(-coverage * 0.4);
  };

  const getLowCloudImpact = (coverage: number, index: number): number => {
    if (index <= 2) {
      return Math.round(-coverage * 0.8);
    }
    return Math.round(-coverage * 0.2);
  };

  return (
    <div className="bg-transparent mt-12 w-screen min-h-16 flex flex-col font-semibold">
      <div className={`flex justify-center flex-row`}>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-4"></div>
        {DISTANCES.map((distance) => (
          <div
            key={distance}
            className="bg-transparent min-h-12 min-w-12 text-center pt-4"
          >
            {distance}
          </div>
        ))}
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-4">
          miles
        </div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
      </div>

      {/* High clouds row */}
      <div className={`flex justify-center flex-row`}>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2">
          High
        </div>
        {weatherData.map((weather, index) => {
          const impact = getHighCloudImpact(weather.cloud_cover_high, index);
          return (
            <div
              key={index}
              className={`bg-gray-300 min-h-12 min-w-12 border border-black text-center pt-1 text-black shadow-2xl`}
              title={`Impact: ${impact}`}
            >
              {Math.round(weather.cloud_cover_high)}%
            </div>
          );
        })}
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
      </div>

      <div className={`flex justify-center flex-row`}>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2">
          Mid
        </div>
        {weatherData.map((weather, index) => {
          const impact = getMidCloudImpact(weather.cloud_cover_mid, index);
          return (
            <div
              key={index}
              className={`bg-gray-300 min-h-12 min-w-12 border border-black text-center pt-1 text-black`}
              title={`Impact: ${impact}`}
            >
              {Math.round(weather.cloud_cover_mid)}%
            </div>
          );
        })}
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
      </div>

      {/* Low clouds row */}
      <div className={`flex justify-center flex-row`}>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2">
          Low
        </div>
        {weatherData.map((weather, index) => {
          const impact = getLowCloudImpact(weather.cloud_cover_low, index);
          const isObservingLocation = index === 0;
          return (
            <div
              key={index}
              className={`bg-gray-300 min-h-12 min-w-12 border border-black text-center pt-1 text-black`}
              title={`Impact: ${impact}${
                isObservingLocation ? "\nObserving location" : ""
              }`}
            >
              {Math.round(weather.cloud_cover_low)}%
            </div>
          );
        })}
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div
          className="bg-gradient-to-br from-orange-600 to-orange-400 rounded-full min-h-6 min-w-6 text-center pt-2 mb-3 mt-3 mr-6"
          title="Sun"
        ></div>
      </div>
      <div className={`flex justify-center flex-row`}>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2">
          {allData.eventType == "sunrise" ? "Cloud " : " height"}
        </div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2">
          {allData.eventType == "sunrise" ? " height" : "Cloud "}
        </div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
        <div className="bg-transparent min-h-12 min-w-12 text-center pt-2"></div>
      </div>
    </div>
  );
}

export default ColorGrid;
