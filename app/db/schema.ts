import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const uploads = sqliteTable("uploads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  rating: integer("rating").notNull(),
  image_id: text("image_id").notNull(),
  time: integer("time").notNull(),
  city: text("city").notNull(),
  data: text("data").notNull(),
  type: text("type").notNull(),
});


export const analytics = sqliteTable("analytics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  time: integer("time").default(Date.now()),
  ip_address: text("ip_address").notNull(),
  ray_id: text("ray_id").notNull(),
  location: text("location").notNull(),
  cumulative_clicks: integer("cumulative_clicks").notNull().default(0)
});