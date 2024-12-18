import { Form, Link, useRouteLoaderData } from "@remix-run/react";
import React, { useEffect, useState } from "react";
import { LoaderData } from "~/.server/interfaces";
import { useScrollLock } from "~/hooks/useScrollLock";

export default function Footer() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [showAuthorize, setShowAuthorize] = useState<boolean>(false);
  useEffect(() => {
    if (showAuthorize) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [showAuthorize]);

  if (!allData) return <></>;
  useScrollLock(showAuthorize);
  console.log(allData.authorized)
  return (
    <>
      <div>
        <div
          className={
            "w-screen bg-transparent pt-16 text-sm text-white/75 text-center select-none"
          }
        >
          <Link
            to={"/"}
            target={""}
            className={
              "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/75 after:transition-transform hover:after:scale-x-100"
            }
          >
            home
          </Link>
          <span className={"text-white/15"}>{" | "}</span>
          <Link
            to={"/about"}
            target={""}
            className={
              "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/75 after:transition-transform hover:after:scale-x-100"
            }
          >
            about
          </Link>
          <span className={"text-white/15"}>{" | "}</span>
          <Link
            to={"/contact"}
            target={""}
            className={
              "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/75 after:transition-transform hover:after:scale-x-100"
            }
          >
            contact
          </Link>
          <span className={"text-white/15"}>{" | "}</span>
          <Link
            to={"https://github.com/jgray-dev/swv3"}
            target={"_blank"}
            className={
              "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/75 after:transition-transform hover:after:scale-x-100"
            }
          >
            github
          </Link>
          <span className={"text-white/15"}>{" | "}</span>
          {allData.authorized ? <span
            className={
              "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/75 after:transition-transform hover:after:scale-x-100"
            }
          >
            authorized
          </span> : <button
            className={
              "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/75 after:transition-transform hover:after:scale-x-100"
            }
            onClick={() => setShowAuthorize(true)}
          >
            authorize
          </button>}

        </div>
        <div
          className={
            "w-screen bg-transparent pt-8 text-sm text-white/25 text-center pb-4 select-none"
          }
        >
          made with ♥ by{" "}
          <a
            href={"https://www.linkedin.com/in/jackson--gray/"}
            target={"_blank"}
            className={
              "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/25 after:transition-transform hover:after:scale-x-100"
            }
          >
            jackson
          </a>
        </div>
      </div>
      {showAuthorize && (
        <div
          className={
            "w-screen h-screen backdrop-blur-md fixed top-0 bg-black/10 flex justify-center items-center"
          }
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowAuthorize(false);
            }
          }}
        >
          <div>
            <Form method={"post"} onSubmit={() => setShowAuthorize(false)}>
              <div
                className="cf-turnstile mt-4"
                data-sitekey="0x4AAAAAAAx9XpnBsPXGv7Q0"
                data-size="compact"
              ></div>
              <input
                type="password"
                name="password"
                className={
                  "w-[150px] h-8 rounded-lg bg-black/50 backdrop-blur-lg focus-none outline-none p-1 text-xs placeholder-white/15 text-center text-white/25"
                }
                placeholder={"password"}
              />
              <input type="hidden" name="element" value="authorizeRequest" />
            </Form>
          </div>
        </div>
      )}
    </>
  );
}
