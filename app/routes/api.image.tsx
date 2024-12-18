import type { LoaderFunction } from "@remix-run/node";
import { renderToString } from "react-dom/server";
import puppeteer from "puppeteer";

// Your React component to render as image
const ImageComponent = () => {
  return (
    <div style={{
    width: "500px",
      height: "300px",
      background: "white",
      padding: "20px"
  }}>
  <h1>Hello, this will be an image!</h1>
  {/* Add your component content here */}
  </div>
);
};

export const loader: LoaderFunction = async () => {
  try {
    // Render React component to HTML string
    const html = renderToString(<ImageComponent />);

    // Wrap the component HTML in a full HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            /* Add any necessary styles */
            body { margin: 0; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;

    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: "new"
    });
    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: 500,
        height: 300
      }
    });

    await browser.close();

    // Return the image with appropriate headers
    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": screenshot.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });

  } catch (error) {
    console.error("Error generating image:", error);
    return new Response("Error generating image", { status: 500 });
  }
};