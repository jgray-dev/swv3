import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker, Overlay, ZoomControl } from "pigeon-maps";
import { LoaderData } from "~/.server/interfaces";
import { useState } from "react";

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [currentZoom, setCurrentZoom] = useState<number>(9);
  if (!allData?.ok) return null;
  console.log(currentZoom);
  return (
    <div
      className="w-full h-[400px] md:h-[600px] rounded-lg overflow-hidden shadow-lg"
      role="region"
      aria-label="Interactive location map"
    >
      <Map
        center={[allData.lon, allData.lat]}
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
              <Overlay anchor={[sub.lat, sub.lon]} key={sub.time} offset={[64, 60]}>
                <img src={'https://pub-873a5cd8dd304eed8d893737ad943799.r2.dev/1730772533067-w9uawk.jpg'} alt={sub.city} className={"max-w-32 aspect-auto"}/>
              </Overlay>
            ))
          : allData.uploads.map((sub) => (
              <Marker anchor={[sub.lat, sub.lon]} key={sub.time}></Marker>
            ))}
      </Map>
    </div>
  );
}
