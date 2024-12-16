import { LoaderFunction } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/react";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  return redirect(`/?${searchParams.toString()}`);
};
