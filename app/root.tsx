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

import { datadogRum } from "@datadog/browser-rum";

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
  datadogRum.init({
    applicationId: "2d0dcfb4-e52c-4123-8899-2eb2da9ea804",
    clientToken: "pub8caa44c4e938e0c8e06ec84e0a0bbf8e",
    site: "us5.datadoghq.com",
    service: "swv3",
    env: "production",
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask-user-input",
  });
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <script
          src={"https://challenges.cloudflare.com/turnstile/v0/api.js"}
          defer
        ></script>
        <Meta />
        <Links />
        <title></title>
      </head>
      <body className={"text-white"}>
      {children}
      <ScrollRestoration/>
      <Scripts/>
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet/>;
}
