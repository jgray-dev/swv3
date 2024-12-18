// import type {LoaderFunction} from "@remix-run/node";
// import {WeatherEvent} from "~/routes/api.image";
// import {useLoaderData} from "react-router";
// import Widget from "~/components/Widget";
//
// export const loader: LoaderFunction = async () => {
//   let resp = await fetch(
//     "http://73.89.39.80:3000/api/rating?lat=41.8781136&lon=-87.6297982&city=Chicago%2C+IL%2C+US&date=next&type=next"
//   );
//
//   if (!resp.ok) {
//     throw new Error(`HTTP error! status: ${resp.status}`);
//   }
//
//   return (await resp.json()) as WeatherEvent;
// }
//
//
// export default function WidgetRoute() {
//   const data = useLoaderData() as WeatherEvent
//   return <Widget data={data} />
// }