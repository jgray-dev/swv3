import {useRouteLoaderData} from "@remix-run/react";
import {LoaderData} from "~/.server/interfaces";

export default function LocationDisplay() {

  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData) return null;

  return (<div className={"text-center text-2xl md:text-3xl w-screen mx-auto h-16 text-white"}>{allData.city}</div>)
}