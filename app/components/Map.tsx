import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker, Overlay, ZoomControl } from "pigeon-maps";
import { dbUpload, LoaderData } from "~/.server/interfaces";
import { useEffect, useState } from "react";

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [currentZoom, setCurrentZoom] = useState<number>(9);
  const [selectedSubmission, setSelectedSubmission] = useState<dbUpload | null>(
    null
  );
  const [currentLocation, setCurrentLocation] = useState<number[]>(
    allData?.lat && allData?.lon
      ? [allData.lat, allData.lon]
      : [40.7128, -74.006]
  );
  useEffect(() => {
    console.log(selectedSubmission);
  }, [selectedSubmission]);

  useEffect(() => {
    setCurrentLocation(
      allData?.lat && allData?.lon
        ? [allData.lat, allData.lon]
        : [40.7128, -74.006]
    );
  }, [allData]);

  if (!allData?.ok) return null;
  return (
    <div className={"max-w-screen flex justify-center mx-2"}>
      <div
        className="md:w-1/2 w-full h-[400px] md:h-[600px] rounded-lg overflow-hidden shadow-lg"
        role="region"
        aria-label="Interactive location map"
      >
        <Map
          // @ts-ignore
          center={currentLocation}
          animate={true}
          defaultCenter={[allData.lat, allData.lon]}
          defaultZoom={9}
          onBoundsChanged={({ zoom }) => {
            setCurrentZoom(zoom);
          }}
        >
          <ZoomControl />
          {currentZoom > 10
            ? allData.uploads.map((sub) => (
                <Overlay
                  anchor={[sub.lat, sub.lon]}
                  key={sub.time}
                  offset={[64, 64]}
                >
                  <button onClick={() => setSelectedSubmission(sub)}>
                    <img
                      src={`https://imagedelivery.net/owAW_Q5wZODBr4c43A0cEw/${sub.image_id}/thumbnail`}
                      alt={sub.city}
                      className={"max-w-32 aspect-auto rounded-lg"}
                    />
                  </button>
                </Overlay>
              ))
            : allData.uploads.map((sub) => (
                <Marker
                  anchor={[sub.lat, sub.lon]}
                  key={sub.time}
                  onClick={() => setSelectedSubmission(sub)}
                />
              ))}
        </Map>
      </div>
    </div>
  );
}
