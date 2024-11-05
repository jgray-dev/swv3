import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker } from "pigeon-maps";
import { useState } from "react";
import { LoaderData } from "~/.server/interfaces";

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [selectedUpload, setSelectedUpload] = useState<
    (typeof allData.uploads)[0] | null
  >(null);
  const [center, setCenter] = useState([allData?.lat || 0, allData?.lon || 0]);
  const [zoom, setZoom] = useState(12);

  if (!allData?.ok) return null;

  const handleMarkerClick = (upload: (typeof allData.uploads)[0]) => {
    // Set the selected upload for image display
    setSelectedUpload(upload);
    // Animate to new position
    setCenter([upload.lat, upload.lon]);
    setZoom(15); // Zoom in closer to the selected location
  };

  return (
    <div className="w-full space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 p-4">
      <div
        className="w-full h-[400px] md:h-[600px] rounded-lg overflow-hidden shadow-lg"
        role="region"
        aria-label="Interactive location map"
      >
        <Map
          center={center as [number, number]}
          zoom={zoom}
          animate={true}
          defaultCenter={[allData.lat, allData.lon]}
          defaultZoom={12}
        >
          {allData.uploads.map((upload, index) => (
            <Marker
              key={index}
              width={50}
              anchor={[upload.lat, upload.lon]}
              onClick={() => handleMarkerClick(upload)}
              role="button"
              aria-label={`View location at ${upload.lat}, ${upload.lon}`}
            />
          ))}
        </Map>
      </div>

      <div
        className="w-full h-[400px] md:h-[600px] rounded-lg overflow-hidden flex items-center justify-center 
  bg-white/10 
  border 
  border-white/20"
        role="region"
        aria-label="Selected location image"
      >
        {selectedUpload ? (
          <div className="relative w-full h-full">
            <span className={"text-center text-xl"}>{selectedUpload.city}</span>
            <img
              src={selectedUpload.image_url}
              alt={`Unable to load image`}
              className="object-contain w-full h-full"
              loading="lazy"
            />
            <button
              onClick={() => setSelectedUpload(null)}
              className="absolute top-2 right-2  rounded-full h-8 w-8
  bg-white/20 
  backdrop-blur-sm
  border 
  border-white/10
  hover:bg-white/30 
  active:bg-white/10
  transition-all 
  duration-200"
              aria-label="Close image"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            Select a location marker to view the image
          </div>
        )}
      </div>
    </div>
  );
}
