import { useRouteLoaderData } from "@remix-run/react";
import { Map, Overlay } from "pigeon-maps";
import { LoaderData } from "~/.server/interfaces";

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData?.ok) return null;
  return (
    <div className="w-full h-[400px] md:h-[600px] rounded-lg overflow-hidden shadow-lg"
         role="region"
         aria-label="Interactive location map">
      <Map
        center={[allData.lon, allData.lat]}
        animate={true}
        defaultCenter={[allData.lat, allData.lon]}
        defaultZoom={12}
      >
        {allData.uploads.map((sub) => {
          return (
            <Overlay anchor={[sub.lat, sub.lon]} key={sub.time}>
              <img src={sub.image_url} alt={sub.city} />
            </Overlay>
          );
        })}
      </Map>
    </div>
  );
}
