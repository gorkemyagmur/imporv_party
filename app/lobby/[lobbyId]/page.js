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
    const shareUrl = `${window.location.origin}/lobby/${lobbyId}`;
    const shareText = `Join my Improv Party lobby! Code: ${lobbyCode}\n${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my Improv Party lobby",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
        if (err.name !== "AbortError") {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareText);
          alert("Link copied to clipboard!");
        }
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
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
  const isUserInLobby = currentUser && players.some((p) => p.id === currentUser.uid);
  const userIsHost = lobby && currentUser && currentUser.uid === lobby.hostId;
  const isWaitingForApproval = !userIsHost && !isUserInLobby && userPendingRequest && (userPendingRequest.status === "pending" || !userPendingRequest.status);

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
    </main>
  );
}

