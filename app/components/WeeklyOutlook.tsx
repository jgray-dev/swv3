import { useRouteLoaderData } from "@remix-run/react";
import WeeklyCalendar from "~/components/WeeklyCalendar";
import { LoaderData } from "~/.server/interfaces";
import {
  useWeeklySelection,
  WeeklySelectionOptimisticPayload,
} from "~/context/WeeklySelectionContext";

export default function WeeklyOutlook() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const { selection, updateSelection } = useWeeklySelection();

  if (!allData?.calendar || allData.calendar.length === 0) return null;

  const limitLabel = allData.calendarLimitDate
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(`${allData.calendarLimitDate}T00:00:00Z`))
    : null;

  const buildHref = (date: string, type: "sunrise" | "sunset") => {
    if (
      typeof allData?.lat !== "number" ||
      typeof allData?.lon !== "number" ||
      !allData?.city
    ) {
      return null;
    }
    const params = new URLSearchParams();
    params.set("lat", `${allData.lat}`);
    params.set("lon", `${allData.lon}`);
    params.set("city", allData.city);
    params.set("date", date);
    params.set("type", type);
    return `/?${params.toString()}`;
  };

  const handleOptimisticSelection = (
    payload: WeeklySelectionOptimisticPayload
  ) => {
    updateSelection(
      {
        date: payload.date,
        type: payload.type,
        rating: payload.rating,
        eventTime: payload.eventTime,
        eventString: payload.eventString,
        relative: payload.relative,
        timeZoneId: payload.timeZoneId ?? allData.eventTimeZone ?? null,
      },
      { isPending: true }
    );
  };

  const fallbackDate =
    selection.date ?? allData.eventDate ?? new Date().toISOString().split("T")[0];
  const fallbackType = selection.type ?? allData.eventType ?? "sunrise";

  return (
    <section
      className="px-4 pt-8 pb-6 sm:px-6 sm:pt-12 sm:pb-8"
      role="region"
      aria-label="Weekly outlook"
    >
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-md sm:p-8">
        <WeeklyCalendar
          days={allData.calendar}
          selectedDate={fallbackDate}
          selectedType={fallbackType}
          hrefBuilder={buildHref}
          currentTime={allData.now}
          timeZoneId={allData.eventTimeZone}
          onOptimisticNavigate={handleOptimisticSelection}
          optimisticSelection={selection}
        />
        {allData.calendarLimited && limitLabel ? (
          <p className="mt-6 text-xs text-white/55 text-center">
            Predictions beyond {limitLabel} aren't available yet. Check back as
            additional data comes online.
          </p>
        ) : null}
      </div>
    </section>
  );
}
