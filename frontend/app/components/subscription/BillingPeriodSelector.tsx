"use client";

import React from "react";

export type BillingPeriod = 1 | 3 | 6 | 12;

export const BILLING_OPTIONS: {
  months: BillingPeriod;
  label: string;
  discount: number; // percentage
}[] = [
  { months: 1,  label: "Monthly",  discount: 0  },
  { months: 3,  label: "3 Months", discount: 10 },
  { months: 6,  label: "6 Months", discount: 20 },
  { months: 12, label: "12 Months", discount: 30 },
];

/** Total STX charged upfront for a given monthly price + period */
export function calcStxTotal(monthlyStx: number, period: BillingPeriod): number {
  const opt = BILLING_OPTIONS.find((o) => o.months === period)!;
  return Math.round(monthlyStx * period * (1 - opt.discount / 100));
}

/** Per-month equivalent for display */
export function calcStxPerMonth(monthlyStx: number, period: BillingPeriod): number {
  return Math.round(calcStxTotal(monthlyStx, period) / period);
}

interface BillingPeriodSelectorProps {
  value: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
}

export const BillingPeriodSelector: React.FC<BillingPeriodSelectorProps> = ({
  value,
  onChange,
}) => (
  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] w-fit">
    {BILLING_OPTIONS.map((opt) => {
      const active = opt.months === value;
      return (
        <button
          key={opt.months}
          onClick={() => onChange(opt.months)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            active
              ? "bg-[#FF5500] text-white shadow-sm"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {opt.label}
          {opt.discount > 0 && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                active
                  ? "bg-white/20 text-white"
                  : "bg-[rgba(255,85,0,0.15)] text-[#FF5500]"
              }`}
            >
              -{opt.discount}%
            </span>
          )}
        </button>
      );
    })}
  </div>
);
