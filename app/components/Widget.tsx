// import {WeatherEvent} from "~/routes/api.image";
//
//
// interface WidgetProps {
//   data: WeatherEvent
// }
// export default function Widget({data}: WidgetProps) {
//   console.log(data)
//   if (!data.ok) return null;
//
//   const radius = 40;
//   const circumference = 2 * Math.PI * radius;
//   const progress = (data.rating / 100) * circumference;
//   const dashOffset = circumference - progress;
//
//   const getColor = (rating: number) => {
//     if (rating <= 10) return "stroke-red-700";
//     if (rating <= 20) return "stroke-red-600";
//     if (rating <= 30) return "stroke-red-500";
//     if (rating <= 45) return "stroke-orange-500";
//     if (rating <= 60) return "stroke-orange-400";
//     if (rating <= 70) return "stroke-yellow-500";
//     if (rating <= 80) return "stroke-lime-500";
//     if (rating <= 85) return "stroke-green-500";
//     if (rating <= 95) return "stroke-green-600";
//     return "stroke-emerald-700";
//   };
//
//   return (
//     <div className="bg-white/10 border border-white/20 w-[36rem] rounded-lg flex">
//       <div className="basis-1/3 aspect-square m-3 relative flex flex-col items-center justify-center">
//         <svg
//           className="w-32 h-32 -rotate-90"
//           viewBox="0 0 100 100"
//         >
//           {data.rating < 100 && (
//             <circle
//               cx="50"
//               cy="50"
//               r={radius}
//               fill="none"
//               stroke="black"
//               strokeWidth="2"
//               strokeDasharray="4,4"
//               className="opacity-10"
//             />
//           )}
//           <circle
//             cx="50"
//             cy="50"
//             r={radius}
//             fill="none"
//             strokeWidth="4"
//             className={getColor(data.rating)}
//             strokeDasharray={circumference}
//             strokeDashoffset={dashOffset}
//             strokeLinecap="round"
//           />
//         </svg>
//         <div className="absolute flex items-center justify-center">
//           <span className="text-4xl font-bold">
//             {data.rating}
//           </span>
//         </div>
//       </div>
//       <div className="flex-1 border-l border-white/10 p-4">
//         <div className="text-sm space-y-1">
//           <div>{data.stats.cloud_cover}% cover</div>
//           <div>{data.stats.freezing_height.toLocaleString()}ft</div>
//           <div>{data.stats.temperature}° | {data.eventString}</div>
//         </div>
//       </div>
//     </div>
//   );
// }
