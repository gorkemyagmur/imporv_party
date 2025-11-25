export default function RoundResults({
  performers,
  scores,
  winnerId,
  onNextRound,
  totalScores,
  allPlayers,
}) {
  // Sort players by total score for leaderboard
  const sortedPlayers = allPlayers
    ? [...allPlayers].sort((a, b) => {
        const scoreA = totalScores?.[a.id]?.totalScore || 0;
        const scoreB = totalScores?.[b.id]?.totalScore || 0;
        return scoreB - scoreA;
      })
    : [];

  return (
    <section className="space-y-4 rounded-3xl bg-white/10 p-5 text-white shadow-lg">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-purple-200">
          Round Results
        </p>
        <h3 className="mt-2 text-2xl font-semibold">
          {winnerId ? "MVP crowned!" : "Awaiting scores"}
        </h3>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm font-semibold text-purple-200">This Round:</p>
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

      {allPlayers && allPlayers.length > 0 && (
        <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
          <p className="text-sm font-semibold text-purple-200">Overall Scores:</p>
          {sortedPlayers.map((player, index) => {
            const playerTotal = totalScores?.[player.id];
            const totalScore = playerTotal?.totalScore || 0;
            const roundsPlayed = playerTotal?.roundsPlayed || 0;
            const averageScore = roundsPlayed > 0 ? totalScore / roundsPlayed : 0;
            
            return (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-purple-300">#{index + 1}</span>
                  <p className="text-base font-semibold">{player.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {averageScore.toFixed(1)} avg
                  </p>
                  <p className="text-xs text-purple-200">
                    {totalScore.toFixed(1)} total ({roundsPlayed} rounds)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={onNextRound}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-4 py-3 text-base font-semibold text-black shadow-lg shadow-emerald-400/40"
      >
        Start next round
      </button>
    </section>
  );
}

