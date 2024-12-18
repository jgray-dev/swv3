import { useRouteLoaderData } from "@remix-run/react";
import { LoaderData } from "~/.server/interfaces";
import { IoIosLink } from "react-icons/io";
import { useState, useEffect } from "react";

export default function LocationDisplay() {
  let allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showNotification) {
      timer = setTimeout(() => {
        setShowNotification(false);
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [showNotification]);

  if (!allData?.ok) return null;

  return (
    <>
      <div
        className={
          "text-center text-2xl md:text-3xl min-h-fit w-screen mx-auto h-16 text-white flex items-center -translate-y-2 justify-center gap-2 relative"
        }
        role="heading"
        aria-label={`Current city: ${allData.city}`}
        aria-level={1}
      >
        <div
          className="flex items-center gap-2 group cursor-pointer"
          onClick={() => {
            try {
              if (!showNotification) {
                void navigator.clipboard.writeText(allData.trackingLink);
                setShowNotification(true);
              } else {
                void navigator.share({
                  title: "test title",
                  url: "https://google.com",
                });
              }
            } catch {
              console.log(allData.trackingLink);
              setShowNotification(true);
            }
          }}
        >
          <span>{allData.city}</span>
          <IoIosLink
            className={
              "w-6 h-6 fill-gray-500 group-hover:fill-gray-300 duration-500 translate-y-0.5"
            }
            title={"Copy link to this page"}
          />
        </div>

        {showNotification && (
          <div
            className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 
                   bg-black/50 text-white backdrop-blur-sm text-sm py-2 px-4 rounded-md
                   shadow-lg animate-[fadeInOut_2s_ease-in-out]"
          >
            Link copied to clipboard
          </div>
        )}
      </div>
    </>
  );
}
