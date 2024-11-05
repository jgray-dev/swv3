import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const uploads = sqliteTable("uploads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  rating: integer("rating").notNull(),
  image_url: text("image_url").notNull(),
  time: integer("time").notNull(),
  city: text("city").notNull(),
});
