"use client";

import { useState } from "react";
import type { ValidationDay } from "@/hooks/useAnalysis";

type ValidationPlanProps = {
  plan: ValidationDay[];
};

export function ValidationPlan({ plan }: ValidationPlanProps) {
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({
    5: true,
    6: true,
    7: true,
  });

  return (
    <section className="border border-[#E8E4DD] bg-white p-6">
      <div className="mb-5 border-b border-[#E8E4DD] pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
          Execution
        </p>
        <h2 className="font-heading text-3xl uppercase tracking-tight text-ink">
          7-Day Validation Plan
        </h2>
      </div>

      <div className="space-y-3">
        {plan.map((day) => {
          const expanded = Boolean(openDays[day.day]);
          const isDecisionPoint = day.day === 7;

          return (
            <button
              key={day.day}
              type="button"
              onClick={() =>
                setOpenDays((current) => ({
                  ...current,
                  [day.day]: !expanded,
                }))
              }
              className={[
                "block w-full border border-[#E8E4DD] bg-canvas p-4 text-left",
                isDecisionPoint ? "border-l-4 border-l-action" : "",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink/45">
                    Day {day.day}
                  </span>
                  <span className="text-sm text-ink">{day.action}</span>
                </div>

                {isDecisionPoint ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-action">
                    Decision Point
                  </span>
                ) : null}
              </div>

              {expanded ? (
                <div className="mt-3 space-y-2 text-sm text-ink/70">
                  <p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                      Goal:
                    </span>{" "}
                    {day.goal}
                  </p>
                  <p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                      ✓ when:
                    </span>{" "}
                    {day.successSignal}
                  </p>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
