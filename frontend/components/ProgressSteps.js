"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Ordered pipeline steps shown to the user (skipping raw "pending")
const STEPS = [
  { key: "downloading", label: "Downloading" },
  { key: "transcribing", label: "Transcribing" },
  { key: "analyzing", label: "Analyzing" },
  { key: "clipping", label: "Clipping" },
  { key: "completed", label: "Done" },
];

/**
 * Map a video status string to a step index (0-based).
 * "pending" is treated as about to start downloading.
 */
function statusToIndex(status) {
  if (status === "pending") return 0;
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

/**
 * Clean step indicator for the processing page.
 * Highlights the current step and shows a subtle progress bar.
 */
export default function ProgressSteps({ status }) {
  const currentIndex = statusToIndex(status);
  const percent = Math.round(((currentIndex + 1) / STEPS.length) * 100);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-zinc-900">
            Creating your clips
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            This usually takes a few minutes. You can leave this page open.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-full capitalize">
          {status === "pending" ? "starting" : status}
        </Badge>
      </div>

      <Progress value={percent} className="w-full" />

      <ol className="grid gap-2 sm:grid-cols-5">
        {STEPS.map((step, index) => {
          const isDone = index < currentIndex || status === "completed";
          const isCurrent = index === currentIndex && status !== "completed";

          return (
            <li
              key={step.key}
              className={cn(
                "rounded-xl border px-3 py-3 text-center text-sm transition-colors",
                isDone && "border-zinc-900 bg-zinc-900 text-white",
                isCurrent && "border-zinc-900 bg-white text-zinc-900 shadow-sm",
                !isDone &&
                  !isCurrent &&
                  "border-zinc-200 bg-zinc-50 text-zinc-400"
              )}
            >
              <span className="block text-[11px] uppercase tracking-wide opacity-70">
                Step {index + 1}
              </span>
              <span className="mt-0.5 block font-medium">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
