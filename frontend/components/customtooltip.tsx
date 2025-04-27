"use client";

import { useTheme } from "next-themes";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number; // label will now be number (timestamp)
  timePeriod?: "day" | "week" | "month";
}

export default function CustomTooltip({ active, payload, label, timePeriod }: CustomTooltipProps) {
  const { theme } = useTheme();

  if (active && payload && payload.length && label != null) {
    const data = payload[0];
    const value = data.value;

    const date = new Date(label);
    let formattedLabel = "";
    if (timePeriod === "day") {
      formattedLabel = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else {
      formattedLabel = date.toLocaleDateString();
    }

    return (
      <div
        className={`rounded-md px-3 py-2 shadow-md border text-sm ${
          theme === "dark"
            ? "bg-slate-800 border-slate-700 text-slate-100"
            : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        <div className="font-semibold">{formattedLabel}</div>
        <div className="text-primary">${value.toFixed(2)}</div>
      </div>
    );
  }

  return null;
}
