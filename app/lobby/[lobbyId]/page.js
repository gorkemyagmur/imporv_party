"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import CountdownTimer from "@/components/CountdownTimer";
import DurationSelector from "@/components/DurationSelector";
import MaxRoundsSelector from "@/components/MaxRoundsSelector";
import PerformerRoleCard from "@/components/PerformerRoleCard";
import PlayerList from "@/components/PlayerList";
import RatingPanel from "@/components/RatingPanel";
import RoundResults from "@/components/RoundResults";
import ScenarioCard from "@/components/ScenarioCard";
import GameCompleteModal from "@/components/GameCompleteModal";

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const lobbyId = (params?.lobbyId || "").toString();
  const [players, setPlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [ratings, setRatings] = useState({});
  const [duration, setDuration] = useState(60);
  const [lobby, setLobby] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRemovedModal, setShowRemovedModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [userPendingRequest, setUserPendingRequest] = useState(null);
  const [wasInLobby, setWasInLobby] = useState(false);
  const [showGameCompleteModal, setShowGameCompleteModal] = useState(false);

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
        // Show game complete modal if game is finished
        if (data.status === "finished" && !showGameCompleteModal) {
          setShowGameCompleteModal(true);
        }
      } else {
        // Lobby doesn't exist, redirect to home
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [lobbyId, router, showGameCompleteModal]);

  // Track if user was in lobby initially
  useEffect(() => {
    if (currentUser && players.length > 0) {
      const isInLobby = players.some((p) => p.id === currentUser.uid);
      if (isInLobby && !wasInLobby) {
        setWasInLobby(true);
      }
    }
  }, [currentUser, players, wasInLobby]);

  // Listen to players subcollection
  useEffect(() => {
    if (!lobbyId || !currentUser) return;
    const playersRef = collection(db, "lobbies", lobbyId, "players");
    const unsubscribe = onSnapshot(playersRef, (snap) => {
      const playersList = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      
      // Check if current user was removed from the lobby
      const isUserInLobby = playersList.some((p) => p.id === currentUser.uid);
      if (!isUserInLobby && wasInLobby && currentUser && lobby) {
        // User was removed, show modal
        setShowRemovedModal(true);
        setWasInLobby(false);
      }
      
      setPlayers(playersList);
    });
    return () => unsubscribe();
  }, [lobbyId, currentUser, router, lobby, wasInLobby]);

  // Listen to pending requests (only for host)
  useEffect(() => {
    if (!lobbyId || !lobby || !currentUser) return;
    // Check if current user is host
    const userIsHost = currentUser.uid === lobby.hostId;
    if (!userIsHost) return;
    
    const requestsRef = collection(db, "lobbies", lobbyId, "pendingRequests");
    const unsubscribe = onSnapshot(requestsRef, (snap) => {
      const requestsList = snap.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .filter((req) => req.status === "pending" || !req.status); // Only show pending requests
      setPendingRequests(requestsList);
    });
    return () => unsubscribe();
  }, [lobbyId, lobby, currentUser]);

  // Listen to user's request status (for non-host users)
  useEffect(() => {
    if (!lobbyId || !currentUser || !lobby) return;
    // Only listen if user is not the host
    if (currentUser.uid === lobby.hostId) return;
    
    const requestRef = doc(db, "lobbies", lobbyId, "pendingRequests", currentUser.uid);
    const unsubscribe = onSnapshot(requestRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserPendingRequest(data);
        if (data.status === "rejected") {
          setShowRejectedModal(true);
          // Delete the rejected request
          deleteDoc(requestRef);
        }
      } else {
        setUserPendingRequest(null);
      }
    });
    return () => unsubscribe();
  }, [lobbyId, currentUser, lobby]);

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

  async function handleShareLobby() {
    const homeUrl = `${window.location.origin}/?code=${lobbyId}`;
    const shareText = `Join my Improv Party lobby! Code: ${lobbyCode}\n${homeUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my Improv Party lobby",
          text: shareText,
          url: homeUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
        if (err.name !== "AbortError") {
          // Fallback to clipboard
          await navigator.clipboard.writeText(homeUrl);
          alert("Link copied to clipboard!");
        }
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(homeUrl);
      alert("Link copied to clipboard!");
    }
  }

  async function handleAcceptRequest(requestId) {
    if (!lobbyId || !lobby || !currentUser || currentUser.uid !== lobby.hostId) return;
    
    try {
      const requestRef = doc(db, "lobbies", lobbyId, "pendingRequests", requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) return;
      
      const requestData = requestSnap.data();
      
      // Add player to lobby
      const playerRef = doc(db, "lobbies", lobbyId, "players", requestId);
      await setDoc(playerRef, {
        name: requestData.name,
        joinedAt: serverTimestamp(),
      });

      // Update playerMap in lobby document
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        [`playerMap.${requestId}`]: {
          name: requestData.name,
          joinedAt: serverTimestamp(),
        },
      });

      // Delete the request
      await deleteDoc(requestRef);
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  }

  async function handleRejectRequest(requestId) {
    if (!lobbyId || !lobby || !currentUser || currentUser.uid !== lobby.hostId) return;
    
    try {
      const requestRef = doc(db, "lobbies", lobbyId, "pendingRequests", requestId);
      await updateDoc(requestRef, {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });
      
      // Delete after a short delay to allow the user to see the rejection
      setTimeout(async () => {
        await deleteDoc(requestRef);
      }, 2000);
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  }

  async function handleRemovePlayer(playerId) {
    // Only host can remove players
    const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
    if (!userIsHost || !lobbyId) return;

    // Cannot remove players during an active round
    if (isRoundActive && (lobby?.status === "countdown" || lobby?.status === "rating")) {
      alert("Cannot remove players while a round is in progress. Please wait until the round is finished.");
      return;
    }

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
    const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
    if (!userIsHost || !lobbyId) return;

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
    const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
    // Check if round is active (not in results or idle state)
    const isRoundActive = lobby?.status === "countdown" || lobby?.status === "rating";
    if (!userIsHost || players.length < 2 || isRoundActive || !lobbyId || !currentUser) {
      console.log("Cannot start round:", {
        userIsHost,
        playersCount: players.length,
        isRoundActive,
        lobbyStatus: lobby?.status,
        lobbyId,
        currentUser: !!currentUser,
      });
      return;
    }

    try {
      console.log("Starting round with:", { lobbyId, duration, userId: currentUser.uid });
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
        alert(`Error starting round: ${error.error || "Unknown error"}`);
        return;
      }

      const result = await response.json();
      console.log("Round started successfully:", result);
      // Round will be created by API, real-time listener will pick it up
      setRatings({});
    } catch (err) {
      console.error("Error starting round:", err);
      alert(`Error starting round: ${err.message || "Please try again"}`);
    }
  }

  async function handleDurationChange(newDuration) {
    const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
    if (!userIsHost || !lobbyId || isRoundActive) return;
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

  async function handleMaxRoundsChange(maxRoundsPerPlayer) {
    const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
    if (!userIsHost || !lobbyId || isRoundActive) return;
    try {
      const lobbyRef = doc(db, "lobbies", lobbyId);
      await updateDoc(lobbyRef, {
        maxRoundsPerPlayer: maxRoundsPerPlayer,
      });
    } catch (err) {
      console.error("Error updating max rounds per player:", err);
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
    if (!currentUser || !lobbyId || !lobby?.currentRoundId || !currentRound) return;
    
    // User cannot rate themselves
    if (performerId === currentUser.uid) {
      return;
    }
    
    // All players (performers and non-performers) can rate performers
    // Can only rate performers in this round
    const isTargetPerformer = currentRound.performers.some((p) => p.id === performerId);
    if (!isTargetPerformer) {
      return;
    }
    
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
    if (!currentRound || !lobbyId || !lobby?.currentRoundId || !currentUser) {
      return;
    }

    try {
      const roundRef = doc(db, "lobbies", lobbyId, "rounds", lobby.currentRoundId);
      
      // Mark this user's ratings as submitted (all players can submit, not just performers)
      await updateDoc(roundRef, {
        [`submittedRatings.${currentUser.uid}`]: true,
      });

      // Check if all players have submitted (all players in lobby, not just performers)
      const roundSnap = await getDoc(roundRef);
      if (!roundSnap.exists()) return;
      
      const roundData = roundSnap.data();
      const submittedRatings = roundData.submittedRatings || {};
      const allPlayersSubmitted = players.every(
        (player) => submittedRatings[player.id]
      );

      // If all players submitted, calculate scores and move to results
      if (allPlayersSubmitted) {
        const allRatings = roundData.ratings || {};

        // Calculate average scores for each performer from all ratings
        const scores = {};
        currentRound.performers.forEach((performer) => {
          const performerRatings = [];
          // Collect all ratings for this performer (excluding self-ratings)
          Object.keys(allRatings).forEach((raterId) => {
            if (raterId !== performer.id && allRatings[raterId]?.[performer.id]) {
              performerRatings.push(allRatings[raterId][performer.id]);
            }
          });
          
          // Calculate average
          if (performerRatings.length > 0) {
            const sum = performerRatings.reduce((acc, val) => acc + val, 0);
            scores[performer.id] = sum / performerRatings.length;
          } else {
            scores[performer.id] = 0;
          }
        });

        // Find winner(s) - only if there's a clear winner (no ties)
        const sortedPerformers = [...currentRound.performers].sort((a, b) => {
          return (scores[b.id] ?? 0) - (scores[a.id] ?? 0);
        });
        
        let winnerId = null;
        let winnerName = null;
        
        // Only set winner if there's a clear winner (highest score is unique)
        if (sortedPerformers.length > 0) {
          const highestScore = scores[sortedPerformers[0].id];
          const winnersWithHighestScore = sortedPerformers.filter(
            (p) => scores[p.id] === highestScore
          );
          
          // Only set winner if exactly one player has the highest score
          if (winnersWithHighestScore.length === 1) {
            winnerId = sortedPerformers[0].id;
            winnerName = sortedPerformers[0].name;
          }
        }

        // Update round with scores
        await updateDoc(roundRef, {
          status: "results",
          scores,
          winnerId: winnerId,
          winnerName: winnerName,
        });

        // Update lobby status
        const lobbyRef = doc(db, "lobbies", lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        const lobbyData = lobbySnap.data();
        
        // Update total scores in lobby
        const currentTotalScores = lobbyData.totalScores || {};
        const updatedTotalScores = { ...currentTotalScores };
        
        currentRound.performers.forEach((performer) => {
          if (!updatedTotalScores[performer.id]) {
            updatedTotalScores[performer.id] = {
              name: performer.name,
              totalScore: 0,
              roundsPlayed: 0,
            };
          }
          updatedTotalScores[performer.id].totalScore += scores[performer.id] || 0;
          updatedTotalScores[performer.id].roundsPlayed += 1;
        });

        await updateDoc(lobbyRef, {
          status: "results",
          totalScores: updatedTotalScores,
        });
      }
    } catch (err) {
      console.error("Error submitting ratings:", err);
    }
  }

  async function handleNextRound() {
    const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
    if (!userIsHost || !lobbyId || !lobby) return;
    
    try {
      const lobbyRef = doc(db, "lobbies", lobbyId);
      const currentRoundNumber = lobby.currentRoundNumber || 0;
      const totalRounds = lobby.totalRounds || 0;
      
      // Check if all rounds in the plan are completed
      if (currentRoundNumber >= totalRounds && totalRounds > 0) {
        // Game is complete
        await updateDoc(lobbyRef, {
          status: "finished",
          currentRoundId: null,
          startedAt: null,
        });
        setRatings({});
        setShowGameCompleteModal(true);
        return;
      }
      
      // Just reset status, round number will be incremented when next round starts
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

  async function handleStartNewGame() {
    const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
    if (!userIsHost || !lobbyId || !lobby) return;
    
    try {
      const lobbyRef = doc(db, "lobbies", lobbyId);
      
      // Reset game state for new game
      await updateDoc(lobbyRef, {
        status: "idle",
        currentRoundId: null,
        currentRoundNumber: 0,
        totalRounds: 0,
        roundPlan: null,
        totalScores: {},
        startedAt: null,
      });
      
      setShowGameCompleteModal(false);
      setRatings({});
      setCurrentRound(null);
    } catch (err) {
      console.error("Error starting new game:", err);
    }
  }

  const phase = currentRound?.status ?? "idle";

  const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
  const canStartRound = players.length >= 2 && !isRoundActive && userIsHost;
  const isUserInLobby = currentUser && players.some((p) => p.id === currentUser.uid);
  const isWaitingForApproval = !userIsHost && !isUserInLobby && userPendingRequest && (userPendingRequest.status === "pending" || !userPendingRequest.status);

  return (
    <main className="min-h-screen px-4 pb-28 pt-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
          <p className="text-xs uppercase tracking-[0.5em] text-purple-200">
            Lobby code
          </p>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-white">
                {lobbyCode || "----"}
              </h1>
              {lobby && (lobby.currentRoundNumber > 0 || isRoundActive) && (
                <p className="mt-1 text-sm text-purple-200">
                  Round {lobby.currentRoundNumber || 0} {lobby.totalRounds && `of ${lobby.totalRounds}`}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleShareLobby}
                className="rounded-full bg-gradient-to-r from-teal-400 to-sky-400 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/40 transition hover:scale-[1.02]"
              >
                Share
              </button>
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
        ) : isWaitingForApproval ? (
          <div className="rounded-3xl bg-white/10 p-8 text-center">
            <div className="mb-4">
              <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-200 border-t-pink-500"></div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Giriş İzni Bekleniyor
            </h2>
            <p className="text-purple-100">
              Admin onayı bekleniyor. Lütfen bekleyin...
            </p>
          </div>
        ) : (
          <>
            <PlayerList
              players={players}
              onRemovePlayer={handleRemovePlayer}
              isHost={isHost}
              currentUserId={currentUser?.uid || null}
            />

            {isHost && pendingRequests.length > 0 && (
              <section className="rounded-3xl bg-white/10 p-5 shadow-lg shadow-black/40">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Giriş İzni Bekleyenler ({pendingRequests.length})
                </h2>
                <ul className="space-y-3">
                  {pendingRequests.map((request) => (
                    <li
                      key={request.id}
                      className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500/70 via-orange-500/70 to-red-500/70 text-base font-semibold text-white">
                          {request.name.slice(0, 2).toUpperCase()}
                        </span>
                        <p className="text-base font-medium text-white">{request.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={lobbyIsFull}
                          className="rounded-full bg-gradient-to-r from-green-400 to-emerald-400 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-green-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Kabul Et
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="rounded-full bg-gradient-to-r from-red-400 to-pink-400 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-red-500/40"
                        >
                          Reddet
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!isRoundActive && isHost && (
              <>
                <DurationSelector value={duration} onChange={handleDurationChange} />
                <MaxRoundsSelector 
                  value={lobby?.maxRoundsPerPlayer || 3} 
                  onChange={handleMaxRoundsChange}
                  disabled={lobby?.currentRoundNumber > 0}
                />
              </>
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
              {currentRound.performers.map((performer) => {
                const isCurrentUser = performer.id === currentUser?.uid;
                // Show all performers to non-performers, only own role to performers
                if (!isCurrentUser && currentRound.performers.some((p) => p.id === currentUser?.uid)) {
                  return null; // Hide other performers' roles from current performer
                }
                return (
                  <PerformerRoleCard
                    key={performer.id}
                    name={performer.name}
                    role={currentRound.roles[performer.id]}
                    performerId={performer.id}
                    currentUserId={currentUser?.uid || null}
                  />
                );
              })}
            </div>

            {phase === "countdown" && (
              <CountdownTimer
                key={currentRound.id}
                duration={currentRound.duration || duration}
                isActive={phase === "countdown"}
                onFinish={handleCountdownFinish}
                startedAt={currentRound.startedAt}
              />
            )}

            {phase === "rating" && (
              <RatingPanel
                performers={currentRound.performers}
                ratings={ratings}
                onRatingChange={handleRatingChange}
                onSubmit={handleSubmitRatings}
                currentUserId={currentUser?.uid || null}
                submittedRatings={currentRound.submittedRatings || {}}
                allPlayersCount={players.length}
              />
            )}

            {phase === "results" && (
              <RoundResults
                performers={currentRound.performers}
                scores={currentRound.scores}
                winnerId={currentRound.winnerId}
                onNextRound={handleNextRound}
                totalScores={lobby?.totalScores || {}}
                allPlayers={players}
                isHost={isHost}
              />
            )}
          </section>
        )}

      </div>

      {/* Removed Modal */}
      {showRemovedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 rounded-3xl bg-gradient-to-br from-purple-900/95 to-indigo-900/95 p-6 shadow-2xl border border-white/20 max-w-sm w-full">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Odadan Çıkarıldınız
            </h2>
            <p className="text-purple-100 text-center mb-6">
              Admin tarafından odadan çıkarıldınız.
            </p>
            <button
              onClick={() => {
                setShowRemovedModal(false);
                router.push("/");
              }}
              className="w-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/40"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      )}

      {/* Rejected Modal */}
      {showRejectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 rounded-3xl bg-gradient-to-br from-purple-900/95 to-indigo-900/95 p-6 shadow-2xl border border-white/20 max-w-sm w-full">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Giriş İsteğiniz Reddedildi
            </h2>
            <p className="text-purple-100 text-center mb-6">
              Admin giriş isteğinizi reddetti.
            </p>
            <button
              onClick={() => {
                setShowRejectedModal(false);
                router.push("/");
              }}
              className="w-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/40"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      )}

      {/* Game Complete Modal */}
      <GameCompleteModal
        isOpen={showGameCompleteModal}
        onClose={() => setShowGameCompleteModal(false)}
        totalScores={lobby?.totalScores || {}}
        allPlayers={players}
        lobbyId={lobbyId}
        currentUserId={currentUser?.uid || null}
        onStartNewGame={handleStartNewGame}
        isHost={isHost}
      />
    </main>
  );
}

