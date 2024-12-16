import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData } from "~/.server/interfaces";

export default function LocationDisplay() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData?.ok) return null;

  return (
    <div
      className={
        "text-center text-2xl md:text-3xl min-h-fit w-screen mx-auto h-16 text-white"
      }
      role="heading"
      aria-label={`Current city: ${allData.city}`}
      aria-level={1}
      onClick={() => console.log(allData.trackingLink)}
    >
      {allData.city}
    </div>
  );
}
