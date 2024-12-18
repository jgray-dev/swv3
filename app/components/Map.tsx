import { useRouteLoaderData } from "@remix-run/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AveragedValues, DbUpload, LoaderData } from "~/.server/interfaces";
import StatItem from "~/components/StatItem";
import { useScrollLock } from "~/hooks/useScrollLock";

import Map, { MapRef, Marker, ViewState } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
// @ts-ignore
import type { GeoJSON } from "supercluster";

type BBox =
  | [number, number, number, number]
  | [number, number, number, number, number, number];

interface ClusterProperties {
  cluster: boolean;
  submissionId: string;
  rating: number;
  point_count?: number;
  cluster_id?: number;
}

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [selectedSubmission, setSelectedSubmission] = useState<
    DbUpload | undefined
  >(undefined);

  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: allData?.lon ? allData.lon : -74.0140283,
    latitude: allData?.lat ? allData.lat : 40.7053386,
    zoom: 5,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const [isMounted, setIsMounted] = useState(false);
  const [imgModal, setImgModal] = useState<string | null>(null);
  useScrollLock(!!imgModal);

  // const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    mapRef.current?.flyTo({
      center: [
        allData?.lon ? allData.lon : -74.0140283,
        allData?.lat ? allData.lat : 40.7053386,
      ],
      zoom: Math.min(viewState.zoom, 16),
      duration: 1500,
      essential: false,
    });
  }, [allData?.uploads]);

  const points: GeoJSON.Feature<GeoJSON.Point, ClusterProperties>[] =
    allData?.uploads
      ? allData.uploads.map((sub: DbUpload) => ({
          type: "Feature",
          properties: {
            cluster: false,
            submissionId: sub.id,
            rating: sub.rating,
          },
          geometry: {
            type: "Point",
            coordinates: [sub.lon, sub.lat],
          },
        }))
      : [];

  const supercluster = useMemo(() => {
    const cluster = new Supercluster<ClusterProperties>({
      radius: 30,
      maxZoom: 14,
    });
    cluster.load(points);
    return cluster;
  }, [points]);

  if (!allData?.uploads) return null;

  const handleClusterClick = (longitude: number, latitude: number) => {
    const newZoom = Math.min(viewState.zoom + 3, 16);
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: newZoom,
      duration: 500,
      essential: false,
    });
  };

  const handleMarkerClick = (
    longitude: number,
    latitude: number,
    submission: any
  ) => {
    setSelectedSubmission(submission);
    mapRef.current?.flyTo({
      // center: [longitude + (isMobile?0.0:0), latitude],
      center: [longitude, latitude],
      zoom: 16,
      duration: 800,
      essential: false,
    });
  };

  return (
    <div className={"w-screen"}>
      <div
        className={`${allData?.ok ? "hidden" : "visible min-h-[10vh]"}`}
      ></div>
      <div className="w-full min-h-[20vh] mt-24 text-center font-bold">
        <div className={"select-none translate-y-6"}>User submitted photos</div>
        {/* start */}
        <div className="flex gap-4 py-8 transition-transform duration-150 ease-in-out w-full px-4 overflow-x-scroll min-h-[234px] scrollbar scrollbar-thumb-white/10">
          {[...allData.uploads]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .map((sub) => (
              <div
                key={sub.image_id}
                className={`flex-shrink-0 w-[250px] h-[170px] overflow-hidden rounded-md cursor-pointer ${getBorderColor(
                  sub.rating
                )} border`}
                onClick={() => {
                  handleMarkerClick(sub.lon, sub.lat, sub);
                }}
              >
                <img
                  src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${sub.image_id}/mid`}
                  alt={`User submission from ${sub.city}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
        </div>
        {/* end */}
      </div>
      <div className="max-w-screen min-h-screen p-4 flex md:flex-row flex-col gap-4">
        <div
          className={`transition-all duration-400 ease-in-out w-full md:w-3/4 transform select-none ${
            selectedSubmission ? "md:!w-1/2" : ""
          } h-[500px] md:h-[800px] rounded-lg overflow-hidden shadow-lg mx-auto`}
          role="region"
          aria-label="Interactive location map"
        >
          {isMounted && (
            //TODO: add back map lol
            <Map
              ref={mapRef}
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              attributionControl={false}
              mapboxAccessToken="pk.eyJ1IjoiamdyYXktZGV2IiwiYSI6ImNtNHE3NWg1bTEweTAyaW9xcGhmcmhpanoifQ.LXRvGvmVC2BZPpYvzZQnYA"
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              maxZoom={16}
              minZoom={1}
              dragRotate={false}
              touchZoomRotate={true}
              pitchWithRotate={false}
              bearing={0}
              touchPitch={false}
              keyboard={false}
              cooperativeGestures={true}
            >
              {supercluster
                .getClusters(
                  [-180, -85, 180, 85] as BBox,
                  Math.floor(viewState.zoom)
                )
                .map((cluster) => {
                  const [longitude, latitude] = cluster.geometry.coordinates;
                  const { cluster: isCluster } = cluster.properties;

                  if (isCluster) return null;

                  const submission = allData.uploads.find(
                    (sub) => sub.id === cluster.properties.submissionId
                  );

                  return (
                    <Marker
                      key={cluster.properties.submissionId}
                      latitude={latitude}
                      longitude={longitude}
                      color={getHex(submission!.rating)}
                      onClick={() =>
                        handleMarkerClick(longitude, latitude, submission)
                      }
                    />
                  );
                })}

              {/* Then render all clusters on top */}
              {supercluster
                .getClusters(
                  [-180, -85, 180, 85] as BBox,
                  Math.floor(viewState.zoom)
                )
                .map((cluster) => {
                  const [longitude, latitude] = cluster.geometry.coordinates;
                  const { cluster: isCluster, point_count } =
                    cluster.properties;

                  if (!isCluster) return null;

                  return (
                    <Marker
                      key={`cluster-${cluster.id}`}
                      latitude={latitude}
                      longitude={longitude}
                      onClick={() => handleClusterClick(longitude, latitude)}
                    >
                      <div className="cluster-marker backdrop-blur-xs">
                        {point_count}
                      </div>
                    </Marker>
                  );
                })}
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
              <div className="relative w-full h-full rounded-lg overflow-hidden group">
                <img
                  src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${selectedSubmission.image_id}/public`}
                  alt={selectedSubmission.city}
                  className="object-cover w-full max-h-full group-hover:scale-105 duration-150 select-none"
                  onClick={() =>
                    setImgModal(
                      `https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${selectedSubmission.image_id}/public`
                    )
                  }
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
                  onMouseDown={() => setSelectedSubmission(undefined)}
                >
                  x
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

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-400 backdrop-blur-sm ${
          imgModal ? "visible bg-black/80" : "invisible"
        }`}
        onClick={() => setImgModal(null)}
      >
        <div
          className={`relative max-w-[90vw] max-h-[90vh] transition-all duration-400 ${
            imgModal ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`absolute -top-4 -left-4 h-8 w-8 bg-red-600 hover:bg-red-700 rounded-full text-white font-bold transition-colors duration-200 ${
              imgModal ? "visible" : "hidden"
            }`}
            onClick={() => setImgModal(null)}
          >
            ×
          </button>
          {imgModal && (
            <img
              src={imgModal}
              alt="Modal content"
              className="rounded-lg shadow-2xl max-w-full max-h-[90vh] object-contain"
            />
          )}
        </div>
      </div>
    </div>
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

function getHex(rating: number): string {
  if (rating <= 10) return "#b91c1c";
  if (rating <= 20) return "#dc2626";
  if (rating <= 30) return "#ef4444";
  if (rating <= 45) return "#f97316";
  if (rating <= 60) return "#fb923c";
  if (rating <= 70) return "#eab308";
  if (rating <= 80) return "#84cc16";
  if (rating <= 85) return "#22c55e";
  if (rating <= 95) return "#16a34a";
  return "#047857";
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
