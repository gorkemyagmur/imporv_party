export default function RoundResults({
  performers,
  scores,
  winnerId,
  onNextRound,
}) {
  return (
    <section className="rounded-3xl bg-white/10 p-5 text-white shadow-lg">
      <p className="text-xs uppercase tracking-[0.4em] text-purple-200">
        Round Results
      </p>
      <h3 className="mt-2 text-2xl font-semibold">
        {winnerId ? "MVP crowned!" : "Awaiting scores"}
      </h3>
      <div className="mt-4 space-y-3">
        {performers.map((performer) => {
          const score = scores[performer.id];
          const isWinner = performer.id === winnerId;
          return (
            <div
              key={performer.id}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                isWinner
                  ? "bg-gradient-to-r from-amber-300/80 to-orange-400/80 text-black"
                  : "bg-white/5 text-white"
              }`}
            >
              <p className="text-lg font-semibold">{performer.name}</p>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span>
                  {typeof score === "number" ? score.toFixed(1) : "-"}
                </span>
                {isWinner && (
                  <span className="rounded-full bg-black/20 px-2 py-1 text-xs uppercase tracking-wide">
                    MVP
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onNextRound}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-4 py-3 text-base font-semibold text-black shadow-lg shadow-emerald-400/40"
      >
        Start next round
      </button>
    </section>
  );
}

