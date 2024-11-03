import type { ActionFunction } from "@remix-run/cloudflare";
import { LoaderFunction } from "@remix-run/router";
import { Link } from "@remix-run/react";
import React from "react";
import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/d1";

export const loader: LoaderFunction = async ({ context, request }) => {
  const db = drizzle(context.cloudflare.env.swv3_d1, { schema });
  console.log(await context.cloudflare.env.swv3_d1.prepare("SELECT * FROM uploads LIMIT 5").all())
  // console.log(await db.query.uploads.findMany());

  // const uploads = await db.query.uploads.findMany();
  // console.log(uploads);
  // return uploads;
  return 0;
};

export const action: ActionFunction = async ({ request, context }) => {};
export default function Map() {
  return (
    <div className={"w-screen min-h-screen blob overflow-x-hidden"}>
      <div className={"w-screen text-center mx-auto"}>
        <Link to={"/"} className={"text-white/50 text-xs cursor-pointer"}>
          SWV3
        </Link>
      </div>
    </div>
  );
}
