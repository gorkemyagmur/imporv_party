import { useState } from "react";

const SCORE_LABELS = ["1", "2", "3", "4", "5"];

export default function RoundResults({
  performers,
  scores,
  winnerId,
  onNextRound,
  totalScores,
  allPlayers,
  isHost,
  currentRoundNumber,
  totalRounds,
  onStartNewGame,
}) {
  const [scenarioRating, setScenarioRating] = useState(null);
  const [taskRating, setTaskRating] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const isGameFinished = currentRoundNumber >= totalRounds && totalRounds > 0;

  const handleSubmitFeedback = async () => {
    if (!scenarioRating || !taskRating) {
      alert("Lütfen senaryolar ve görevler için puan verin.");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      setHasSubmitted(true);
      alert("Geri Bildiriminiz İçin Teşekkürler");
    }, 500);
  };
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

      {/* Check if all rounds are completed */}
      {isGameFinished ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-3xl bg-white/10 p-5 text-center text-white">
            <p className="text-sm text-purple-100 mb-4">
              Tüm roundlar tamamlandı! Oyun sonu sonuçları gösteriliyor...
            </p>
            {!showFeedback && !hasSubmitted && (
              <button
                onClick={() => setShowFeedback(true)}
                className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/40"
              >
                Geri Bildirim Ver
              </button>
            )}
          </div>

          {/* Feedback Form */}
          {showFeedback && !hasSubmitted && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-200">
                Geri Bildirim
              </p>

              {/* Scenario Rating */}
              <div>
                <p className="mb-2 text-sm text-white">
                  Senaryolar ne kadar tatmin ediciydi?
                </p>
                <div className="flex gap-2">
                  {SCORE_LABELS.map((score) => {
                    const isSelected = scenarioRating === Number(score);
                    return (
                      <button
                        key={score}
                        onClick={() => setScenarioRating(Number(score))}
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

              {/* Task Rating */}
              <div>
                <p className="mb-2 text-sm text-white">
                  Bireysel görevler ne kadar tatmin ediciydi?
                </p>
                <div className="flex gap-2">
                  {SCORE_LABELS.map((score) => {
                    const isSelected = taskRating === Number(score);
                    return (
                      <button
                        key={score}
                        onClick={() => setTaskRating(Number(score))}
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

              {/* Text Feedback */}
              <div>
                <p className="mb-2 text-sm text-white">
                  Bildirmek istediğiniz bir feedback var mı?
                </p>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Geri bildiriminizi buraya yazın..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-purple-200 focus:border-pink-300 focus:outline-none"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitFeedback}
                disabled={!scenarioRating || !taskRating || isSubmitting}
                className="w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Gönderiliyor..." : "Geri Bildirim Gönder"}
              </button>
            </div>
          )}

          {hasSubmitted && (
            <div className="rounded-2xl bg-green-500/20 border border-green-400/30 p-4 text-center">
              <p className="font-semibold text-green-300">
                ✓ Geri bildiriminiz gönderildi. Teşekkürler!
              </p>
            </div>
          )}

          {/* Yeni Oyun Başlat Button (Admin only) */}
          {isHost && onStartNewGame && (
            <button
              onClick={onStartNewGame}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-4 text-lg font-semibold text-black shadow-xl shadow-emerald-400/40 transition active:scale-[0.99]"
            >
              Yeni Oyun Başlat
            </button>
          )}
        </div>
      ) : isHost ? (
        <button
          onClick={onNextRound}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-4 py-3 text-base font-semibold text-black shadow-lg shadow-emerald-400/40"
        >
          {currentRoundNumber > 0 ? "Start Next Round" : "Start New Round"}
        </button>
      ) : (
        <div className="mt-6 rounded-3xl bg-white/10 p-5 text-center text-white">
          <p className="text-sm text-purple-100">
            Admin'in yeni round'u başlatması bekleniyor...
          </p>
        </div>
      )}
    </section>
  );
}

