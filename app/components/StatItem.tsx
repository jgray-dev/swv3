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

    // Logarithmic scale for visibility progress
    // 0-10 miles (52800 feet) is typical range
    const progress = Math.min(100, Math.max(0, (Math.min(value, 52800) / 52800) * 100));
    return (
      <div className="flex flex-col space-y-1 py-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-200">{label}</span>
          <span className="text-sm font-medium text-slate-100">
            {visibilityMiles} mi
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full">
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
    <div className="flex flex-col space-y-1 py-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-200">{label}</span>
        <span className="text-sm font-medium text-slate-100">{displayValue}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full">
        <div
          className="h-full bg-white/30 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}