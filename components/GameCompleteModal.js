"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const SCORE_LABELS = ["1", "2", "3", "4", "5"];

export default function GameCompleteModal({
  isOpen,
  onClose,
  totalScores,
  allPlayers,
  lobbyId,
  currentUserId,
  onStartNewGame,
  isHost,
}) {
  const [scenarioRating, setScenarioRating] = useState(null);
  const [taskRating, setTaskRating] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  if (!isOpen) return null;

  // Calculate final scores and determine winners
  const sortedPlayers = allPlayers
    ? [...allPlayers]
        .map((player) => {
          const playerTotal = totalScores?.[player.id];
          const totalScore = playerTotal?.totalScore || 0;
          const roundsPlayed = playerTotal?.roundsPlayed || 0;
          const averageScore = roundsPlayed > 0 ? totalScore / roundsPlayed : 0;
          return {
            ...player,
            totalScore,
            roundsPlayed,
            averageScore,
          };
        })
        .sort((a, b) => b.averageScore - a.averageScore)
    : [];

  // Find champions (players with highest average score)
  const champions = [];
  if (sortedPlayers.length > 0) {
    const highestScore = sortedPlayers[0].averageScore;
    champions.push(...sortedPlayers.filter((p) => p.averageScore === highestScore));
  }

  const handleSubmitFeedback = async () => {
    if (!lobbyId || !currentUserId) return;
    if (!scenarioRating || !taskRating) {
      alert("Lütfen senaryolar ve görevler için puan verin.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "lobbies", lobbyId, "feedback"), {
        userId: currentUserId,
        scenarioRating: Number(scenarioRating),
        taskRating: Number(taskRating),
        feedbackText: feedbackText.trim() || null,
        submittedAt: serverTimestamp(),
      });
      setHasSubmitted(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Geri bildirim gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/20 bg-gradient-to-br from-purple-900/90 to-pink-900/90 p-6 text-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Close"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-3xl font-bold">Oyun Tamamlandı! 🎉</h2>
            <p className="mt-2 text-purple-200">
              Tüm roundlar tamamlandı. Final sonuçları:
            </p>
          </div>

          {/* Champions */}
          {champions.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-400/20 to-orange-500/20 p-4 border border-amber-400/30">
              <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-amber-300">
                {champions.length === 1 ? "🏆 Şampiyon" : "🏆 Şampiyonlar"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {champions.map((champion) => (
                  <div
                    key={champion.id}
                    className="rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-2 text-black"
                  >
                    <p className="font-bold">{champion.name}</p>
                    <p className="text-xs">
                      {champion.averageScore.toFixed(1)} avg
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Leaderboard */}
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-200">
              Final Sıralaması
            </p>
            {sortedPlayers.map((player, index) => {
              const isChampion = champions.some((c) => c.id === player.id);
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    isChampion
                      ? "bg-gradient-to-r from-amber-300/20 to-orange-400/20 border border-amber-400/30"
                      : "bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-purple-300">
                      #{index + 1}
                    </span>
                    <p className="font-semibold">{player.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {player.averageScore.toFixed(1)} avg
                    </p>
                    <p className="text-xs text-purple-200">
                      {player.totalScore.toFixed(1)} total ({player.roundsPlayed}{" "}
                      rounds)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feedback Form */}
          {!hasSubmitted ? (
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
          ) : (
            <div className="rounded-2xl bg-green-500/20 border border-green-400/30 p-4 text-center">
              <p className="font-semibold text-green-300">
                ✓ Geri bildiriminiz gönderildi. Teşekkürler!
              </p>
            </div>
          )}

          {/* Start New Game Button (Host only) */}
          {isHost && (
            <button
              onClick={onStartNewGame}
              disabled={!hasSubmitted}
              className="w-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-4 py-3 text-base font-semibold text-black shadow-lg shadow-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasSubmitted ? "Yeni Oyun Başlat" : "Önce geri bildirim gönderin"}
            </button>
          )}
          
          {/* Close button for non-host users */}
          {!isHost && hasSubmitted && (
            <button
              onClick={onClose}
              className="w-full rounded-full bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-3 text-base font-semibold text-white shadow-lg"
            >
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

