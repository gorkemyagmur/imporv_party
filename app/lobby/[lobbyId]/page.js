"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import CountdownTimer from "@/components/CountdownTimer";
import DurationSelector from "@/components/DurationSelector";
import PerformerRoleCard from "@/components/PerformerRoleCard";
import PlayerList from "@/components/PlayerList";
import RatingPanel from "@/components/RatingPanel";
import RoundResults from "@/components/RoundResults";
import ScenarioCard from "@/components/ScenarioCard";

const SCENARIOS = [
  {
    title: "Elevator Stand-off",
    description:
      "The lift jammed between floors. Only some of you can reach the emergency panel.",
    performers: 2,
  },
  {
    title: "Supermarket Showdown",
    description:
      "There’s one last legendary snack and multiple carts racing toward it.",
    performers: 3,
  },
  {
    title: "Missing Luggage Mayhem",
    description:
      "Your bags vanished at baggage claim. Blame and rumors fly everywhere.",
    performers: 3,
  },
  {
    title: "Apartment Argument",
    description:
      "Fed-up neighbors confront each other about the mysterious 3 a.m. noise.",
    performers: 2,
  },
  {
    title: "Arcade Rivalry",
    description:
      "Two gamers claim the crown on the retro machine while a judge mediates.",
    performers: 3,
  },
  {
    title: "Airport Upgrade Scheme",
    description:
      "Only a couple of passengers can be upgraded. Convince the gate agent.",
    performers: 2,
  },
];

const ROLES = [
  "Overly dramatic about everything",
  "Always apologizing for no reason",
  "Conspiracy theorist",
  "Speaks only in questions",
  "Secret superhero who cannot reveal it",
  "Mimics everyone else",
  "DJ narrating the scene like a radio host",
  "Hyper-competitive rival",
];

