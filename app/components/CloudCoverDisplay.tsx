import React, { useState } from "react";
import { WiCloudyWindy, WiCloudy, WiDayCloudy } from "react-icons/wi";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";
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
         border
        ${stateClass}
        transition-all duration-300 hover:scale-105
        text-slate-100
      `}
    >
      <Icon size={32} className="mb-1" />
      <span className="text-xs font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-lg font-bold">{Math.round(coverage)}%</span>
    </div>
  );
};

interface LocationCardProps {
  location: InterpolatedWeather;
  index: number;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, index }) => {
  const getTotalCoverageState = (coverage: number) => {
    if (coverage === 0) return "bg-green-500/10 border-green-500/20";
    if (coverage < 30) return "bg-green-500/20 border-green-500/30";
    if (coverage < 60) return "bg-green-500/20 border-green-500/30";
    if (coverage < 80) return "bg-orange-500/20 border-orange-500/30";
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
        bg-white/10 
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
             border
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
  const [isExpanded, setIsExpanded] = useState(false);
  const data = useRouteLoaderData<LoaderData>("routes/_index");
  if (!data?.ok) return null;

  const nearLocations = data.weatherData.filter((loc) => loc.zone === "near");
  const horizonLocations = data.weatherData.filter(
    (loc) => loc.zone === "horizon"
  );
  const farLocations = data.weatherData.filter((loc) => loc.zone === "far");

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <button
        onMouseDown={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-lg mb-6 text-slate-300 hover:text-white transition-colors duration-150"
      >
        <div className="w-screen text-center flex justify-center">
          {isExpanded ? "Click to hide details" : "Click to reveal details"}
          {isExpanded ? (
            <HiChevronUp className="ml-2 mt-1" />
          ) : (
            <HiChevronDown className="ml-2 mt-1" />
          )}
        </div>
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-1000 ease-in-out
          ${isExpanded ? "max-h-[5000px]" : "max-h-0"}
        `}
      >
        <ZoneSection
          title="Near Zone"
          locations={nearLocations}
          startIndex={0}
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
    </div>
  );
}
