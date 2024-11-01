import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData } from "~/.server/interfaces";
import { GoAlert } from "react-icons/go";

export default function Alert() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData?.message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={
        "text-red-400 font-bold w-screen text-center text-wrap px-4 mb-2 min-h-fit max-h-fit mx-auto flex justify-center"
      }
    >
      <GoAlert className={"stroke-red-400 mr-3 h-6 w-6"} aria-hidden="true" />
      <span>{allData.message}</span>
    </div>
  );
}