function randomId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function getRandomItems(list, count) {
  const pool = [...list];
  const selected = [];
  while (selected.length < count && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

export default function LobbyPage() {
  const params = useParams();
  const lobbyId = (params?.lobbyId || "").toString();
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [currentRound, setCurrentRound] = useState(null);
  const [ratings, setRatings] = useState({});
  const [history, setHistory] = useState([]);
  const [duration, setDuration] = useState(60);

  const lobbyCode = (lobbyId || "").toUpperCase();
  const isRoundActive = Boolean(currentRound);

  const lobbyIsFull = players.length >= 6;

  function handleAddPlayer(event) {
    event?.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed || lobbyIsFull) {
      return;
    }

    setPlayers((prev) => [
      ...prev,
      {
        id: randomId("player"),
        name: trimmed,
      },
      ]);
    setPlayerName("");
  }

  function handleRemovePlayer(playerId) {
    setPlayers((prev) => prev.filter((player) => player.id !== playerId));
    setRatings((prev) => {
      const updated = { ...prev };
      delete updated[playerId];
      return updated;
    });
  }

  function handleStartRound() {
    if (players.length < 2 || currentRound) {
      return;
    }

    const eligibleScenarios = SCENARIOS.filter(
      (scene) => scene.performers <= players.length
    );
    const scenarioPool =
      eligibleScenarios.length > 0 ? eligibleScenarios : SCENARIOS;
    const scenario =
      scenarioPool[Math.floor(Math.random() * scenarioPool.length)];
    const performerCount = Math.min(
      scenario.performers ?? (Math.random() > 0.5 ? 3 : 2),
      players.length,
      3
    );

    const performers = getRandomItems(players, performerCount);
    const rolesSelection = getRandomItems(ROLES, performers.length);
    const roleMap = performers.reduce((acc, performer, index) => {
      acc[performer.id] = rolesSelection[index];
      return acc;
    }, {});

    // TODO: Replace random scenario/role logic with an AI-generated prompt or remote service.
    setCurrentRound({
      id: randomId("round"),
      performers,
      scenario,
      roles: roleMap,
      status: "countdown",
      scores: {},
      duration,
    });
    setRatings({});
  }

  function handleCountdownFinish() {
    setCurrentRound((prev) => (prev ? { ...prev, status: "rating" } : prev));
  }

  function handleRatingChange(performerId, value) {
    setRatings((prev) => ({ ...prev, [performerId]: value }));
  }

  function handleSubmitRatings() {
    if (!currentRound) {
      return;
    }

    const scores = currentRound.performers.reduce((acc, performer) => {
      acc[performer.id] = ratings[performer.id] ?? 0;
      return acc;
    }, {});

    const winner = [...currentRound.performers].sort((a, b) => {
      const scoreDiff = (scores[b.id] ?? 0) - (scores[a.id] ?? 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return a.name.localeCompare(b.name);
    })[0];

    setHistory((prev) => [
      {
        roundId: currentRound.id,
        winnerId: winner.id,
        winnerName: winner.name,
        scores,
      },
      ...prev,
    ]);

    setCurrentRound((prev) =>
      prev
        ? {
            ...prev,
            status: "results",
            scores,
            winnerId: winner.id,
          }
        : prev
    );
  }

  function handleNextRound() {
    setCurrentRound(null);
    setRatings({});
    // TODO: Sync this action with a backend/WebSocket when multi-device support ships.
  }

  const phase = currentRound?.status ?? "idle";

  const canStartRound = players.length >= 2 && !isRoundActive;

  const activeHistory = useMemo(() => history.slice(0, 5), [history]);

  return (
    <main className="min-h-screen px-4 pb-28 pt-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
          <p className="text-xs uppercase tracking-[0.5em] text-purple-200">
            Lobby code
          </p>
          <div className="flex items-end justify-between">
            <h1 className="text-4xl font-semibold text-white">
              {lobbyCode || "----"}
            </h1>
            <p className="text-sm text-purple-100">Share with everyone</p>
          </div>
        </header>

        <PlayerList
          players={players}
          playerName={playerName}
          onPlayerNameChange={setPlayerName}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          isFull={lobbyIsFull}
        />

        {!isRoundActive && (
          <DurationSelector value={duration} onChange={setDuration} />
        )}

        <button
          onClick={handleStartRound}
          disabled={!canStartRound}
          className="rounded-3xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 px-6 py-5 text-xl font-semibold text-white shadow-xl shadow-pink-500/40 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRoundActive ? "Round in progress" : "Start new round"}
        </button>

        {!isRoundActive && players.length < 2 && (
          <p className="text-sm text-purple-100">
            En az iki oyuncu ekle, maksimum üç kişi sahneye çıkacak.
          </p>
        )}

        {isRoundActive && (
          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <ScenarioCard
              title={currentRound.scenario.title}
              description={currentRound.scenario.description}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {currentRound.performers.map((performer) => (
                <PerformerRoleCard
                  key={performer.id}
                  name={performer.name}
                  role={currentRound.roles[performer.id]}
                />
              ))}
            </div>

            {phase === "countdown" && (
              <CountdownTimer
                key={currentRound.id}
                duration={currentRound.duration || duration}
                isActive={phase === "countdown"}
                onFinish={handleCountdownFinish}
              />
            )}

            {phase === "rating" && (
              <RatingPanel
                performers={currentRound.performers}
                ratings={ratings}
                onRatingChange={handleRatingChange}
                onSubmit={handleSubmitRatings}
              />
            )}

            {phase === "results" && (
              <RoundResults
                performers={currentRound.performers}
                scores={currentRound.scores}
                winnerId={currentRound.winnerId}
                onNextRound={handleNextRound}
              />
            )}
          </section>
        )}

        <section className="rounded-3xl border border-white/5 bg-white/5 p-5 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">History</h3>
            <span className="text-sm text-purple-100">
              {history.length} round{history.length === 1 ? "" : "s"}
            </span>
          </div>
          {activeHistory.length === 0 ? (
            <p className="mt-4 text-sm text-purple-100">
              Start a round to build your MVP timeline.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {activeHistory.map((round) => (
                <li
                  key={round.roundId}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                      Winner
                    </p>
                    <p className="text-base font-semibold">{round.winnerName}</p>
                  </div>
                  <p className="text-base font-bold text-amber-300">
                    {typeof round.scores[round.winnerId] === "number"
                      ? `${round.scores[round.winnerId].toFixed(1)} pts`
                      : "--"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

