"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";
import {
  doc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateLobbyId() {
  return Array.from({ length: 5 }, () => {
    const index = Math.floor(Math.random() * LETTERS.length);
    return LETTERS[index];
  }).join("");
}

async function ensureAnonUser() {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export default function Home() {
  const router = useRouter();
  const [hostName, setHostName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleCreateLobby = useCallback(async () => {
    try {
      const user = await ensureAnonUser();
      const id = generateLobbyId();
      const name = hostName.trim() || "Host";

      const lobbyRef = doc(db, "lobbies", id);
      await setDoc(lobbyRef, {
        status: "idle",
        createdAt: serverTimestamp(),
        hostId: user.uid,
        hostName: name,
        currentRoundId: null,
        startedAt: null,
        roundDuration: 60,
        playerMap: {
          [user.uid]: {
            name,
            joinedAt: serverTimestamp(),
          },
        },
      });

      const playerRef = doc(db, "lobbies", id, "players", user.uid);
      await setDoc(playerRef, {
        name,
        joinedAt: serverTimestamp(),
      });

      setCreateError("");
      setHostName("");
      router.push(`/lobby/${id}`);
    } catch (error) {
      console.error(error);
      setCreateError("Could not create lobby. Please try again.");
    }
  }, [hostName, router]);

  const handleJoinLobby = useCallback(async () => {
    const trimmed = joinCode.trim().toUpperCase();
    if (trimmed.length < 3 || trimmed.length > 6) {
      setJoinError("Enter a 3-6 letter code.");
      return;
    }

    try {
      const user = await ensureAnonUser();
      const lobbyRef = doc(db, "lobbies", trimmed);
      const lobbySnap = await getDoc(lobbyRef);

      if (!lobbySnap.exists()) {
        setJoinError("Lobby not found.");
        return;
      }

      const lobbyData = lobbySnap.data();
      
      // Check if lobby is closed
      if (lobbyData.closed) {
        setJoinError("This lobby is closed.");
        return;
      }

      const name = joinName.trim() || "Guest";

      // Check if user is already in the lobby
      const playerRef = doc(db, "lobbies", trimmed, "players", user.uid);
      const playerSnap = await getDoc(playerRef);
      
      if (playerSnap.exists()) {
        // User is already in lobby, redirect
        setJoinError("");
        setJoinName("");
        setJoinCode("");
        router.push(`/lobby/${trimmed}`);
        return;
      }

      // Check if user already has a pending request
      const requestRef = doc(db, "lobbies", trimmed, "pendingRequests", user.uid);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists()) {
        const requestData = requestSnap.data();
        if (requestData.status === "pending" || !requestData.status) {
          setJoinError("You already have a pending request. Please wait for admin approval.");
          return;
        }
        // If request is rejected, we'll delete it and create a new one
        if (requestData.status === "rejected") {
          try {
            await deleteDoc(requestRef);
          } catch (deleteError) {
            console.error("Error deleting rejected request:", deleteError);
            // Continue anyway, setDoc will overwrite
          }
        }
      }

      // Create pending request
      try {
        await setDoc(requestRef, {
          name,
          requestedAt: serverTimestamp(),
          status: "pending",
        });
        
        console.log("Pending request created successfully for user:", user.uid);
        
        setJoinError("");
        setJoinName("");
        setJoinCode("");
        
        // Redirect to lobby page to wait for approval
        router.push(`/lobby/${trimmed}`);
      } catch (requestError) {
        console.error("Error creating pending request:", requestError);
        // If request creation fails, show specific error
        if (requestError.code === "permission-denied") {
          setJoinError("Permission denied. Please check Firestore security rules.");
        } else {
          setJoinError(`Could not create join request: ${requestError.message}`);
        }
        return;
      }
    } catch (error) {
      console.error("Error in handleJoinLobby:", error);
      setJoinError(`Could not join lobby: ${error.message || "Please try again."}`);
    }
  }, [joinCode, joinName, router]);

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl bg-white/10 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-pink-200">
          Party Mode
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
          Improv Party Host
        </h1>
        <p className="mt-3 text-base text-purple-100">
          AI-inspired party game moderator for in-person improv. Gather your
  friends, tap start, and let the chaos unfold.
        </p>
        <div className="mt-8 w-full space-y-3">
          <div className="rounded-2xl bg-white/5 p-4 text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
              Be the host
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={hostName}
                onChange={(event) => {
                  setHostName(event.target.value);
                  setCreateError("");
                }}
                maxLength={24}
                placeholder="Your name"
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-center text-white placeholder:text-purple-200 focus:border-pink-300 focus:outline-none"
              />
              <button
                onClick={handleCreateLobby}
                className="rounded-full bg-gradient-to-r from-fuchsia-400 via-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/40 transition hover:scale-[1.02]"
              >
                Create lobby
              </button>
            </div>
            {createError && (
              <p className="mt-2 text-xs text-amber-200">{createError}</p>
            )}
          </div>
          <button
            disabled
            className="hidden"
          />
          <div className="rounded-2xl bg-white/5 p-4 text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
              Have a code?
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={joinCode}
                onChange={(event) => {
                  setJoinCode(event.target.value.toUpperCase());
                  setJoinError("");
                }}
                maxLength={6}
                placeholder="Enter lobby code"
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-center text-white placeholder:text-purple-200 focus:border-pink-300 focus:outline-none"
              />
              <input
                value={joinName}
                onChange={(event) => {
                  setJoinName(event.target.value);
                  setJoinError("");
                }}
                maxLength={24}
                placeholder="Your name"
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-center text-white placeholder:text-purple-200 focus:border-pink-300 focus:outline-none"
              />
              <button
                onClick={handleJoinLobby}
                className="rounded-full bg-gradient-to-r from-sky-400 to-teal-400 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/30"
              >
                Join lobby
              </button>
            </div>
            {joinError && (
              <p className="mt-2 text-xs text-amber-200">{joinError}</p>
            )}
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-sm text-purple-100">
        Built for phones • No accounts • Just pure improv energy
      </p>
    </main>
  );
}
