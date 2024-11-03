import {useRouteLoaderData} from "@remix-run/react";
import {LoaderData} from "~/.server/interfaces";
import {Suspense} from "react";
import {Await} from "react-router";

export default function Visualize() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index")
  if (!allData?.secondaryData) return null
  return (
    <Suspense fallback={<div>Loading map...</div>}>
      <Await
        resolve={allData.secondaryData}
        errorElement={<div>Error loading map</div>}
      >
        {allData.secondaryData && <div>WE HAVE DATA</div>}
        
      </Await>
    </Suspense>
  );
}

