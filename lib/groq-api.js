/**
 * Groq API utility functions for generating scenarios and roles
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroqAPI(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("GROQ_API_KEY environment variable is not set");
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  console.log("Calling Groq API with model:", options.model || "llama-3.1-8b-instant");

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "llama-3.1-8b-instant",
        messages: messages,
        temperature: options.temperature || 0.9,
        max_tokens: options.max_tokens || 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("Groq API error response:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      
      throw new Error(`Groq API error: ${errorData.error?.message || errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log("Groq API response received");
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq API fetch error:", error.message);
    throw error;
  }
}

/**
 * Generate an improv scenario for the given number of performers
 */
export async function generateScenario(performerCount) {
  const prompt = `Lütfen ${performerCount} oyunculuk bir doğaçlama oyunu için yaratıcı ve eğlenceli bir senaryo üret.

Kurallar:
- Başlık tamamen Türkçe olacak (en fazla 5 kelime, dikkat çekici)
- Açıklama tamamen Türkçe olacak (1-2 cümle; sahnenin durumunu kısaca anlatsın)
- Tonu mizahi ve doğaçlama oyununa uygun tut
- Oyuncuların hayal gücünü tetikleyecek detaylar ver

Sadece aşağıdaki JSON formatında cevap ver, başka hiçbir açıklama ekleme:
{
  "title": "Türkçe Senaryo Başlığı",
  "description": "Türkçe senaryo açıklaması"
}`;

  try {
    console.log(`Generating scenario for ${performerCount} performers...`);
    const response = await callGroqAPI([
      {
        role: "user",
        content: prompt,
      },
    ]);

    console.log("Groq API scenario response:", response);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", response);
      throw new Error("Invalid JSON response from Groq API");
    }

    const scenario = JSON.parse(jsonMatch[0]);
    console.log("Parsed scenario:", scenario);
    
    // Validate response
    if (!scenario.title || !scenario.description) {
      console.error("Invalid scenario format:", scenario);
      throw new Error("Invalid scenario format from Groq API");
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
  const prompt = `Lütfen ${performerCount} adet benzersiz, eğlenceli ve yaratıcı doğaçlama rolü üret.

Kurallar:
- Her rol tamamen Türkçe olacak
- Her rol 1-5 kelimelik kısa bir karakter tanımı olmalı
- Roller birbirinden farklı ve absürt/komik hissettirmeli
- Örnekler: "Her şeyi fısıldayan dedikoducu", "Sorulan her soruyu soruyla yanıtlayan", "Aşırı bilimkurgu takıntılı amca"

Sadece aşağıdaki gibi geçerli bir JSON dizisi döndür, başka açıklama yazma:
["Rol 1", "Rol 2", "Rol 3"]`;

  try {
    console.log(`Generating ${performerCount} roles...`);
    const response = await callGroqAPI([
      {
        role: "user",
        content: prompt,
      },
    ]);

    console.log("Groq API roles response:", response);

    // Parse JSON response. Some LLM responses may contain extra arrays or text,
    // so grab only the first JSON array block.
    const jsonMatches = response.match(/\[[\s\S]*?\]/g);
    const firstArray = jsonMatches?.[0];

    if (!firstArray) {
      console.error("No JSON array found in response:", response);
      throw new Error("Invalid JSON response from Groq API");
    }

    if (jsonMatches.length > 1) {
      console.warn("Multiple JSON arrays detected in roles response. Using the first one.");
    }

    const roles = JSON.parse(firstArray);
    console.log("Parsed roles:", roles);
    
    // Validate response
    if (!Array.isArray(roles) || roles.length !== performerCount) {
      console.error("Invalid roles format:", roles, "Expected:", performerCount);
      throw new Error("Invalid roles format from Groq API");
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

