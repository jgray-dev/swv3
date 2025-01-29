import { and, between, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { DbUpload } from "~/.server/interfaces";
import { uploads } from "~/db/schema";

export async function deleteUpload(context: any, id: number): Promise<boolean> {
  const db = drizzle(context.cloudflare.env.swv3_d1);
  const deleted = await db
    .delete(uploads)
    .where(eq(uploads.id, id))
    .returning()
    .execute();

  return deleted.length > 0;
}

// Database interaction function
export async function createUpload(
  context: any,
  {
    lat,
    lon,
    rating,
    image_id,
    city,
    data,
    time,
    type,
  }: {
    lat: number;
    lon: number;
    rating: number;
    image_id: string;
    city: string;
    data: any;
    time: number;
    type: string;
  },
) {
  try {
    const db = drizzle(context.cloudflare.env.swv3_d1);
    const MAX_ATTEMPTS = 15;
    const SPREAD_DISTANCE = 0.0004;
    const searchAngle = Math.random() * 2 * Math.PI;

    let attempts = 0;
    let newLat = lat;
    let newLon = lon;
    let foundValidPosition = false;

    while (!foundValidPosition && attempts < MAX_ATTEMPTS) {
      const currentDistance = SPREAD_DISTANCE * (attempts + 1);
      newLat = lat + Math.sin(searchAngle) * currentDistance;
      newLon = lon + Math.cos(searchAngle) * currentDistance;
      const nearby = await db
        .select()
        .from(uploads)
        .where(
          and(
            between(
              uploads.lat,
              newLat - SPREAD_DISTANCE,
              newLat + SPREAD_DISTANCE,
            ),
            between(
              uploads.lon,
              newLon - SPREAD_DISTANCE,
              newLon + SPREAD_DISTANCE,
            ),
          ),
        );

      foundValidPosition = nearby.length === 0;
      attempts++;
    }

    const result = await db
      .insert(uploads)
      .values({
        lat: foundValidPosition ? newLat : lat,
        lon: foundValidPosition ? newLon : lon,
        rating: rating,
        image_id: image_id,
        time: time,
        city: city,
        data: data,
        type: type,
      })
      .returning();

    return { success: true, data: result };
  } catch (error) {
    console.error("Database error:", error);
    throw new Error("Failed to create upload record");
  }
}

export async function getSubmissions(
  context: any,
  {
    lat = 40.7128,
    lon = -74.006,
  }: {
    lat?: number;
    lon?: number;
  } = {},
): Promise<DbUpload[] | null> {
  try {
    const db = drizzle(context.cloudflare.env.swv3_d1);
    return await db
      .select({
        id: uploads.id,
        lat: uploads.lat,
        lon: uploads.lon,
        rating: uploads.rating,
        image_id: uploads.image_id,
        time: uploads.time,
        city: uploads.city,
        data: uploads.data,
        distance: sql<number>`
          ROUND(
            (6371 * acos(
              cos(radians(${lat})) *
              cos(radians(${uploads.lat})) *
              cos(radians(${uploads.lon}) - radians(${lon})) +
              sin(radians(${lat})) *
              sin(radians(${uploads.lat}))
            )),
            2
          ) as distance_km
        `,
      })
      .from(uploads)
      .orderBy(sql`distance_km`)
      .limit(50);
  } catch (error) {
    console.error("Database error:", error);
    throw new Error(`Database error: ${error}`);
  }
}
