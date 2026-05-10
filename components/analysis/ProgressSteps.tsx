import type { AnalysisStep } from "@/hooks/useAnalysis";

type ProgressStepsProps = {
  steps: AnalysisStep[];
};

function StepIcon({ status }: { status: AnalysisStep["status"] }) {
  if (status === "complete") {
    return (
      <div className="flex h-5 w-5 items-center justify-center text-sm font-bold text-clarity">
        ✓
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-5 w-5 items-center justify-center text-sm font-bold text-red-500">
        ×
      </div>
    );
  }

  return (
    <div
      className={[
        "h-3 w-3 rounded-full border border-[#1A1A1A]/20",
        status === "running" ? "animate-pulse bg-action" : "bg-[#D5D0C7]",
      ].join(" ")}
    />
  );
}

export function ProgressSteps({ steps }: ProgressStepsProps) {
  return (
    <section className="border border-[#E8E4DD] bg-white p-6">
      <div className="mb-5 flex items-center justify-between border-b border-[#E8E4DD] pb-4">
        <h2 className="font-heading text-2xl uppercase tracking-tight text-ink">
          Signal Progress
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
          Live
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className="border-b border-[#E8E4DD] pb-4 last:border-b-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <div className="pt-1">
                <StepIcon status={step.status} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <p
                    className={[
                      "font-mono text-[11px] uppercase tracking-[0.14em]",
                      step.status === "pending" ? "text-ink/35" : "text-ink",
                      step.status === "error" ? "text-red-500" : "",
                    ].join(" ")}
                  >
                    {step.label}
                  </p>

                  {step.status === "running" ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-action border-t-transparent" />
                  ) : null}
                </div>

                {step.status === "complete" && step.summary ? (
                  <p className="mt-1 text-sm text-ink/65">{step.summary}</p>
                ) : null}

                {step.status === "error" ? (
                  <p className="mt-1 text-sm text-red-500">Signal unavailable</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
