import { LoaderFunction } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { analytics } from "~/db/schema";
import { desc } from "drizzle-orm/sql/expressions/select";
import { eq } from "drizzle-orm";

export const loader: LoaderFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  const qrId = url.searchParams.get("id");

  if (!targetUrl || !qrId) {
    console.error({ error: "Missing required parameters" });
    return redirect("/");
  }
  try {
    const db = drizzle(context.cloudflare.env.swv3_d1);
    const location = url.searchParams.get("city");

    const currentClicks = await db
      .select({ clicks: analytics.cumulative_clicks })
      .from(analytics)
      .where(eq(analytics.location, location ? location : "Undefined location"))
      .orderBy(desc(analytics.time))
      .limit(1);

    const newClickCount =
      currentClicks.length > 0 ? currentClicks[0].clicks + 1 : 1;

    const result = await db.insert(analytics).values({
      ip_address: "asd",
      ray_id: "asd",
      location: location ? location : "Undefined location",
      cumulative_clicks: newClickCount,
    });

    console.log("(analytics) logged click");

    console.log(`(analytics) logged click ${result}`);
    return redirect(targetUrl);
  } catch (error) {
    console.error("Error logging QR scan:", error);
    // Still redirect even if logging fails
    return redirect(targetUrl);
  }
};
