"use client";

export default function TurnstileComponent() {
  return (
    <div className={"w-screen flex items-center justify-center"}>
      <div
        className="cf-turnstile"
        data-sitekey="yourSitekey"
        data-callback="javascriptCallback"
      ></div>
    </div>
  );
}
