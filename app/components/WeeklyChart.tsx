import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate, useNavigation } from "@remix-run/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { CalendarDaySummary } from "~/.server/interfaces";
import {
  WeeklySelectionOptimisticPayload,
  WeeklySelectionState,
} from "~/context/WeeklySelectionContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
);

interface WeeklyChartProps {
  days: CalendarDaySummary[];
  selectedDate: string;
  selectedType: "sunrise" | "sunset";
  currentTime: number; // Unix timestamp
  timeZoneId: string;
  hrefBuilder?: (date: string, type: "sunrise" | "sunset") => string | null;
  onOptimisticSelect?: (payload: WeeklySelectionOptimisticPayload) => void;
  optimisticSelection?: WeeklySelectionState;
}

type WeeklyEventPoint = {
  x: number;
  y: number;
  type: "sunrise" | "sunset";
  rating: number;
  date: string;
  isAutoFocus?: boolean;
  eventString?: string | null;
  relative?: "future" | "past" | "current" | null;
};

export default function WeeklyChart({
  days,
  selectedDate,
  selectedType,
  currentTime,
  timeZoneId,
  hrefBuilder,
  onOptimisticSelect,
  optimisticSelection,
}: WeeklyChartProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();

  // Get the actual selected date and type from props or optimistic state
  const actualSelectedDate = optimisticSelection?.date ?? selectedDate;
  const actualSelectedType = optimisticSelection?.type ?? selectedType;

  // Use refs to store the latest values for the plugin
  const selectedEventTimeRef = useRef<number | null>(null);
  const selectedEventDataRef = useRef<{ type: string; rating: number; time: number } | null>(null);
  const previousDataLengthRef = useRef<number>(0);

  // Memoized color helper
  const getRatingColors = useCallback((rating: number) => {
    if (rating >= 95)
      return {
        point: "rgba(35, 213, 38, 1)",
        line: "rgba(35, 213, 38, 0.9)",
      };
    if (rating >= 85)
      return {
        point: "rgba(22, 163, 74, 1)",
        line: "rgba(22, 163, 74, 0.8)",
      };
    if (rating >= 80)
      return {
        point: "rgba(132, 204, 22, 1)",
        line: "rgba(132, 204, 22, 0.8)",
      };
    if (rating >= 70)
      return {
        point: "rgba(234, 179, 8, 1)",
        line: "rgba(234, 179, 8, 0.8)",
      };
    if (rating >= 60)
      return {
        point: "rgba(251, 146, 60, 1)",
        line: "rgba(251, 146, 60, 0.8)",
      };
    if (rating >= 45)
      return {
        point: "rgba(249, 115, 22, 1)",
        line: "rgba(249, 115, 22, 0.8)",
      };
    if (rating >= 30)
      return {
        point: "rgba(239, 68, 68, 1)",
        line: "rgba(239, 68, 68, 0.8)",
      };
    if (rating >= 20)
      return {
        point: "rgba(220, 38, 38, 1)",
        line: "rgba(220, 38, 38, 0.8)",
      };
    return {
      point: "rgba(185, 28, 28, 1)",
      line: "rgba(185, 28, 28, 0.8)",
    };
  }, []);

  const { chartData, chartEvents, selectedEventTime, selectedEventData } = useMemo(() => {
    const events: WeeklyEventPoint[] = [];

    // Combine all sunrise and sunset events
    days.forEach((day) => {
      if (day.sunrise?.eventTime && day.sunrise?.rating !== null) {
        events.push({
          x: day.sunrise.eventTime * 1000,
          y: day.sunrise.rating,
          type: "sunrise",
          rating: day.sunrise.rating,
          date: day.date,
          isAutoFocus: day.sunrise.isAutoFocus,
          eventString: day.sunrise.eventString,
          relative: day.sunrise.relative,
        });
      }

      if (day.sunset?.eventTime && day.sunset?.rating !== null) {
        events.push({
          x: day.sunset.eventTime * 1000,
          y: day.sunset.rating,
          type: "sunset",
          rating: day.sunset.rating,
          date: day.date,
          isAutoFocus: day.sunset.isAutoFocus,
          eventString: day.sunset.eventString,
          relative: day.sunset.relative,
        });
      }
    });

    // Sort by time for continuous line
    events.sort((a, b) => a.x - b.x);

    // Find selected event time
    let selectedTime: number | null = null;
    let selectedEventData: { type: string; rating: number; time: number } | null = null;
    
    // First try to find the selected event in the chart data
    const selectedEvent = events.find(
      (event) =>
        event.date === actualSelectedDate && event.type === actualSelectedType,
    );
    
    if (selectedEvent) {
      selectedTime = selectedEvent.x;
      selectedEventData = {
        type: selectedEvent.type,
        rating: selectedEvent.rating,
        time: selectedEvent.x
      };
    } else {
      // Fallback to day data if not in chart events
      const selectedDay = days.find((day) => day.date === actualSelectedDate);
      if (selectedDay) {
        const eventData =
          actualSelectedType === "sunrise"
            ? selectedDay.sunrise
            : selectedDay.sunset;
        if (eventData?.eventTime && eventData?.rating !== null) {
          selectedTime = eventData.eventTime * 1000;
          selectedEventData = {
            type: actualSelectedType,
            rating: eventData.rating,
            time: eventData.eventTime * 1000
          };
        }
      }
    }

    // Create point colors based on ratings
    const pointColors = events.map(
      (event) => getRatingColors(event.rating).point,
    );

    return {
      chartEvents: events,
      selectedEventTime: selectedTime,
      selectedEventData: selectedEventData,
      chartData: {
        datasets: [
          {
            label: "Viewing Quality Rating",
            data: events,
            borderColor: (context: any) => {
              if (context.chart?.ctx && events.length > 0) {
                const gradient = context.chart.ctx.createLinearGradient(
                  0,
                  0,
                  context.chart.width,
                  0,
                );
                
                if (events.length === 1) {
                  const color = getRatingColors(events[0].rating).line;
                  gradient.addColorStop(0, color);
                  gradient.addColorStop(1, color);
                } else {
                  events.forEach((event, index) => {
                    const position = index / (events.length - 1);
                    gradient.addColorStop(position, getRatingColors(event.rating).line);
                  });
                }
                return gradient;
              }
              return "rgba(255, 255, 255, 0.6)";
            },
            backgroundColor: "transparent",
            borderWidth: 3,
            fill: false,
            tension: 0.25,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: pointColors,
            pointBorderColor: "rgba(255, 255, 255, 0.5)",
            pointBorderWidth: 1,
            pointHoverBackgroundColor: pointColors,
            pointHoverBorderColor: "rgba(255, 255, 255, 0.9)",
            pointHoverBorderWidth: 2,
          },
        ],
      },
    };
  }, [days, actualSelectedDate, actualSelectedType, getRatingColors, optimisticSelection?.date, optimisticSelection?.type, selectedDate, selectedType]);

  // Update refs whenever selection changes
  useEffect(() => {
    selectedEventTimeRef.current = selectedEventTime;
    selectedEventDataRef.current = selectedEventData;
  }, [selectedEventTime, selectedEventData]);

  const handlePointClick = useCallback<
    NonNullable<ChartOptions<"line">["onClick"]>
  >(
    (_event, elements, chart) => {
      if (!hrefBuilder || elements.length === 0) return;

      const element = elements[0];
      const dataset = chart.data.datasets?.[element.datasetIndex];
      const datum = dataset?.data?.[element.index] as WeeklyEventPoint | undefined;

      if (!datum) return;

      const href = hrefBuilder(datum.date, datum.type);
      if (!href) return;

      // Update selection immediately
      onOptimisticSelect?.({
        date: datum.date,
        type: datum.type,
        rating: datum.rating,
        eventTime: Math.round(datum.x / 1000),
        eventString: datum.eventString ?? null,
        relative: datum.relative ?? null,
        timeZoneId,
      });

      navigate(href, { preventScrollReset: true });
    },
    [hrefBuilder, navigate, onOptimisticSelect, timeZoneId],
  );

  // Custom plugin to draw vertical lines and info box
  const verticalLinesPlugin = useMemo(() => ({
    id: "verticalLines",
    afterDatasetsDraw: (chart: any) => {
      const { ctx, scales } = chart;
      const xScale = scales.x;
      const yScale = scales.y;

      // Use the refs to get the latest values
      const currentSelectedEventTime = selectedEventTimeRef.current;
      const currentSelectedEventData = selectedEventDataRef.current;

      ctx.save();

      // Draw current time line (faint gray)
      if (currentTime) {
        const currentTimeMs = currentTime * 1000;
        if (currentTimeMs >= xScale.min && currentTimeMs <= xScale.max) {
          const xPosition = xScale.getPixelForValue(currentTimeMs);

          ctx.beginPath();
          ctx.strokeStyle = "rgba(156, 163, 175, 0.3)";
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.moveTo(xPosition, yScale.top);
          ctx.lineTo(xPosition, yScale.bottom);
          ctx.stroke();
          ctx.setLineDash([]);

          // Small "NOW" label
          ctx.fillStyle = "rgba(156, 163, 175, 0.5)";
          ctx.font = "10px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("NOW", xPosition, yScale.bottom + 12);
        }
      }

      // Draw selected event time line (bright white) with info box
      if (currentSelectedEventTime && currentSelectedEventTime >= xScale.min && currentSelectedEventTime <= xScale.max && currentSelectedEventData) {
        const xPosition = xScale.getPixelForValue(currentSelectedEventTime);

        // Draw vertical line
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.moveTo(xPosition, yScale.top);
        ctx.lineTo(xPosition, yScale.bottom);
        ctx.stroke();

        // Format time
        const eventDate = new Date(currentSelectedEventData.time);
        const timeStr = eventDate.toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit",
          timeZone: timeZoneId 
        });
        
        // Format event type
        const typeStr = currentSelectedEventData.type === "sunrise" ? "Sunrise" : "Sunset";
        
        // Format rating
        const ratingStr = Math.round(currentSelectedEventData.rating).toString();

        // Calculate box dimensions first
        const padding = 6;
        const lineHeight = 12;
        
        // Measure text
        ctx.font = "bold 10px system-ui";
        const labelWidth = ctx.measureText("SELECTED").width;
        ctx.font = "11px system-ui";
        const typeWidth = ctx.measureText(typeStr).width;
        const timeWidth = ctx.measureText(timeStr).width;
        const ratingWidth = ctx.measureText(ratingStr).width;
        const maxTextWidth = Math.max(labelWidth, typeWidth, timeWidth, ratingWidth);
        
        const boxWidth = maxTextWidth + padding * 2;
        const boxHeight = lineHeight * 4 + padding * 2;
        const halfBoxHeight = boxHeight / 2;
        
        // Smart vertical positioning to avoid clipping and the chart line
        const rating = currentSelectedEventData.rating;
        const ratingY = yScale.getPixelForValue(rating);
        const topMargin = 10;
        const bottomMargin = 10;
        const clearance = 8; // Minimum pixels between box and chart line
        
        // First, try to position at the rating value
        let boxY = ratingY;
        
        // Helper to check if box intersects with chart line at this position
        const checkLineIntersection = (testY: number) => {
          const boxTop = testY - halfBoxHeight;
          const boxBottom = testY + halfBoxHeight;
          
          // Check if any data points would intersect the box vertically
          // Look at points near the selected event
          for (let i = 0; i < chartEvents.length; i++) {
            const event = chartEvents[i];
            const eventX = event.x;
            const eventY = yScale.getPixelForValue(event.y);
            
            // Only check points that are horizontally near the vertical line
            // (within the box's horizontal bounds plus some margin)
            const horizontalDistance = Math.abs(eventX - xPosition);
            if (horizontalDistance < boxWidth / 2 + 20) {
              // Check if this point's Y position intersects the box
              if (eventY >= boxTop - clearance && eventY <= boxBottom + clearance) {
                return true; // Intersection detected
              }
            }
          }
          return false;
        };
        
        // Determine if box should be on left or right side
        const spaceRight = xScale.right - xPosition;
        const spaceLeft = xPosition - xScale.left;
        const preferRight = spaceRight >= spaceLeft;
        
        // Horizontal offset from the line
        const horizontalOffset = 15;
        
        // Strategy: Try positions in order of preference, considering both sides
        const verticalPositions = [
          ratingY, // First try: at rating level
          ratingY - halfBoxHeight - clearance - 10, // Try above
          ratingY + halfBoxHeight + clearance + 10, // Try below
          yScale.top + halfBoxHeight + topMargin, // Top of chart
          yScale.bottom - halfBoxHeight - bottomMargin, // Bottom of chart
        ];
        
        // Try each vertical position with preferred horizontal side first
        let foundPosition = false;
        let boxX = preferRight ? xPosition + horizontalOffset : xPosition - boxWidth - horizontalOffset;
        
        for (const pos of verticalPositions) {
          // Check bounds
          if (pos - halfBoxHeight < yScale.top + topMargin || 
              pos + halfBoxHeight > yScale.bottom - bottomMargin) {
            continue;
          }
          
          // Check intersection
          if (!checkLineIntersection(pos)) {
            boxY = pos;
            foundPosition = true;
            break;
          }
        }
        
        // If no position found on preferred side, try the other side
        if (!foundPosition) {
          boxX = preferRight ? xPosition - boxWidth - horizontalOffset : xPosition + horizontalOffset;
          
          for (const pos of verticalPositions) {
            if (pos - halfBoxHeight < yScale.top + topMargin || 
                pos + halfBoxHeight > yScale.bottom - bottomMargin) {
              continue;
            }
            
            if (!checkLineIntersection(pos)) {
              boxY = pos;
              foundPosition = true;
              break;
            }
          }
        }
        
        // Final fallback: if all positions intersect, pick the one with most space
        if (!foundPosition) {
          const spaceAbove = ratingY - yScale.top;
          const spaceBelow = yScale.bottom - ratingY;
          
          boxY = spaceAbove > spaceBelow 
            ? yScale.top + halfBoxHeight + topMargin 
            : yScale.bottom - halfBoxHeight - bottomMargin;
          
          // Use preferred side
          boxX = preferRight ? xPosition + horizontalOffset : xPosition - boxWidth - horizontalOffset;
        }
        
        // Ensure box doesn't go off screen horizontally
        if (boxX < xScale.left) {
          boxX = xPosition + horizontalOffset;
        } else if (boxX + boxWidth > xScale.right) {
          boxX = xPosition - boxWidth - horizontalOffset;
        }

        // Draw box background (semi-transparent so line is visible through it)
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight);
        
        // Draw box border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight);

        // Draw text
        ctx.textAlign = "left";
        const textX = boxX + padding;
        let textY = boxY - boxHeight / 2 + padding + 10;
        
        // "SELECTED" label
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "bold 9px system-ui";
        ctx.fillText("SELECTED", textX, textY);
        textY += lineHeight;
        
        // Event type
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.font = "11px system-ui";
        ctx.fillText(typeStr, textX, textY);
        textY += lineHeight;
        
        // Time
        ctx.fillText(timeStr, textX, textY);
        textY += lineHeight;
        
        // Rating
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.font = "bold 11px system-ui";
        ctx.fillText(`Rating: ${ratingStr}`, textX, textY);
      }

      ctx.restore();
    },
  }), [currentTime, timeZoneId]);

  // Check if data length changed (edge case - loading new date range)
  const dataLengthChanged = chartEvents.length !== previousDataLengthRef.current;
  previousDataLengthRef.current = chartEvents.length;

  // Mobile-optimized options
  const options: ChartOptions<"line"> = useMemo(() => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
    return {
    responsive: true,
    maintainAspectRatio: false,
    animation: dataLengthChanged ? false : {
      duration: 400,
      easing: 'easeInOutQuart',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: !isMobile, // Disable on mobile for better performance
        mode: "point",
        intersect: true,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "rgba(255, 255, 255, 0.95)",
        bodyColor: "rgba(255, 255, 255, 0.85)",
        borderColor: "rgba(255, 255, 255, 0.15)",
        borderWidth: 1,
        cornerRadius: 6,
        padding: 8,
        displayColors: false,
        callbacks: {
          title: (tooltipItems) => {
            const timestamp = tooltipItems[0].parsed.x;
            return new Date(timestamp).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: timeZoneId,
            });
          },
          label: (context) => {
            const rating = Math.round(context.parsed.y);
            const rawPoint = context.raw as WeeklyEventPoint;
            const eventType = rawPoint?.type === "sunrise" ? "Sunrise" : "Sunset";
            return `${eventType}: ${rating}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: isMobile ? "day" : "hour",
          displayFormats: {
            day: "MMM d",
            hour: "MMM d ha",
          },
        },
        grid: {
          color: "rgba(255, 255, 255, 0.06)",
          drawOnChartArea: true,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.6)",
          font: {
            size: isMobile ? 10 : 11,
          },
          autoSkip: true,
          maxTicksLimit: isMobile ? 4 : 7,
          maxRotation: 0,
        },
        title: {
          display: false, // Hide on mobile
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: "rgba(255, 255, 255, 0.06)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.6)",
          font: {
            size: isMobile ? 10 : 11,
          },
          stepSize: 20,
          callback: (value) => {
            const num = typeof value === "string" ? Number(value) : value;
            return num >= 0 && num <= 100 ? num : "";
          },
        },
        title: {
          display: !isMobile,
          text: "Rating",
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            size: 12,
          },
        },
      },
    },
    interaction: {
      mode: "point",
      intersect: true,
    },
    onClick: handlePointClick,
  };
  }, [handlePointClick, timeZoneId, dataLengthChanged]);

  return (
    <div className="relative w-full h-48 sm:h-64 md:h-80">
      <Line
        data={chartData}
        options={options}
        plugins={[verticalLinesPlugin]}
      />
    </div>
  );
}