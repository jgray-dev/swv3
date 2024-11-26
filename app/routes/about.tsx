import { LoaderFunction } from "@remix-run/router";
import type { ActionFunction, MetaFunction } from "@remix-run/cloudflare";
import Footer from "~/components/Footer";

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

export const loader: LoaderFunction = async ({ request, context }) => {
  return 0;
};

export const action: ActionFunction = async ({ request, context }) => {};

export default function Sunwatch() {
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
            Sunwatch is a website designed to give visual ratings to sunrises
            and sunsets around the world
          </div>
          <div className={"w-full border-b my-8 border-white/20"}></div>
          <span className={"pl-6"}></span>It uses
          <a
            href={"https://github.com/open-meteo/open-meteo"}
            className={
              "relative no-underline font-semibold text-white after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform hover:after:scale-x-100"
            }
          >
            open meteo
          </a>{" "}
          to gather weather data from whatever location you select, along with
          up-to 12 locations in the direction of the sunrise or sunset.
          <br/>
          <br/>
          <span className={"pl-6"}></span>The
          <a
            href={
              "https://github.com/jgray-dev/swv3/blob/main/app/.server/rating.ts"
            }
            className={
              "relative no-underline font-semibold text-white after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform hover:after:scale-x-100"
            }
          >
            rating algorithm
          </a>{" "}
          combines cloud data from three distinct zones to create a final score
          between <span className="font-semibold text-yellow-200">0-100</span>.
          The algorithm weighs different types of clouds (low, mid, and high)
          differently in each zone, and applies various multipliers based on
          conditions like visibility and freezing height. The final score is
          calculated by combining the individual zone scores (
          <span className="font-bold text-blue-200">
            25% near, 50% horizon, 25% far
          </span>
          ) and applying overall multipliers that can reduce the final rating
          based on total cloud coverage.
          <div className={"w-full border-b my-8 border-white/20"}></div>
          <span className="text-blue-300 pl-6">
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
          <br/>
          <br/>
          <span className="text-blue-200 pl-6">
            The horizon zone (5-13 miles)
          </span>{" "}
          is the <span className="font-bold">most important zone</span>,
          contributing up to <span className="font-bold">50 points</span> to the
          final score. This zone particularly favors high and mid-level clouds,
          which can create dramatic colors, while penalizing low clouds. The
          algorithm also considers the relationship between cloud heights and
          the freezing level in this zone, as this can affect the likelihood of
          colorful conditions.
          <br/>
          <br/>
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
          Besides the technical aspect, user's are encouraged to upload images
          of sunrises and sunsets using the "submit" feature at the bottom of
          the page. When uploading an image, make sure the location you have
          selected is correct, and the date is accurate with the image! You can
          upload any sunrise or sunset picture taken in the last 2 years.
          <br/>
          <br/>
          Each submission will be placed on the interactive map, with the
          marker's color corresponding to the rating for that submission.
        </div>
        <div className={"mt-20 text-lg"}><a
          href={
            "/"
          }
          className={
            "relative no-underline font-semibold text-white after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform hover:after:scale-x-100"
          }
        >
          Go explore!
        </a></div>
      </div>

      <Footer/>
    </div>
  );
}
