import React from 'react';
import {useRouteLoaderData} from "@remix-run/react";
import {LoaderData} from "~/.server/interfaces";

{/*@ts-ignore*/}
const WeatherVisualization = ({ weatherData }) => {
  const maxHeight = 35000; // feet
  const pixelsPerFoot = 0.0115; // Increased scale factor for height
  const pixelsPerMile = 120; // Increased scale factor for distance

  const lowCloudMax = 10000;
  const midCloudMax = 26000;

  const heightMarkers = [0, 5000, 10000, 15000, 20000, 25000, 30000, 35000];

  return (
    <div className="relative w-full h-full bg-[#1a1f35] text-white">
      {/* Y-axis scale */}
      <div className="absolute left-16 top-4 bottom-12 w-8">
        {heightMarkers.map((height) => (
          <div
            key={height}
            className="absolute right-0 flex items-center"
            style={{
              bottom: `${height * pixelsPerFoot}px`,
            }}
          >
            <span className="text-xs mr-2 text-gray-300">{(height / 1000)}k</span>
            <div className="w-2 h-px bg-gray-600" />
          </div>
        ))}
      </div>

      {/* X-axis scale */}
      <div className="absolute left-24 right-8 bottom-0 h-12">
        {/*@ts-ignore*/}
        {weatherData.map((_, index) => (
          <div
            key={index}
            className="absolute bottom-0 flex flex-col items-center"
            style={{
              left: `${index * pixelsPerMile}px`,
            }}
          >
            <div className="h-2 w-px bg-gray-600" />
            <span className="text-xs mt-1 text-gray-300">{index} mi</span>
          </div>
        ))}
      </div>

      {/* Main visualization area */}
      <div className="absolute left-24 right-8 bottom-12 top-4">
        {/*@ts-ignore*/}
        {weatherData.map((data, index) => (
          <div
            key={index}
            className="absolute bottom-0"
            style={{
              left: `${index * pixelsPerMile}px`,
              width: `${pixelsPerMile - 4}px` // Slight gap between columns
            }}
          >
            {/* High clouds */}
            <div
              className="absolute w-full bg-white transition-opacity"
              style={{
                bottom: `${midCloudMax * pixelsPerFoot}px`,
                height: `${(maxHeight - midCloudMax) * pixelsPerFoot}px`,
                opacity: data.cloud_cover_high / 100,
              }}
            />

            {/* Mid clouds */}
            <div
              className="absolute w-full bg-white transition-opacity"
              style={{
                bottom: `${lowCloudMax * pixelsPerFoot}px`,
                height: `${(midCloudMax - lowCloudMax) * pixelsPerFoot}px`,
                opacity: data.cloud_cover_mid / 100,
              }}
            />

            {/* Low clouds */}
            <div
              className="absolute w-full bg-white transition-opacity"
              style={{
                bottom: '0px',
                height: `${lowCloudMax * pixelsPerFoot}px`,
                opacity: data.cloud_cover_low / 100,
              }}
            />

            {/* Freezing height line */}
            <div
              className="absolute w-full h-0.5 bg-blue-400"
              style={{
                bottom: `${data.freezing_height * pixelsPerFoot}px`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-[#2a2f45] p-4 rounded-lg">
        <div className="text-sm font-medium mb-2 text-gray-200">Legend</div>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-white opacity-50 mr-2" />
            <span className="text-xs text-gray-300">High Clouds (26k+ ft)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-white opacity-50 mr-2" />
            <span className="text-xs text-gray-300">Mid Clouds (10k-26k ft)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-white opacity-50 mr-2" />
            <span className="text-xs text-gray-300">Low Clouds (0-10k ft)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-px bg-blue-400 mr-2" />
            <span className="text-xs text-gray-300">Freezing Height</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Visualize() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData?.ok) return null;
  const weatherData = allData.weatherData;

  return (
    <div className="h-screen w-screen">
      <WeatherVisualization weatherData={weatherData} />
    </div>
  );
}