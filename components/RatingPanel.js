import { useMemo } from "react";

const SCORE_LABELS = ["1", "2", "3", "4", "5"];

export default function RatingPanel({
  performers,
  ratings,
  onRatingChange,
  onSubmit,
  currentUserId,
}) {
  // Filter out current user from performers to rate (users can't rate themselves)
  const performersToRate = performers.filter((p) => p.id !== currentUserId);
  
  const isReady = useMemo(() => {
    return performersToRate.every((performer) => !!ratings[performer.id]);
  }, [performersToRate, ratings]);

  return (
    <section className="space-y-4 rounded-3xl bg-white/10 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Rate the performers</h3>
        <span className="text-sm text-purple-100">
          Slide to choose 1-5 ⭐️
        </span>
      </div>

      {performersToRate.map((performer) => (
        <div
          key={performer.id}
          className="rounded-2xl border border-white/5 bg-white/5 p-4"
        >
          <p className="text-sm uppercase tracking-[0.35em] text-purple-200">
            {performer.name}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            {SCORE_LABELS.map((score) => {
              const isSelected = ratings[performer.id] === Number(score);
              return (
                <button
                  key={score}
                  onClick={() => onRatingChange(performer.id, Number(score))}
                  className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "bg-gradient-to-r from-yellow-300 to-orange-400 text-black"
                      : "bg-white/5 text-white"
                  }`}
                >
                  {score}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        disabled={!isReady}
        onClick={onSubmit}
        className="w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit ratings
      </button>
    </section>
  );
}

