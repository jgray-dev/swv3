import { LoaderFunction } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { analytics } from "~/db/schema";
import { desc } from "drizzle-orm/sql/expressions/select";
import { eq } from "drizzle-orm";

export const loader: LoaderFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const redirectUrl = `/?${searchParams.toString()}`;
  const ip = request.headers.get("CF-Connecting-IP");
  const ray = request.headers.get("CF-Ray");
  const location = url.searchParams.get("city");

  if (!url || !ip || !ray || !location) {
    console.error("(error): Missing required parameters");
    return redirect("/");
  }

  const redirectResponse = redirect(redirectUrl);

  context.cloudflare.ctx.waitUntil(
    (async () => {
      try {
        const db = drizzle(context.cloudflare.env.swv3_d1);

        // First get the last click count
        const [lastClick] = await db
          .select({ clicks: analytics.cumulative_clicks })
          .from(analytics)
          .where(eq(analytics.location, location))
          .orderBy(desc(analytics.time))
          .limit(1);

        // Then insert the new record
        await db.insert(analytics).values({
          ip_address: ip,
          ray_id: ray,
          location: location,
          cumulative_clicks: (lastClick?.clicks ?? 0) + 1,
        });

        console.log("ip", ip);
        console.log("ray", ray);
      } catch (error) {
        console.error("Error logging QR scan:", error);
      }
    })()
  );

  return redirectResponse;
};
