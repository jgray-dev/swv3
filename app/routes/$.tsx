import {Link} from "@remix-run/react";
import React from "react";

export const loader = () => {
  return Response.json("Page not found", { status: 404 });
};

export default function StarryPage() {
  const generateStars = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() < 0.2 ? 2 : Math.random() < 0.5 ? 1.5 : Math.random() < 0.8 ? 1 : 0.5,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: 0.2 + Math.random() * 0.8,
    }));
  };
  const stars = generateStars(200);

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden select-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            height: `${star.size}px`,
            width: `${star.size}px`,
            top: star.top,
            left: star.left,
            opacity: star.opacity,
          }}
        />
      ))}
      <div className={"h-screen w-screen flex justify-center z-10 fixed"}>
        <div className={"h-32 rounded-lg w-72 bg-black/95 my-auto flex flex-col items-center justify-center"}>
          <div className={"font-bold text-[2.5rem]"}>you're lost</div>

          <Link
            to={"/"}
            target={""}
            className={
              "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/75 after:transition-transform hover:after:scale-x-100 text-xs -translate-y-4"
            }
          >
            back to safety
          </Link>
        </div>
      </div>
    </div>
  );
}