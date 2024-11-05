import { drizzle } from "drizzle-orm/d1";
import {uploads} from "~/db/schema";


// Database interaction function
export async function createUpload(context: any, {
  lat,
  lon,
  rating,
  imageUrl
}: {
  lat: number;
  lon: number;
  rating: number;
  imageUrl: string;
}) {
  try {
    const db = drizzle(context.cloudflare.env.swv3_d1);

    const result = await db
      .insert(uploads)
      .values({
        lat: Math.round(lat),
        lon: Math.round(lon),
        rating: rating,
        image_url: imageUrl,
        time: Math.floor(Date.now() / 1000) // Store as regular integer
      })
      .returning();

    return { success: true, data: result };
  } catch (error) {
    console.error("Database error:", error);
    throw new Error("Failed to create upload record");
  }
}