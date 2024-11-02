import React from "react";
import { WiCloudyWindy, WiCloudy, WiDayCloudy } from "react-icons/wi";
import { useRouteLoaderData } from "@remix-run/react";
import type { LoaderData, InterpolatedWeather } from "~/.server/interfaces";

interface CloudLevelProps {
  coverage: number;
  label: string;
}

const CloudLevel: React.FC<CloudLevelProps> = ({ coverage, label }) => {
  const getStateClass = (coverage: number) => {
    if (coverage === 0) return "bg-white/5 border-white/10";
    if (coverage < 30) return "bg-sky-500/10 border-sky-500/20";
    if (coverage < 60) return "bg-sky-500/20 border-sky-500/30";
    return "bg-sky-500/30 border-sky-500/40";
  };

  const getIcon = (coverage: number) => {
    if (coverage === 0) return WiDayCloudy;
    if (coverage < 50) return WiCloudy;
    return WiCloudyWindy;
  };

  const Icon = getIcon(coverage);
  const stateClass = getStateClass(coverage);

  return (
    <div
      className={`
        relative flex flex-col items-center p-3 rounded-xl
        backdrop-blur-sm border
        ${stateClass}
        transition-all duration-300 hover:scale-105
        text-slate-100
      `}
    >
      <Icon size={32} className="mb-1" />
      <span className="text-xs font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-lg font-bold">{coverage.toFixed(2)}%</span>
    </div>
  );
};

interface LocationCardProps {
  location: InterpolatedWeather;
  index: number;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, index }) => {
  const getTotalCoverageState = (coverage: number) => {
    if (coverage === 0) return "bg-green-500/20 border-green-500/30";
    if (coverage < 30) return "bg-yellow-500/20 border-yellow-500/30";
    if (coverage < 60) return "bg-orange-500/20 border-orange-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  const getZoneBorderClass = (zone: string) => {
    switch (zone) {
      case "near":
        return "border-gray-400";
      case "horizon":
        return "border-amber-400";
      case "far":
        return "border-yellow-200";
      default:
        return "border-white/20";
    }
  };

  return (
    <div
      className={`
        flex flex-col p-5 rounded-2xl
        bg-white/10 backdrop-blur-sm
        border ${getZoneBorderClass(location.zone)}
        transition-all duration-300
        hover:bg-white/15
        text-slate-100
      `}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-semibold">
          {index === 0 ? "Current Location" : `${location.distance} mi`}
        </span>
        <span
          className={`
            px-3 py-1 rounded-full text-sm font-medium
            backdrop-blur-sm border
            ${getTotalCoverageState(location.cloud_cover)}
            transition-all duration-200
          `}
        >
          {location.cloud_cover.toFixed(2)}% Total
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <CloudLevel coverage={location.cloud_cover_high} label="High" />
        <CloudLevel coverage={location.cloud_cover_mid} label="Mid" />
        <CloudLevel coverage={location.cloud_cover_low} label="Low" />
      </div>
    </div>
  );
};

const ZoneSection: React.FC<{
  title: string;
  locations: InterpolatedWeather[];
  startIndex: number;
}> = ({ title, locations, startIndex }) => (
  <div className="mb-8">
    <h3 className="text-xl font-semibold mb-4 text-slate-100">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {locations.map((location, idx) => (
        <LocationCard
          key={`${location.latitude}-${location.longitude}`}
          location={location}
          index={startIndex + idx}
        />
      ))}
    </div>
  </div>
);

export default function CloudCoverDisplay() {
  const data = useRouteLoaderData<LoaderData>("routes/_index");
  if (!data?.ok) return null;

  const nearLocations = data.weatherData.filter(loc => loc.zone === "near");
  const horizonLocations = data.weatherData.filter(loc => loc.zone === "horizon");
  const farLocations = data.weatherData.filter(loc => loc.zone === "far");

  let currentIndex = 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-slate-100">
        Cloud Coverage Analysis
      </h2>

      <ZoneSection
        title="Near Zone"
        locations={nearLocations}
        startIndex={currentIndex}
      />

      <ZoneSection
        title="Horizon Zone"
        locations={horizonLocations}
        startIndex={nearLocations.length}
      />

      <ZoneSection
        title="Far Zone"
        locations={farLocations}
        startIndex={horizonLocations.length}
      />
    </div>
  );
}