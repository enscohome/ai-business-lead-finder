import { Star } from "lucide-react";
import type { RatingSummary as Summary } from "@/types/freelancer";
export function RatingSummary({ ratings }: { ratings: Summary }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <div className="text-center">
        <p className="text-4xl font-bold">
          {ratings.total ? ratings.average.toFixed(1) : "—"}
        </p>
        <div className="mt-1 flex justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i <= Math.round(ratings.average) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {ratings.total} approved review{ratings.total === 1 ? "" : "s"}
        </p>
      </div>
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((stars) => (
          <div key={stars} className="flex items-center gap-2 text-xs">
            <span className="w-8">{stars} star</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-amber-400"
                style={{
                  width: `${ratings.total ? (ratings.distribution[stars as 1 | 2 | 3 | 4 | 5] / ratings.total) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="w-5 text-right">
              {ratings.distribution[stars as 1 | 2 | 3 | 4 | 5]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
