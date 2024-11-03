import {integer, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {blob} from "drizzle-orm/sqlite-core/columns/blob";


export const uploads = sqliteTable("uploads", {
  id: integer("id").primaryKey().notNull(),
  lat: integer("lat").notNull(),
  lon: integer("lon").notNull(),
  data: blob("data").notNull(),
  image_url: text("image_url").notNull()
});
