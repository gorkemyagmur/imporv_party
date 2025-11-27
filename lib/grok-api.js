/**
 * Grok API utility functions for generating scenarios and roles
 */

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

async function callGrokAPI(messages, options = {}) {
  const apiKey = process.env.GROK_API_KEY;
  
  if (!apiKey) {
    console.error("GROK_API_KEY environment variable is not set");
    throw new Error("GROK_API_KEY environment variable is not set");
  }

  console.log("Calling Grok API with model:", options.model || "grok-beta");

  try {
    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "grok-beta",
        messages: messages,
        temperature: options.temperature || 0.9,
        max_tokens: options.max_tokens || 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("Grok API error response:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Grok API error: ${errorData.error?.message || errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log("Grok API response received");
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Grok API fetch error:", error.message);
    throw error;
  }
}

/**
 * Generate an improv scenario for the given number of performers
 */
export async function generateScenario(performerCount) {
  const prompt = `Create a fun, creative improv scenario for ${performerCount} performers. 

Requirements:
- Title: A catchy, short title (max 5 words)
- Description: A brief scenario description (1-2 sentences) that sets up an interesting situation
- The scenario should be suitable for improv comedy
- Make it engaging and allow for creative interpretation

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "Scenario Title",
  "description": "Scenario description here"
}

Do not include any other text, explanations, or markdown formatting.`;

  try {
    console.log(`Generating scenario for ${performerCount} performers...`);
    const response = await callGrokAPI([
      {
        role: "user",
        content: prompt,
      },
    ]);

    console.log("Grok API scenario response:", response);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", response);
      throw new Error("Invalid JSON response from Grok API");
    }

    const scenario = JSON.parse(jsonMatch[0]);
    console.log("Parsed scenario:", scenario);
    
    // Validate response
    if (!scenario.title || !scenario.description) {
      console.error("Invalid scenario format:", scenario);
      throw new Error("Invalid scenario format from Grok API");
    }

    console.log("Successfully generated scenario:", scenario.title);
    return {
      title: scenario.title.trim(),
      description: scenario.description.trim(),
      performers: performerCount,
    };
  } catch (error) {
    console.error("Error generating scenario:", error.message, error);
    // Fallback to default scenario
    return getFallbackScenario(performerCount);
  }
}

/**
 * Generate unique roles for performers
 */
export async function generateRoles(performerCount) {
  const prompt = `Create ${performerCount} unique, fun, and creative character roles for an improv comedy game. 

Requirements:
- Each role should be a brief character trait or behavior (1-5 words)
- Roles should be distinct and interesting
- They should encourage creative and funny performances
- Examples: "Overly dramatic about everything", "Speaks only in questions", "Conspiracy theorist"

Respond ONLY with a valid JSON array of exactly ${performerCount} role strings:
["Role 1", "Role 2", "Role 3"]

Do not include any other text, explanations, or markdown formatting.`;

  try {
    console.log(`Generating ${performerCount} roles...`);
    const response = await callGrokAPI([
      {
        role: "user",
        content: prompt,
      },
    ]);

    console.log("Grok API roles response:", response);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response:", response);
      throw new Error("Invalid JSON response from Grok API");
    }

    const roles = JSON.parse(jsonMatch[0]);
    console.log("Parsed roles:", roles);
    
    // Validate response
    if (!Array.isArray(roles) || roles.length !== performerCount) {
      console.error("Invalid roles format:", roles, "Expected:", performerCount);
      throw new Error("Invalid roles format from Grok API");
    }

    const cleanedRoles = roles.map((role) => String(role).trim()).filter(Boolean);
    console.log("Successfully generated roles:", cleanedRoles);
    return cleanedRoles;
  } catch (error) {
    console.error("Error generating roles:", error.message, error);
    // Fallback to default roles
    return getFallbackRoles(performerCount);
  }
}

/**
 * Fallback scenarios if API fails
 */
function getFallbackScenario(performerCount) {
  const fallbackScenarios = {
    2: {
      title: "Elevator Stand-off",
      description: "The lift jammed between floors. Only some of you can reach the emergency panel.",
      performers: 2,
    },
    3: {
      title: "Supermarket Showdown",
      description: "There's one last legendary snack and multiple carts racing toward it.",
      performers: 3,
    },
  };

  return fallbackScenarios[performerCount] || fallbackScenarios[2];
}

/**
 * Fallback roles if API fails
 */
function getFallbackRoles(count) {
  const allRoles = [
    "Overly dramatic about everything",
    "Always apologizing for no reason",
    "Conspiracy theorist",
    "Speaks only in questions",
    "Secret superhero who cannot reveal it",
    "Mimics everyone else",
    "DJ narrating the scene like a radio host",
    "Hyper-competitive rival",
  ];

  // Return random selection
  const shuffled = [...allRoles].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

