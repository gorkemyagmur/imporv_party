"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
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
        // Check if lobby is closed
        if (data.closed) {
          router.push("/");
          return;
        }
        setLobby(data);
        setDuration(data.roundDuration || 60);
        // Reset round if no currentRoundId
        if (!data.currentRoundId) {
          setCurrentRound(null);
          setRatings({});
        }
      } else {
        // Lobby doesn't exist, redirect to home
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [lobbyId, router]);

  // Listen to players subcollection
  useEffect(() => {
    if (!lobbyId || !currentUser) return;
    const playersRef = collection(db, "lobbies", lobbyId, "players");
    const unsubscribe = onSnapshot(playersRef, (snap) => {
      const playersList = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPlayers(playersList);

      // Check if current user was removed from the lobby
      const isUserInLobby = playersList.some((p) => p.id === currentUser.uid);
      if (!isUserInLobby && currentUser) {
        // User was removed, redirect to home
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [lobbyId, currentUser, router]);

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

  async function handleCloseLobby() {
    // Only host can close lobby
    if (!isHost || !lobbyId) return;

    try {
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        closed: true,
        closedAt: serverTimestamp(),
      });
      // Redirect host to home
      router.push("/");
    } catch (err) {
      console.error("Error closing lobby:", err);
    }
  }

  async function handleStartRound() {
    // Only host can start rounds
    if (!isHost || players.length < 2 || currentRound || !lobbyId || !currentUser) {
      return;
    }

    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/rounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          duration,
          userId: currentUser.uid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error starting round:", error);
        return;
      }

      // Round will be created by API, real-time listener will pick it up
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
            <div className="flex flex-col items-end gap-2">
              <p className="text-sm text-purple-100">Share with everyone</p>
              {isHost && (
                <button
                  onClick={handleCloseLobby}
                  className="rounded-full bg-red-500/80 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
                >
                  Close Lobby
                </button>
              )}
            </div>
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
              currentUserId={currentUser?.uid || null}
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

