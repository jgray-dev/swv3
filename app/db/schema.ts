import {blob, integer, sqliteTable, text} from "drizzle-orm/sqlite-core";


export const uploads = sqliteTable("uploads", {
  id: integer("id").primaryKey().notNull(),
  lat: integer("lat").notNull(),
  lon: integer("lon").notNull(),
  rating: integer("rating").notNull(),
  image_url: text("image_url").notNull(),
  time: blob("time", { mode: 'bigint' }).notNull()
});
