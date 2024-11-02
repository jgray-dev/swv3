import type { LinksFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import "./tailwind.css";
import React from "react";

export const links: LinksFunction = () => [
  {
    rel: "prefetch",
    href: "/fonts/Inter-VariableFont_opsz,wght.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <script
          src={"https://challenges.cloudflare.com/turnstile/v0/api.js"}
          defer
        ></script>
        <Meta />
        <Links />
      </head>
      <body className={"text-white"}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
