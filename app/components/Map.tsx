import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker } from "pigeon-maps";
import { useState, useMemo } from "react";
import { LoaderData } from "~/.server/interfaces";

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  // @ts-ignore
  const [selectedUpload, setSelectedUpload] = useState<
    (typeof allData.uploads)[0] | null
  >(null);
  const [center, setCenter] = useState([allData?.lat || 0, allData?.lon || 0]);
  const [zoom, setZoom] = useState(10);
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(
    null
  );

  // Function to check if a point is within current bounds
  const isPointInBounds = (lat: number, lon: number) => {
    if (!bounds) return false;
    const [[swLat, swLon], [neLat, neLon]] = bounds;
    return lat >= swLat && lat <= neLat && lon >= swLon && lon <= neLon;
  };

  // Get visible and sorted uploads
  const visibleUploads = useMemo(() => {
    if (!allData?.uploads || !bounds) return [];

    return allData.uploads
      .filter(upload => isPointInBounds(upload.lat, upload.lon))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }, [allData?.uploads, bounds]);

  if (!allData?.ok) return null;

  const handleMarkerClick = (upload: typeof allData.uploads[0]) => {
    setSelectedUpload(upload);
    setCenter([upload.lat, upload.lon]);
    setZoom(13);
  };

  return (
    <div className="w-full space-y-4 md:space-y-0 md:grid md:grid-cols-[2fr,1fr] md:gap-4 p-4">
      <div className="space-y-4">
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
            onBoundsChanged={({bounds: {ne, sw}}) => {
              setBounds([[sw[0], sw[1]], [ne[0], ne[1]]]);
            }}
          >
            {allData.uploads.map((upload) => (
              <Marker
                key={`${upload.lat}-${upload.lon}-${upload.id}`}
                width={50}
                anchor={[upload.lat, upload.lon]}
                onClick={() => handleMarkerClick(upload)}
                aria-label={`View location at ${upload.lat}, ${upload.lon}`}
              />
            ))}
          </Map>
        </div>

        {/* Visible uploads list - mobile only */}
        <div className="md:hidden">
          <VisibleUploadsList
            uploads={visibleUploads}
            onUploadSelect={handleMarkerClick}
            selectedUpload={selectedUpload}
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Selected upload view */}
        <div
          className="w-full h-[400px] md:h-[300px] rounded-lg overflow-hidden flex items-center justify-center 
          bg-white/10 border border-white/20"
          role="region"
          aria-label="Selected location image"
        >
          {selectedUpload ? (
            <div className="relative w-full h-full">
              <div className="text-center text-xl w-full pt-4">
                {selectedUpload.city}
              </div>
              <img
                src={selectedUpload.image_url}
                alt={`Sunset/sunrise in ${selectedUpload.city}`}
                className="object-contain w-full h-full p-4 rounded-lg"
                loading="lazy"
              />
              <button
                onClick={() => setSelectedUpload(null)}
                className="absolute top-2 right-2 rounded-full h-8 w-8 bg-white/20 backdrop-blur-sm border border-white/10 hover:bg-white/30 active:bg-white/10 transition-all duration-200"
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

        {/* Visible uploads list - desktop only */}
        <div className="hidden md:block h-[280px] overflow-y-auto">
          <VisibleUploadsList
            uploads={visibleUploads}
            onUploadSelect={handleMarkerClick}
            selectedUpload={selectedUpload}
          />
        </div>
      </div>
    </div>
  );
}

// Separate component for the uploads list
function VisibleUploadsList({
                              uploads,
                              onUploadSelect,
                              selectedUpload
                            }: {
  uploads: LoaderData['uploads'],
  onUploadSelect: (upload: LoaderData['uploads'][0]) => void,
  selectedUpload: LoaderData['uploads'][0] | null
}) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Visible Locations ({uploads.length})</h2>
      <div className="space-y-2">
        {uploads.map((upload) => (
          <button
            key={upload.id}
            onClick={() => onUploadSelect(upload)}
            className={`w-full text-left p-2 rounded-lg transition-colors
              ${selectedUpload?.id === upload.id
              ? 'bg-white/20'
              : 'hover:bg-white/10'}`}
          >
            <div className="flex justify-between items-center">
              <span>{upload.city}</span>
              <span className="text-sm opacity-75">Rating: {upload.rating}/100</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}