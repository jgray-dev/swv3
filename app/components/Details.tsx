import { useRouteLoaderData } from "@remix-run/react";

export function Details() {
  const data = useRouteLoaderData("routes/_index");
  console.log(data);
  if (!data) return null;
  return (
    <div>
      <button
        onClick={() => {
          console.log(useRouteLoaderData("routes/_index"));
        }}
      >
        CHECK DATA
      </button>
      Details component here. Lat: {data.lat}, Lon: {data.lon}
    </div>
  );
}
