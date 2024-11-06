import {blob, integer, real, sqliteTable, text} from "drizzle-orm/sqlite-core";

export const uploads = sqliteTable("uploads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  rating: integer("rating").notNull(),
  image_id: text("image_id").notNull(),
  time: integer("time").notNull(),
  city: text("city").notNull(),
  data: text("data").notNull()
});
