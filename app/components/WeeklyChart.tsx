import React, { useCallback, useMemo } from "react";
import { useNavigate } from "@remix-run/react";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface WeeklyChartProps {
  days: CalendarDaySummary[];
  selectedDate: string;
  selectedType: "sunrise" | "sunset";
  currentTime: number; // Unix timestamp
  timeZoneId: string;
  hrefBuilder?: (date: string, type: "sunrise" | "sunset") => string | null;
}

type WeeklyEventPoint = {
  x: number;
  y: number;
  type: "sunrise" | "sunset";
  rating: number;
  date: string;
};

export default function WeeklyChart({
  days,
  selectedDate,
  selectedType,
  currentTime,
  timeZoneId,
  hrefBuilder,
}: WeeklyChartProps) {
  const navigate = useNavigate();

  // Helper function to get rating-based colors (matching exact app theme)
  const getRatingColors = (rating: number) => {
    // Rainbow gradient for 95+ (using green as fallback since Chart.js points can't use gradients)
    if (rating >= 95) return {
      point: "rgba(35, 213, 38, 1)", // #23d526
      line: "rgba(35, 213, 38, 0.9)",
      bg: "rgba(35, 213, 38, 0.1)"
    };
    // Green-600 for 85-94 (matching RatingDisplay 85-95 range)
    if (rating >= 85) return {
      point: "rgba(22, 163, 74, 1)", // green-600
      line: "rgba(22, 163, 74, 0.8)",
      bg: "rgba(22, 163, 74, 0.1)"
    };
    // Lime for 80-84
    if (rating >= 80) return {
      point: "rgba(132, 204, 22, 1)", // lime-500
      line: "rgba(132, 204, 22, 0.8)",
      bg: "rgba(132, 204, 22, 0.1)"
    };
    // Yellow for 70-79
    if (rating >= 70) return {
      point: "rgba(234, 179, 8, 1)", // yellow-500
      line: "rgba(234, 179, 8, 0.8)",
      bg: "rgba(234, 179, 8, 0.1)"
    };
    // Orange-400 for 60-69
    if (rating >= 60) return {
      point: "rgba(251, 146, 60, 1)", // orange-400
      line: "rgba(251, 146, 60, 0.8)",
      bg: "rgba(251, 146, 60, 0.1)"
    };
    // Orange-500 for 45-59
    if (rating >= 45) return {
      point: "rgba(249, 115, 22, 1)", // orange-500
      line: "rgba(249, 115, 22, 0.8)",
      bg: "rgba(249, 115, 22, 0.1)"
    };
    // Red-500 for 30-44
    if (rating >= 30) return {
      point: "rgba(239, 68, 68, 1)", // red-500
      line: "rgba(239, 68, 68, 0.8)",
      bg: "rgba(239, 68, 68, 0.1)"
    };
    // Red-600 for 20-29
    if (rating >= 20) return {
      point: "rgba(220, 38, 38, 1)", // red-600
      line: "rgba(220, 38, 38, 0.8)",
      bg: "rgba(220, 38, 38, 0.1)"
    };
    // Red-700 for 10-19 and below
    return {
      point: "rgba(185, 28, 28, 1)", // red-700
      line: "rgba(185, 28, 28, 0.8)",
      bg: "rgba(185, 28, 28, 0.1)"
    };
  };

  const chartData = useMemo(() => {
    const allEvents: WeeklyEventPoint[] = [];

    // Combine all sunrise and sunset events into single dataset
    days.forEach((day) => {
      if (day.sunrise?.eventTime && day.sunrise?.rating !== null) {
        allEvents.push({
          x: day.sunrise.eventTime * 1000,
          y: day.sunrise.rating,
          type: "sunrise",
          rating: day.sunrise.rating,
          date: day.date
        });
      }
      
      if (day.sunset?.eventTime && day.sunset?.rating !== null) {
        allEvents.push({
          x: day.sunset.eventTime * 1000,
          y: day.sunset.rating,
          type: "sunset",
          rating: day.sunset.rating,
          date: day.date
        });
      }
    });

    // Sort by time for continuous line
    allEvents.sort((a, b) => a.x - b.x);
    
    // Create point colors based on ratings
    const pointColors = allEvents.map(event => getRatingColors(event.rating).point);

    return {
      datasets: [
        {
          label: "Viewing Quality Rating",
          data: allEvents,
          borderColor: (context: any) => {
            // Create gradient based on data points
            if (context.chart && context.chart.ctx) {
              const gradient = context.chart.ctx.createLinearGradient(0, 0, context.chart.width, 0);
              const stops = allEvents.length;
              if (stops === 1) {
                const colors = getRatingColors(allEvents[0].rating);
                gradient.addColorStop(0, colors.line);
                gradient.addColorStop(1, colors.line);
              } else if (stops > 1) {
                const denominator = Math.max(stops - 1, 1);
                allEvents.forEach((event, index) => {
                  const colors = getRatingColors(event.rating);
                  const position = index / denominator;
                  gradient.addColorStop(position, colors.line);
                });
              }
              return gradient;
            }
            return "rgba(255, 255, 255, 0.6)";
          },
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderWidth: 4,
          fill: false,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: pointColors,
          pointBorderColor: "rgba(255, 255, 255, 0.6)",
          pointBorderWidth: 1,
          pointHoverBackgroundColor: pointColors,
          pointHoverBorderColor: "rgba(255, 255, 255, 0.9)",
          pointHoverBorderWidth: 2,
        },
      ],
    };
  }, [days]);

  // Get selected event time for vertical line
  const selectedEventTime = useMemo(() => {
    // First try to find manually selected event (user clicked on chart or calendar)
    const selectedDay = days.find(day => day.date === selectedDate);
    if (selectedDay) {
      const selectedEvent = selectedType === "sunrise" ? selectedDay.sunrise : selectedDay.sunset;
      if (selectedEvent?.eventTime) {
        return selectedEvent.eventTime * 1000;
      }
    }
    
    // Fallback to auto-focus event if no manual selection is available
    for (const day of days) {
      if (day.sunrise?.isAutoFocus) {
        return day.sunrise.eventTime * 1000;
      }
      if (day.sunset?.isAutoFocus) {
        return day.sunset.eventTime * 1000;
      }
    }
    
    return null;
  }, [days, selectedDate, selectedType]);

  const handlePointClick = useCallback<NonNullable<ChartOptions<"line">["onClick"]>>(
    (_event, elements, chart) => {
      if (!hrefBuilder || elements.length === 0) {
        return;
      }

      const element = elements[0];
      const dataset = chart.data.datasets?.[element.datasetIndex];
      const datum = (dataset?.data?.[element.index] as WeeklyEventPoint | undefined) ?? null;

      if (!datum) {
        return;
      }

      const href = hrefBuilder(datum.date, datum.type);
      if (!href) {
        return;
      }

      navigate(href, { preventScrollReset: true });
    },
    [hrefBuilder, navigate]
  );

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false, // Hide legend since we have single line
      },
      tooltip: {
        mode: "point",
        intersect: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "rgba(255, 255, 255, 0.9)",
        bodyColor: "rgba(255, 255, 255, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: function(tooltipItems) {
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
          label: function(context) {
            const rating = Math.round(context.parsed.y);
            const quality = rating >= 95 ? "Exceptional" 
                          : rating >= 85 ? "Excellent"
                          : rating >= 80 ? "Very Good"
                          : rating >= 70 ? "Good"
                          : rating >= 60 ? "Decent"
                          : rating >= 45 ? "Fair"
                          : rating >= 30 ? "Poor"
                          : rating >= 20 ? "Very Poor"
                          : "Terrible";
            const rawPoint = context.raw as WeeklyEventPoint | undefined;
            const eventType = rawPoint?.type === "sunrise" ? "Sunrise" : "Sunset";
            return `${eventType}: ${rating} (${quality})`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "day",
          displayFormats: {
            day: "MMM dd",
          },
          tooltipFormat: "PPpp",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawOnChartArea: true,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            size: 12,
          },
        },
        title: {
          display: true,
          text: "Date & Time",
          color: "rgba(255, 255, 255, 0.8)",
          font: {
            size: 13,
            weight: 500,
          },
        },
      },
      y: {
        min: -5,
        max: 105,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawOnChartArea: true,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            size: 12,
          },
          stepSize: 10,
          callback: function(value) {
            const numeric =
              typeof value === "string" ? Number.parseFloat(value) : value;
            if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
              return "";
            }
            return numeric;
          },
        },
        title: {
          display: true,
          text: "Viewing Quality Rating",
          color: "rgba(255, 255, 255, 0.8)",
          font: {
            size: 13,
            weight: 500,
          },
        },
      },
    },
    interaction: {
      mode: "point",
      intersect: true,
    },
    onClick: handlePointClick,
    elements: {
      point: {
        hoverBackgroundColor: "rgba(255, 255, 255, 1)",
      },
    },
  };

  // Custom plugin to draw vertical lines
  const verticalLinesPlugin = {
    id: "verticalLines",
    beforeDraw: (chart: any) => {
      const { ctx, scales } = chart;
      const xScale = scales.x;
      
      ctx.save();
      
      // Draw current time line (faint gray)
      if (currentTime) {
        const currentTimeMs = currentTime * 1000;
        if (currentTimeMs >= xScale.min && currentTimeMs <= xScale.max) {
          const xPosition = xScale.getPixelForValue(currentTimeMs);
          
          ctx.beginPath();
          ctx.strokeStyle = "rgba(156, 163, 175, 0.4)"; // Faint gray
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.moveTo(xPosition, scales.y.top);
          ctx.lineTo(xPosition, scales.y.bottom);
          ctx.stroke();
          
          // Small "NOW" label
          ctx.fillStyle = "rgba(156, 163, 175, 0.6)";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("NOW", xPosition, scales.y.bottom + 15);
        }
      }
      
      // Draw selected event time line (bright white)
      if (selectedEventTime && selectedEventTime >= xScale.min && selectedEventTime <= xScale.max) {
        const xPosition = xScale.getPixelForValue(selectedEventTime);
        
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; // Bright white
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.moveTo(xPosition, scales.y.top);
        ctx.lineTo(xPosition, scales.y.bottom);
        ctx.stroke();
        
        // "SELECTED" label
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SELECTED", xPosition, scales.y.bottom + 30);
      }
      
      ctx.restore();
    },
  };

  return (
    <div className="relative w-full h-64 sm:h-80 lg:h-96">
      <Line 
        data={chartData} 
        options={options} 
        plugins={[verticalLinesPlugin]}
      />
    </div>
  );
}
