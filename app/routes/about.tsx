import type { MetaFunction } from "@remix-run/cloudflare";
import Footer from "~/components/Footer";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Sunwatch - About" },
    {
      name: "Sunwatch",
      content:
        "Sunwatch. An app designed to show visual ratings for sunrises and sunsets around the world.",
    },
  ];
};

export default function About() {
  return (
    <div
      className={
        "overflow-y-scroll min-h-screen w-screen bg-gradient-to-br  from-blue-800/50 via-purple-900/50 to-purple-800/50"
      }
    >
      <div
        className={
          " text-neutral-200 text-center p-4 md:pt-32 pt-8 leading-relaxed"
        }
      >
        <div className={"text-neutral-100 font-bold text-xl mb-2"}>
          Sunwatch
        </div>
        <div
          className={
            "text-justify mx-auto text-pretty md:w-1/2 w-full space-x-1 text-md"
          }
        >
          <div className={" text-white w-full text-center"}>
            Welcome to Sunwatch - your personal sunrise and sunset forecasting
            companion. We help you predict and share the beauty of these daily
            natural events.
          </div>
          <div className={"w-full border-b my-8 border-white/20"}></div>
          <span className={"pl-6"}></span>Ever wondered if tomorrow's sunrise
          will be worth waking up early for? That's exactly what Sunwatch helps
          you figure out! We use
          <Link
            to={"https://github.com/open-meteo/open-meteo"}
            className={
              "relative no-underline font-semibold text-white after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform hover:after:scale-x-100"
            }
          >
            open meteo
          </Link>{" "}
          to collect detailed weather information not just at your location, but
          also at multiple points in the direction you'll be looking during
          sunrise or sunset.
          <br />
          <br />
          <span className={"pl-6"}></span>Our
          <Link
            to={
              "https://github.com/jgray-dev/swv3/blob/main/app/.server/rating.ts"
            }
            className={
              "relative no-underline font-semibold text-white after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform hover:after:scale-x-100"
            }
          >
            special scoring system
          </Link>{" "}
          analyzes cloud patterns and weather conditions to give you a score
          from <span className="font-semibold text-yellow-200">0-100</span>.
          Think of it like a weather forecast specifically designed for
          photographers and sky-watchers! We look at three different areas of
          the sky (
          <span className="font-bold text-blue-200">
            close to you, at the horizon, and far away
          </span>
          ) to predict how spectacular the view will be.
          <div className={"w-full border-b my-8 border-white/20"}></div>
          <span className="text-blue-200 pl-6">
            The near zone (0-3 miles)
          </span>{" "}
          contributes up to <span className="font-bold">25 points</span> to the
          final score and is heavily influenced by visibility and low clouds.
          Low clouds in this zone are{" "}
          <span className="text-red-300">particularly penalized</span> as they
          can completely block the view of the event. The near zone also
          includes a multiplier that can significantly reduce the final score if
          conditions are poor, as nearby obstructions have the most immediate
          impact on viewing.
          <br />
          <br />
          <span className="text-blue-200 pl-6">
            The horizon zone (5-13 miles)
          </span>{" "}
          is the <span className="font-bold">most important zone</span>,
          contributing up to <span className="font-bold">50 points</span> to the
          final score. This zone particularly favors high and mid-level clouds,
          which can create dramatic colors, while penalizing low clouds. The
          algorithm also considers the relationship between cloud heights and
          the freezing level in this zone, as this can affect the likelihood of
          colorful conditions due to the formation of ice crystals within the
          clouds!
          <br />
          <br />
          <span className="text-blue-200 pl-6">
            The far zone (15-24 miles)
          </span>{" "}
          contributes up to <span className="font-bold">25 points</span> and is
          evaluated based on the overall distribution of clouds and their
          relationship to the freezing height. This zone is particularly focused
          on <span className="text-white">"drama clouds"</span> - a balance of
          cloud coverage that can create spectacular sunrise or sunset effects.
          The far zone's contribution is optimized when there's a moderate
          amount of cloud coverage, with scores decreasing for both very clear
          and very cloudy conditions.
          <div className={"w-full border-b my-8 border-white/20"}></div>
          You're encouraged to be a part of the Sunwatch community! Upload
          images of sunrises and sunsets using the "submit" feature at the
          bottom of the page. When uploading an image, make sure the location
          you have selected is correct, and the date is accurate with the image!
          You can upload any sunrise or sunset picture taken in the last 2
          years.
          <br />
          <br />
          Every photo you share appears on our interactive map as a colored
          marker - the color shows how our rating system scored that particular
          event. The map is our canvas, and the sky is our paint.
          <div className={"w-full border-b my-8 border-white/20"}></div>
          Our goal is to enable sky watchers the ability to predict nature's
          beauty.
        </div>
        <div className={"mt-20 text-lg"}>
          <Link
            to={"/"}
            className={
              "relative no-underline font-semibold text-white after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform hover:after:scale-x-100"
            }
          >
            Start exploring!
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
