import { useRouteLoaderData } from "@remix-run/react";

export function Details() {
  const data = useRouteLoaderData("routes/_index");
  console.log(data);
  if (!data) return null;
  return (
    <div>
      Details component here. Lat: {data.lat}, Lon: {data.lon}
    </div>
  );
}
