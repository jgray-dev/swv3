import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData } from "~/.server/interfaces";



export default function Map() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData?.ok || !allData.uploads) return null;


  return (
    <div className={"w-screen min-h-screen bg-green/10"}>
    </div>
  );
}