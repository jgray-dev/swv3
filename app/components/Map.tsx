import { useRouteLoaderData } from "@remix-run/react";
import { Map, Marker } from "pigeon-maps";
import { useState, useMemo } from "react";
import Supercluster from "supercluster";
import { LoaderData } from "~/.server/interfaces";

export default function MapComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [selectedUpload, setSelectedUpload] = useState<
    (typeof allData.uploads)[0] | null
  >(null);
  const [center, setCenter] = useState([allData?.lat || 0, allData?.lon || 0]);
  const [zoom, setZoom] = useState(10);
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(
    null
  );

  // Create supercluster instance
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 40,
      maxZoom: 16,
    });

    if (allData?.uploads) {
      const points = allData.uploads.map((upload) => ({
        type: "Feature",
        properties: { upload },
        geometry: {
          type: "Point",
          coordinates: [upload.lon, upload.lat],
        },
      }));

      cluster.load(points);
    }
    return cluster;
  }, [allData?.uploads]);

  // Get clusters based on current map view
  const clusters = useMemo(() => {
    if (!bounds || !supercluster) return [];
    return supercluster.getClusters(
      [bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0]],
      Math.floor(zoom)
    );
  }, [bounds, zoom, supercluster]);

  if (!allData?.ok) return null;

  const handleMarkerClick = (
    cluster: Supercluster.ClusterFeature | Supercluster.PointFeature
  ) => {
    if (cluster.properties.cluster) {
      // Handle cluster click - zoom into cluster
      const [lon, lat] = cluster.geometry.coordinates;
      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(cluster.properties.cluster_id),
        16
      );
      setCenter([lat, lon]);
      setZoom(expansionZoom - 3);
    } else {
      // Handle single marker click
      const upload = cluster.properties.upload;
      setSelectedUpload(upload);
      setCenter([upload.lat, upload.lon]);
      setZoom(13);
    }
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
          onBoundsChanged={({bounds: {ne, sw}}) => {
            setBounds([[sw[0], sw[1]], [ne[0], ne[1]]]);
          }}
        >
          {clusters.map((cluster) => {
            const [longitude, latitude] = cluster.geometry.coordinates;
            const isCluster = cluster.properties.cluster;
            const pointCount = cluster.properties.point_count;

            return (
              <Marker
                key={`${latitude}-${longitude}-${isCluster ? 'cluster' : 'point'}`}
                width={isCluster ? 60 : 50}
                anchor={[latitude, longitude]}
                onClick={() => handleMarkerClick(cluster)}
                aria-label={
                  isCluster
                    ? `Cluster of ${pointCount} locations`
                    : `View location at ${latitude}, ${longitude}`
                }
              >
                {isCluster && (
                  <div
                    className="bg-white/80 backdrop-blur-sm rounded-full w-full h-full flex items-center justify-center font-bold text-black">
                    {pointCount}
                  </div>
                )}
              </Marker>
            );
          })}
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
            <div className={"text-center text-xl w-full pt-4"}>
              {selectedUpload.city}
            </div>
            <img
              src={selectedUpload.image_url}
              alt={`Unable to load image`}
              className="object-contain w-full h-full p-4 rounded-lg"
              loading="lazy"
            />
            <button
              onClick={() => setSelectedUpload(null)}
              className="absolute top-2 right-2  rounded-full h-8 w-8 bg-white/20 backdrop-blur-smborder border-white/10hover:bg-white/30 active:bg-white/10transition-all duration-200"
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