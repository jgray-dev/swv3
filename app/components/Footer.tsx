import { Link } from "@remix-run/react";
import React from "react";

export default function Footer() {
  return (
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
  );
}
