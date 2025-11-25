"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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
  const [duration, setDuration] = useState(60);
  const [lobby, setLobby] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const lobbyCode = (lobbyId || "").toUpperCase();
  const isRoundActive = Boolean(currentRound);
  const isHost = currentUser && lobby && currentUser.uid === lobby.hostId;

  const lobbyIsFull = players.length >= 6;

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to lobby document
  useEffect(() => {
    if (!lobbyId) return;
    const lobbyRef = doc(db, "lobbies", lobbyId);
    const unsubscribe = onSnapshot(lobbyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLobby(data);
        setDuration(data.roundDuration || 60);
        // Reset round if no currentRoundId
        if (!data.currentRoundId) {
          setCurrentRound(null);
          setRatings({});
        }
      }
    });
    return () => unsubscribe();
  }, [lobbyId]);

  // Listen to players subcollection
  useEffect(() => {
    if (!lobbyId) return;
    const playersRef = collection(db, "lobbies", lobbyId, "players");
    const unsubscribe = onSnapshot(playersRef, (snap) => {
      const playersList = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPlayers(playersList);
    });
    return () => unsubscribe();
  }, [lobbyId]);

  // Listen to current round
  useEffect(() => {
    if (!lobbyId || !lobby?.currentRoundId) {
      return;
    }
    const roundRef = doc(db, "lobbies", lobbyId, "rounds", lobby.currentRoundId);
    const unsubscribe = onSnapshot(roundRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCurrentRound({
          id: snap.id,
          ...data,
        });
        // Load current user's ratings
        if (currentUser && data.ratings?.[currentUser.uid]) {
          setRatings(data.ratings[currentUser.uid]);
        } else {
          setRatings({});
        }
      } else {
        setCurrentRound(null);
        setRatings({});
      }
    });
    return () => unsubscribe();
  }, [lobbyId, lobby?.currentRoundId, currentUser]);

  async function handleAddPlayer(event) {
    event?.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed || lobbyIsFull || !currentUser || !lobbyId) {
      return;
    }

    // Check if current user is already in the list
    const existingPlayer = players.find((p) => p.id === currentUser.uid);
    if (existingPlayer) {
      // User already in list, just update their name
      try {
        const playerRef = doc(db, "lobbies", lobbyId, "players", currentUser.uid);
        await setDoc(
          playerRef,
          {
            name: trimmed,
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Update playerMap in lobby document
        const lobbyRef = doc(db, "lobbies", lobbyId);
        await updateDoc(lobbyRef, {
          [`playerMap.${currentUser.uid}`]: {
            name: trimmed,
            joinedAt: serverTimestamp(),
          },
        });

        setPlayerName("");
      } catch (err) {
        console.error("Error updating player:", err);
      }
      return;
    }

    // New player - add them to the list
    try {
      const playerRef = doc(db, "lobbies", lobbyId, "players", currentUser.uid);
      await setDoc(playerRef, {
        name: trimmed,
        joinedAt: serverTimestamp(),
      });

      // Update playerMap in lobby document
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        [`playerMap.${currentUser.uid}`]: {
          name: trimmed,
          joinedAt: serverTimestamp(),
        },
      });

      setPlayerName("");
    } catch (err) {
      console.error("Error adding player:", err);
    }
  }

  async function handleRemovePlayer(playerId) {
    // Only host can remove players
    if (!isHost || !lobbyId) return;

    try {
      const playerRef = doc(db, "lobbies", lobbyId, "players", playerId);
      await deleteDoc(playerRef);

      // Update playerMap in lobby document
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        [`playerMap.${playerId}`]: null,
      });
    } catch (err) {
      console.error("Error removing player:", err);
    }
  }

  async function handleStartRound() {
    // Only host can start rounds
    if (!isHost || players.length < 2 || currentRound || !lobbyId) {
      return;
    }

    try {
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

      const roundId = randomId("round");

      // Create round document
      const roundRef = doc(db, "lobbies", lobbyId, "rounds", roundId);
      await setDoc(roundRef, {
        scenario: {
          title: scenario.title,
          description: scenario.description,
        },
        performers: performers.map((p) => ({ id: p.id, name: p.name })),
        roles: roleMap,
        status: "countdown",
        duration,
        startedAt: serverTimestamp(),
        scores: {},
      });

      // Update lobby document
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        status: "countdown",
        currentRoundId: roundId,
        startedAt: serverTimestamp(),
        roundDuration: duration,
      });

      setRatings({});
    } catch (err) {
      console.error("Error starting round:", err);
    }
  }

  async function handleDurationChange(newDuration) {
    if (!isHost || !lobbyId || isRoundActive) return;
    try {
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        roundDuration: newDuration,
      });
      setDuration(newDuration);
    } catch (err) {
      console.error("Error updating duration:", err);
    }
  }

  async function handleCountdownFinish() {
    if (!lobbyId || !lobby?.currentRoundId) return;
    try {
      const roundRef = doc(db, "lobbies", lobbyId, "rounds", lobby.currentRoundId);
      await updateDoc(roundRef, {
        status: "rating",
      });
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        status: "rating",
      });
    } catch (err) {
      console.error("Error finishing countdown:", err);
    }
  }


  async function handleRatingChange(performerId, value) {
    if (!currentUser || !lobbyId || !lobby?.currentRoundId) return;
    try {
      const roundRef = doc(db, "lobbies", lobbyId, "rounds", lobby.currentRoundId);
      await updateDoc(roundRef, {
        [`ratings.${currentUser.uid}.${performerId}`]: value,
      });
      setRatings((prev) => ({ ...prev, [performerId]: value }));
    } catch (err) {
      console.error("Error updating rating:", err);
    }
  }

  async function handleSubmitRatings() {
    if (!currentRound || !lobbyId || !lobby?.currentRoundId) {
      return;
    }

    // Calculate scores from all ratings
    // This should ideally be done server-side, but for now we'll calculate client-side
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

    try {
      const roundRef = doc(db, "lobbies", lobbyId, "rounds", lobby.currentRoundId);
      await updateDoc(roundRef, {
        status: "results",
        scores,
        winnerId: winner.id,
        winnerName: winner.name,
      });

      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        status: "results",
      });
    } catch (err) {
      console.error("Error submitting ratings:", err);
    }
  }

  async function handleNextRound() {
    if (!isHost || !lobbyId) return;
    try {
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        status: "idle",
        currentRoundId: null,
        startedAt: null,
      });
      setRatings({});
    } catch (err) {
      console.error("Error starting next round:", err);
    }
  }

  const phase = currentRound?.status ?? "idle";

  const canStartRound = players.length >= 2 && !isRoundActive && isHost;

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

        {loading ? (
          <div className="rounded-3xl bg-white/10 p-5 text-center text-white">
            Loading lobby...
          </div>
        ) : (
          <>
            <PlayerList
              players={players}
              playerName={playerName}
              onPlayerNameChange={setPlayerName}
              onAddPlayer={handleAddPlayer}
              onRemovePlayer={handleRemovePlayer}
              isFull={lobbyIsFull}
              isHost={isHost}
            />

            {!isRoundActive && isHost && (
              <DurationSelector value={duration} onChange={handleDurationChange} />
            )}

            {isHost && (
              <button
                onClick={handleStartRound}
                disabled={!canStartRound}
                className="rounded-3xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 px-6 py-5 text-xl font-semibold text-white shadow-xl shadow-pink-500/40 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRoundActive ? "Round in progress" : "Start new round"}
              </button>
            )}

            {!isHost && (
              <div className="rounded-3xl bg-white/10 p-5 text-center text-white">
                <p className="text-sm text-purple-100">
                  Waiting for host to start the round...
                </p>
              </div>
            )}
          </>
        )}

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

      </div>
    </main>
  );
}

