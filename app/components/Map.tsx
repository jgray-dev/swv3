import { useRouteLoaderData } from "@remix-run/react";
import {dbUpload, LoaderData} from "~/.server/interfaces";
import { RMap, RMarker } from "maplibre-react-components";
import React, { useMemo } from "react";

export default function Map() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData?.ok) return null;

  // Use center as a dynamic value instead of initialCenter
  const mapCenter = useMemo(() => [allData.lon, allData.lat] as [number, number], [
    allData.lon,
    allData.lat,
  ]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] md:h-[600px] rounded-lg overflow-hidden">
      <RMap
        id="asd"
        className="w-full h-full"
        mapStyle="https://demotiles.maplibre.org/style.json"
        initialCenter={mapCenter}
        initialZoom={6}
        renderWorldCopies={false}
        style={{
          borderRadius: "1.5rem",
        }}
      >
        {allData.uploads.map((upload: dbUpload) => (
          <RMarker
            key={`${upload.lat}-${upload.lon}-${upload.time}`}
            latitude={upload.lat}
            longitude={upload.lon}
          />
        ))}
      </RMap>
    </div>
  );
}