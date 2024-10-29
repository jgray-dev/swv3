import { useRouteLoaderData } from "@remix-run/react";
import {LoaderData} from "~/.server/interfaces";

export function Details() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData) return null
  // console.log(allData)
  return (
    <div>
      Details component here. Lat: {allData.lat}, Lon: {allData.lon}
    </div>
  );
}
