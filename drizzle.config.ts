import { defineConfig } from "drizzle-kit";

//@ts-ignore
export default defineConfig({
  dialect: "sqlite",
  schema: "./app/db/schema.ts",
});
