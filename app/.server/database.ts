import { drizzle } from "drizzle-orm/d1";
import { uploads } from "~/db/schema";
import { sql } from "drizzle-orm";
import { DbUpload } from "~/.server/interfaces";

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
    time
  }: {
    lat: number;
    lon: number;
    rating: number;
    image_id: string;
    city: string;
    data: any;
    time: number;
  }
) {
  try {
    const db = drizzle(context.cloudflare.env.swv3_d1);
    const result = await db
      .insert(uploads)
      .values({
        lat: lat,
        lon: lon,
        rating: rating,
        image_id: image_id,
        time: time,
        city: city,
        data: data,
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
  } = {}
): Promise<DbUpload[] | null> {
  try {
    const db = drizzle(context.cloudflare.env.swv3_d1);
    const query = db
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
      .orderBy(sql`distance_km`);

    return await query.limit(50);
  } catch (error) {
    console.error("Database error:", error);
    throw new Error(`Database error: ${error}`);
  }
}
