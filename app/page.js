"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateLobbyId() {
  return Array.from({ length: 5 }, () => {
    const index = Math.floor(Math.random() * LETTERS.length);
    return LETTERS[index];
  }).join("");
}

export default function Home() {
  const router = useRouter();

  const handleCreateLobby = useCallback(() => {
    const id = generateLobbyId();
    router.push(`/lobby/${id}`);
  }, [router]);

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
        <button
          onClick={handleCreateLobby}
          className="mt-8 w-full rounded-full bg-gradient-to-r from-fuchsia-400 via-pink-500 to-orange-400 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-pink-500/40 transition hover:scale-[1.02]"
        >
          Create Lobby
        </button>
      </div>
      <p className="mt-8 text-center text-sm text-purple-100">
        Built for phones • No accounts • Just pure improv energy
      </p>
    </main>
  );
}
