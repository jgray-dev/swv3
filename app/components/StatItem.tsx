interface StatItemProps {
  label: string;
  value: number;
  maxValue?: number;
  unit?: string;
  isVisibility?: boolean;
}

export default function StatItem({ label, value, maxValue, unit, isVisibility = false }: StatItemProps) {
  // Handle visibility special case
  if (isVisibility) {
    const feetToMiles = (feet: number) => Math.round(feet / 5280 * 10) / 10;
    const visibilityMiles = feetToMiles(value);
    const progress = Math.min(100, Math.max(0, (Math.min(value, 52800) / 52800) * 100));
    return (
      <div className="flex flex-col space-y-1 py-1" role="group" aria-labelledby="visibility-label">
        <div className="flex justify-between items-center">
          <span id="visibility-label" className="text-sm text-slate-200">{label}</span>
          <span className="text-sm font-medium text-slate-100" aria-live="polite">
            {visibilityMiles} miles
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={52800}
          aria-valuenow={value}
          aria-valuetext={`${visibilityMiles} miles visibility`}
          className="h-2 bg-white/5 rounded-full"
          id={`${label}`}
        >
          <div
            className="h-full bg-white/30 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Handle regular stats
  const displayValue = maxValue
    ? `${Math.round(value)}${unit || ''}`
    : `${Math.round(value)}%`;

  const percentage = maxValue
    ? Math.min(100, (Math.min(value, maxValue) / maxValue) * 100)
    : Math.min(100, value);

  return (
    <div className="flex flex-col space-y-1 py-1" role="group" aria-labelledby="stat-label">
      <div className="flex justify-between items-center">
        <span id="stat-label" className="text-sm text-slate-200">{label}</span>
        <span className="text-sm font-medium text-slate-100" aria-live="polite">
          {displayValue}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxValue || 100}
        aria-valuenow={value}
        aria-valuetext={`${displayValue}`}
        className="h-2 bg-white/5 rounded-full"
        id={`${label}`}
      >
        <div
          className="h-full bg-white/30 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}