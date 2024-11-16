"use client";

export default function TurnstileComponent() {
  return (
    <div className={"w-screen flex items-center justify-center"}>
      <div
        className="cf-turnstile"
        data-sitekey="0x4AAAAAAAx9XpnBsPXGv7Q0"
      ></div>
    </div>
  );
}
