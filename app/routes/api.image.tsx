// import type { LoaderFunction } from "@remix-run/node";
// import { renderToString } from "react-dom/server";
// import puppeteer from "puppeteer";
// import Widget from "~/components/Widget";
//
// export interface WeatherEvent {
//   lat: number;
//   lon: number;
//   city: string;
//   eventType: string;
//   rating: number;
//   stats: {
//     cloud_cover: number;
//     high_clouds: number;
//     mid_clouds: number;
//     low_clouds: number;
//     visibility: number;
//     temperature: number;
//     zone: string;
//     freezing_height: number;
//   };
//   eventString: string;
//   eventDate: string;
//   ok: boolean;
//   data?: WeatherEvent;
// }
//
// export const loader: LoaderFunction = async () => {
//   let browser;
//   try {
//     // Fetch data
//     let resp = await fetch(
//       "http://73.89.39.80:3000/api/rating?lat=41.8781136&lon=-87.6297982&city=Chicago%2C+IL%2C+US&date=next&type=next"
//     );
//
//     if (!resp.ok) {
//       throw new Error(`HTTP error! status: ${resp.status}`);
//     }
//
//     let data = (await resp.json()) as WeatherEvent;
//     const html = renderToString(<Widget data={data} />);
//
//     // Wrap the component HTML in a full HTML document
//     const fullHtml = `
//       <!DOCTYPE html>
//       <html lang="en">
//         <head>
//           <style>
//             body { margin: 0; }
//           </style>
//           <title>asd</title>
//         </head>
//         <body>${html}</body>
//       </html>
//     `;
//
//     // Launch headless browser with proper configuration
//     browser = await puppeteer.launch({
//       args: ['--no-sandbox', '--disable-setuid-sandbox']
//     });
//
//     const page = await browser.newPage();
//
//     // Set content and wait for it to load
//     await page.setContent(fullHtml, { waitUntil: "networkidle0" });
//
//     // Take screenshot
//     const screenshot = await page.screenshot({
//       type: "png",
//       clip: {
//         x: 0,
//         y: 0,
//         width: 500,
//         height: 300,
//       },
//     });
//
//     // Return the image with appropriate headers
//     return new Response(screenshot, {
//       headers: {
//         "Content-Type": "image/png",
//         "Content-Length": screenshot.length.toString(),
//         "Cache-Control": "public, max-age=31536000",
//       },
//     });
//   } catch (error) {
//     console.error("Error generating image:", error);
//     return new Response("Error generating image", { status: 500 });
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// };
