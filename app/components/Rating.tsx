import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData } from "~/.server/interfaces";
import { useEffect, useState, useRef } from "react";

export default function Rating() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  if (!allData) return null;

  const rating = Math.max(0, Math.min(100, allData.rating));
  const [displayNumber, setDisplayNumber] = useState(rating);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef(displayNumber);
  const ANIMATION_DURATION = 500;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (rating / 100) * circumference;
  const dashOffset = circumference - progress;

  useEffect(() => {
    startTimeRef.current = performance.now();
    startValueRef.current = displayNumber;
    let animationFrameId: number;

    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      if (progress < 1) {
        const newValue = startValueRef.current + (rating - startValueRef.current) * progress;
        setDisplayNumber(newValue);
        animationFrameId = requestAnimationFrame(animateNumber);
      } else {
        setDisplayNumber(rating);
      }
    };

    animationFrameId = requestAnimationFrame(animateNumber);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [rating]);
  
  const getColor = (rating: number) => {
    if (rating <= 10) return "stroke-[#991b1b]";
    if (rating <= 30) return "stroke-[#dc2626]";
    if (rating <= 50) return "stroke-[#ea580c]";
    if (rating <= 70) return "stroke-[#eab308]";
    if (rating <= 90) return "stroke-[#22c55e]";
    return "stroke-[#059669]";
  };

  return (
    <div className={"w-screen flex justify-center"}>
      <div className={"w-full md:w-80 md:mt-4 mt-8 mx-4 min-h-32 rounded-md flex flex-row"}>
        <div className={"aspect-square m-4 relative"}>
          <svg className="w-full h-full -rotate-90">
            {rating < 100 && (
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                fill="none"
                stroke="black"
                strokeWidth="8"
                strokeDasharray="4,4"
                className="opacity-20"
              />
            )}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              strokeWidth="8"
              className={`${getColor(rating)} transition-all duration-500 ease-in-out`}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">
              {Math.round(displayNumber)}
            </span>
          </div>
        </div>
        <div className={"w-full h-full bg-green-400"}>stats:</div>
      </div>
    </div>
  );
}