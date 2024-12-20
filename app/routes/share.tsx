import { LoaderFunction } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { analytics } from "~/db/schema";
import { eq, sql } from "drizzle-orm";

export const loader: LoaderFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.searchParams);

  // Get the method parameter
  const method = searchParams.get("method");
  console.log(`tracking link found. method ${method}`);
  // Remove the method parameter for the redirect URL
  searchParams.delete("method");

  const redirectUrl = `/?${searchParams.toString()}`;
  const ip = request.headers.get("CF-Connecting-IP");
  const ray = request.headers.get("CF-Ray");
  const location = url.searchParams.get("city");

  if (!url || !ip || !ray || !location) {
    console.error("Missing required parameters for analytical logging");
    return redirect(redirectUrl);
  }

  const redirectResponse = redirect(redirectUrl);
  context.cloudflare.ctx.waitUntil(
    (async () => {
      try {
        const db = drizzle(context.cloudflare.env.swv3_d1);
        const [clickCount] = await db
          .select({ count: sql`count(*)` })
          .from(analytics)
          .where(eq(analytics.location, location));

        await db.insert(analytics).values({
          time: Math.floor(Date.now() / 1000),
          ip_address: ip,
          ray_id: ray,
          location: location,
          method: method || "unknown", // Add the method to the analytics
          cumulative_clicks: Number(clickCount?.count ?? 0) + 1,
        });
      } catch (error) {
        console.error("Error logging analytics link:", error);
      }
    })()
  );

  return redirectResponse;
};
