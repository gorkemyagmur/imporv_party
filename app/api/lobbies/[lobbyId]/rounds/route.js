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

// Generate round plan ensuring equal distribution
function generateRoundPlan(players, maxRoundsPerPlayer) {
  const playerIds = players.map((p) => p.id);
  const totalPlayers = playerIds.length;
  
  // Create a pool of player appearances needed
  const playerAppearances = {};
  playerIds.forEach((id) => {
    playerAppearances[id] = maxRoundsPerPlayer;
  });
  
  const roundPlan = [];
  let roundNumber = 1;
  
  // Strategy: Ensure all players play equal number of rounds
  // Try to balance between having all players play together and smaller groups
  
  // Continue creating rounds until all players have played their required rounds
  while (Object.values(playerAppearances).some((count) => count > 0)) {
    const availablePlayers = playerIds.filter((id) => playerAppearances[id] > 0);
    
    if (availablePlayers.length === 0) break;
    
    // Determine performer count for this round
    let performerCount;
    
    if (availablePlayers.length <= 3) {
      // All available players play together
      performerCount = availablePlayers.length;
    } else {
      // Calculate remaining appearances
      const totalRemainingAppearances = Object.values(playerAppearances).reduce(
        (sum, count) => sum + count, 
        0
      );
      
      // Try to use 3 performers if possible, otherwise 2
      // Ensure we have enough rounds for all players
      const minRoundsNeeded = Math.ceil(totalRemainingAppearances / 3);
      const playersNeedingRounds = availablePlayers.length;
      
      // If we can fit everyone with 3-performer rounds, use 3
      // Otherwise, use 2 to ensure fair distribution
      if (minRoundsNeeded <= playersNeedingRounds && availablePlayers.length >= 3) {
        performerCount = 3;
      } else {
        performerCount = 2;
      }
      
      // Ensure we don't exceed available players
      performerCount = Math.min(performerCount, availablePlayers.length);
    }
    
    // Select performers for this round
    // Prioritize players who need more rounds (have more appearances left)
    const sortedAvailable = [...availablePlayers].sort((a, b) => {
      return playerAppearances[b] - playerAppearances[a]; // More appearances needed = higher priority
    });
    
    const performers = getRandomItems(sortedAvailable, performerCount);
    
    // Decrease appearance count for selected performers
    performers.forEach((id) => {
      playerAppearances[id]--;
    });
    
    roundPlan.push({
      roundNumber: roundNumber++,
      performers: performers,
    });
  }
  
  return roundPlan;
}

export async function POST(request, { params }) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { lobbyId } = await params;
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

    // Get current round number
    const currentRoundNumber = lobbyData.currentRoundNumber || 0;
    const maxRoundsPerPlayer = lobbyData.maxRoundsPerPlayer || 3;
    
    // If this is the first round, generate the round plan
    let roundPlan = lobbyData.roundPlan || null;
    if (currentRoundNumber === 0 && !roundPlan) {
      roundPlan = generateRoundPlan(players, maxRoundsPerPlayer);
      // Save round plan to lobby
      await lobbyRef.update({
        roundPlan: roundPlan,
        totalRounds: roundPlan.length,
      });
    }
    
    // If no round plan exists, create one (fallback)
    if (!roundPlan) {
      roundPlan = generateRoundPlan(players, maxRoundsPerPlayer);
      await lobbyRef.update({
        roundPlan: roundPlan,
        totalRounds: roundPlan.length,
      });
    }
    
    // Check if all rounds are completed
    if (currentRoundNumber >= roundPlan.length) {
      return NextResponse.json(
        { error: "All rounds completed" },
        { status: 400 }
      );
    }
    
    // Get performers for current round from plan
    const currentRoundPlan = roundPlan[currentRoundNumber];
    if (!currentRoundPlan) {
      return NextResponse.json(
        { error: "No more rounds in plan" },
        { status: 400 }
      );
    }
    
    // Get full player objects for performers
    const performerIds = currentRoundPlan.performers;
    const performers = players.filter((p) => performerIds.includes(p.id));
    
    // Select scenario based on performer count
    const eligibleScenarios = SCENARIOS.filter(
      (scene) => scene.performers === performers.length || scene.performers <= performers.length
    );
    const scenarioPool =
      eligibleScenarios.length > 0 ? eligibleScenarios : SCENARIOS;
    const scenario =
      scenarioPool[Math.floor(Math.random() * scenarioPool.length)];
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
      submittedRatings: {},
      roundNumber: currentRoundNumber + 1,
      roundPlan: currentRoundPlan, // Store which players are in this round
    });
    
    // Update lobby document
    await lobbyRef.update({
      status: "countdown",
      currentRoundId: roundId,
      startedAt: FieldValue.serverTimestamp(),
      roundDuration: duration,
      currentRoundNumber: currentRoundNumber + 1,
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

