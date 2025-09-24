import React from "react";
import { Link } from "@remix-run/react";
import { GiSunrise, GiSunset } from "react-icons/gi";
import { CalendarDaySummary } from "~/.server/interfaces";
import WeeklyChart from "./WeeklyChart";

interface WeeklyCalendarProps {
  days: CalendarDaySummary[];
  selectedDate: string;
  selectedType: "sunrise" | "sunset";
  onSelect?: (date: string, type: "sunrise" | "sunset") => void;
  hrefBuilder?: (date: string, type: "sunrise" | "sunset") => string | null;
  disabled?: boolean;
  currentTime?: number;
  timeZoneId?: string;
}

const ratingStyles = (rating: number | null, isSelected: boolean) => {
  if (rating === null) {
    return {
      card: `border-white/15 bg-white/10 text-white/60 ${
        isSelected ? "ring-1 ring-white/30" : "hover:border-white/30"
      }`,
      accent: "bg-white/15 text-white/70",
    } as const;
  }

  if (rating >= 90) {
    return {
      card: `border-emerald-300/60 bg-gradient-to-br from-emerald-400/30 via-emerald-500/20 to-emerald-400/15 text-emerald-50 ${
        isSelected
          ? "ring-1 ring-emerald-200/70"
          : "hover:border-emerald-300/70"
      }`,
      accent: "bg-emerald-300/30 text-emerald-950",
    } as const;
  }
  if (rating >= 75) {
    return {
      card: `border-teal-300/55 bg-gradient-to-br from-teal-400/25 via-teal-500/18 to-teal-400/12 text-teal-50 ${
        isSelected ? "ring-1 ring-teal-200/70" : "hover:border-teal-300/70"
      }`,
      accent: "bg-teal-300/25 text-teal-950",
    } as const;
  }
  if (rating >= 60) {
    return {
      card: `border-sky-300/50 bg-gradient-to-br from-sky-400/25 via-sky-400/18 to-sky-300/12 text-sky-50 ${
        isSelected ? "ring-1 ring-sky-200/70" : "hover:border-sky-300/70"
      }`,
      accent: "bg-sky-300/25 text-sky-950",
    } as const;
  }
  if (rating >= 45) {
    return {
      card: `border-amber-300/45 bg-gradient-to-br from-amber-400/24 via-amber-400/16 to-amber-300/10 text-amber-50 ${
        isSelected ? "ring-1 ring-amber-200/70" : "hover:border-amber-300/70"
      }`,
      accent: "bg-amber-300/25 text-amber-950",
    } as const;
  }
  if (rating >= 30) {
    return {
      card: `border-orange-300/45 bg-gradient-to-br from-orange-400/24 via-orange-400/16 to-orange-300/10 text-orange-50 ${
        isSelected ? "ring-1 ring-orange-200/70" : "hover:border-orange-300/70"
      }`,
      accent: "bg-orange-300/25 text-orange-950",
    } as const;
  }
  return {
    card: `border-rose-400/45 bg-gradient-to-br from-rose-500/22 via-rose-500/15 to-rose-400/10 text-rose-100 ${
      isSelected ? "ring-1 ring-rose-200/60" : "hover:border-rose-300/60"
    }`,
    accent: "bg-rose-400/20 text-rose-50",
  } as const;
};

export default function WeeklyCalendar({
  days,
  selectedDate,
  selectedType,
  onSelect,
  hrefBuilder,
  disabled = false,
  currentTime = Date.now() / 1000,
  timeZoneId = "UTC",
}: WeeklyCalendarProps) {
  if (!days || days.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white/95">Weekly Outlook</h3>
          <p className="text-sm text-white/60 mt-1">5-day sunrise & sunset viewing quality</p>
        </div>
        {disabled ? (
          <div className="flex items-center gap-2 text-xs text-white/40 bg-white/[0.03] px-3 py-2 rounded-lg border border-white/10">
            <div className="w-2 h-2 bg-emerald-400/60 rounded-full"></div>
            <span>Auto Mode</span>
          </div>
        ) : null}
      </div>
      
      <div className="space-y-8">
        {/* Continuous Line Chart */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm">
          <WeeklyChart
            days={days}
            selectedDate={selectedDate}
            selectedType={selectedType}
            currentTime={currentTime}
            timeZoneId={timeZoneId}
            hrefBuilder={hrefBuilder}
          />
        </div>
        
        {/* Interactive day selector */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {days.map((day) => {
            const sunriseSelected = selectedDate === day.date && selectedType === "sunrise";
            const sunsetSelected = selectedDate === day.date && selectedType === "sunset";
            
            return (
              <div
                key={day.date}
                className={`rounded-lg border transition-all duration-200 ${
                  day.isToday
                    ? "border-white/25 bg-white/[0.08]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-white/90 leading-tight">{day.label}</div>
                    {day.isToday && <div className="text-xs text-emerald-400 mt-0.5 sm:mt-1">Today</div>}
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    {(["sunrise", "sunset"] as const).map((type) => {
                      const event = day[type];
                      const isSelected = type === "sunrise" ? sunriseSelected : sunsetSelected;
                      const Icon = type === "sunrise" ? GiSunrise : GiSunset;
                      const href = hrefBuilder?.(day.date, type);
                      
                      const getRatingColor = (rating: number | null) => {
                        if (!rating) return 'text-white/40';
                        if (rating >= 80) return 'text-emerald-400';
                        if (rating >= 60) return 'text-sky-400';
                        if (rating >= 40) return 'text-amber-400';
                        return 'text-rose-400';
                      };
                      
                      const content = (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white/60 flex-shrink-0" />
                            <span className="text-xs text-white/70 capitalize truncate">{type}</span>
                          </div>
                          <div className={`text-xs sm:text-sm font-bold flex-shrink-0 ${getRatingColor(event?.rating ?? null)}`}>
                            {event?.rating !== undefined && event?.rating !== null
                              ? Math.round(event.rating)
                              : "—"}
                          </div>
                        </div>
                      );
                      
                      const sharedClasses = `flex w-full items-center gap-1 sm:gap-2 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 min-w-0 ${
                        isSelected 
                          ? "ring-2 ring-white/40 bg-white/[0.1]" 
                          : "hover:bg-white/[0.05]"
                      } ${
                        event?.isAutoFocus
                          ? "ring-2 ring-white/20 bg-white/[0.06]"
                          : ""
                      }`;
                      
                      if (href) {
                        return (
                          <Link
                            key={type}
                            to={href}
                            prefetch="render"
                            title={event?.eventString ?? "No data"}
                            className={sharedClasses}
                          >
                            {content}
                          </Link>
                        );
                      }
                      
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => onSelect?.(day.date, type)}
                          title={event?.eventString ?? "No data"}
                          className={sharedClasses}
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
