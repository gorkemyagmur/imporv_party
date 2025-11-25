import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Hardcoded scenarios for now (will be replaced with AI generation)
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
      "There's one last legendary snack and multiple carts racing toward it.",
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

function getRandomItems(list, count) {
  const pool = [...list];
  const selected = [];
  while (selected.length < count && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

function randomId(prefix) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

export async function POST(request, { params }) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { lobbyId } = params;
    const body = await request.json();
    const { duration, userId } = body;

    if (!lobbyId || !duration || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get lobby document
    const lobbyRef = adminDb.collection("lobbies").doc(lobbyId);
    const lobbySnap = await lobbyRef.get();

    if (!lobbySnap.exists) {
      return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
    }

    const lobbyData = lobbySnap.data();

    // Verify user is the host
    if (lobbyData.hostId !== userId) {
      return NextResponse.json(
        { error: "Only host can start rounds" },
        { status: 403 }
      );
    }

    // Check if round is already active
    if (lobbyData.status !== "idle" && lobbyData.status !== "results") {
      return NextResponse.json(
        { error: "Round already in progress" },
        { status: 400 }
      );
    }

    // Get players
    const playersRef = adminDb.collection("lobbies").doc(lobbyId).collection("players");
    const playersSnap = await playersRef.get();
    const players = playersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (players.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 players" },
        { status: 400 }
      );
    }

    // Select scenario and performers
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
    const roundRef = adminDb
      .collection("lobbies")
      .doc(lobbyId)
      .collection("rounds")
      .doc(roundId);

    await roundRef.set({
      scenario: {
        title: scenario.title,
        description: scenario.description,
      },
      performers: performers.map((p) => ({ id: p.id, name: p.name })),
      roles: roleMap,
      status: "countdown",
      duration,
      startedAt: FieldValue.serverTimestamp(),
      scores: {},
      ratings: {},
    });

    // Update lobby document
    await lobbyRef.update({
      status: "countdown",
      currentRoundId: roundId,
      startedAt: FieldValue.serverTimestamp(),
      roundDuration: duration,
    });

    return NextResponse.json({
      success: true,
      roundId,
      scenario: {
        title: scenario.title,
        description: scenario.description,
      },
      performers: performers.map((p) => ({ id: p.id, name: p.name })),
      roles: roleMap,
      duration,
    });
  } catch (error) {
    console.error("Error starting round:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

