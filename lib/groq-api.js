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
 * Returns a complete story-based scenario with integrated roles
 */
export async function generateScenario(performerCount) {
  const prompt = `Lütfen ${performerCount} oyuncu için doğaçlama oyunu için kapsamlı bir senaryo üret.

Gereksinimler:
- Başlık: Dikkat çekici, Türkçe (max 5 kelime)
- Hikaye: 4-5 cümlelik arka plan hikayesi, karakterler ve durum hakkında detay. Oyuncuların RP yaparken eğlenmesi için ilginç ve komik bir hikaye oluştur.
- Sahne: Oyuncuların oynayacağı anın açıklaması (1-2 cümle). Bu sahne hikayeden bir anı temsil etmeli.
- Roller: Her oyuncu için hikayeye özel rol. Roller hikayedeki karakterler/roller olmalı ve hikayeyle uyumlu olmalı. Her rol 1-5 kelimelik kısa bir tanım olmalı.

Önemli: Senaryo eğlenceli, yaratıcı ve doğaçlama oyununa uygun olmalı. Oyuncuların hayal gücünü tetikleyecek detaylar içermeli.

Sadece aşağıdaki JSON formatında cevap ver, başka hiçbir açıklama ekleme:
{
  "title": "Türkçe Senaryo Başlığı",
  "story": "4-5 cümlelik hikaye arka planı...",
  "scene": "Sahne açıklaması (oyuncuların oynayacağı an)",
  "roles": ["Hikayeye özel rol 1", "Hikayeye özel rol 2"]
}`;

  try {
    console.log(`Generating scenario for ${performerCount} performers...`);
    const response = await callGroqAPI([
      {
        role: "user",
        content: prompt,
      },
    ], {
      max_tokens: 800, // Increased for longer story content
    });

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
    if (!scenario.title || !scenario.story || !scenario.scene || !scenario.roles) {
      console.error("Invalid scenario format:", scenario);
      throw new Error("Invalid scenario format from Groq API");
    }

    // Validate roles array
    if (!Array.isArray(scenario.roles) || scenario.roles.length !== performerCount) {
      console.error("Invalid roles format:", scenario.roles, "Expected:", performerCount);
      throw new Error("Invalid roles format from Groq API");
    }

    console.log("Successfully generated scenario:", scenario.title);
    return {
      title: scenario.title.trim(),
      story: scenario.story.trim(),
      scene: scenario.scene.trim(),
      roles: scenario.roles.map((role) => String(role).trim()),
      performers: performerCount,
    };
  } catch (error) {
    console.error("Error generating scenario:", error.message, error);
    // Fallback to default scenario
    return getFallbackScenario(performerCount);
  }
}

/**
 * Fallback scenarios if API fails
 * Returns scenarios with story, scene, and story-based roles
 */
function getFallbackScenario(performerCount) {
  const fallbackScenarios = {
    2: {
      title: "Asansörde Mahsur Kaldık",
      story: "İki arkadaş alışveriş merkezinde asansöre binmişlerdi. Ancak asansör 3. ve 4. kat arasında sıkıştı. İkisi de panik içinde, biri acil butonuna ulaşmaya çalışıyor, diğeri ise telefon çekmiyor diye şikayet ediyor. Durum giderek komikleşiyor çünkü ikisi de farklı çözümler öneriyor.",
      scene: "Asansör 3. ve 4. kat arasında sıkışmış durumda. İki kişi acil durum butonuna ulaşmaya çalışıyor ve telefon çekmiyor.",
      roles: ["Acil butonuna ulaşmaya çalışan panik içindeki kişi", "Telefon çekmiyor diye sürekli şikayet eden kişi"],
      performers: 2,
    },
    3: {
      title: "Süpermarket Çılgınlığı",
      story: "Süpermarkette son kalan efsanevi atıştırmalık için büyük bir yarış başladı. Üç kişi aynı anda aynı ürüne koşuyor. Biri alışveriş arabasıyla, diğeri koşarak, üçüncüsü ise stratejik bir plan yapmış. Herkes bu son ürünü almak istiyor ve durum giderek komikleşiyor.",
      scene: "Süpermarket rafında son kalan efsanevi atıştırmalık için üç kişi yarışıyor. Herkes aynı anda aynı ürüne ulaşmaya çalışıyor.",
      roles: ["Alışveriş arabasıyla koşan kişi", "Koşarak gelen kişi", "Stratejik plan yapan kişi"],
      performers: 3,
    },
    4: {
      title: "Kayıp Kedi Macerası",
      story: "Mahallede kayıp bir kedi var ve dört komşu onu bulmaya çalışıyor. Her biri farklı bir yöntem kullanıyor: biri mama ile çağırıyor, diğeri kedi sesi çıkarıyor, üçüncüsü sosyal medyada paylaşım yapıyor, dördüncüsü ise profesyonel bir dedektif gibi davranıyor. Durum giderek absürtleşiyor.",
      scene: "Mahallede kayıp kedi aranıyor. Dört komşu farklı yöntemlerle kediyi bulmaya çalışıyor.",
      roles: ["Mama ile kediyi çağıran kişi", "Kedi sesi çıkaran kişi", "Sosyal medyada paylaşım yapan kişi", "Profesyonel dedektif gibi davranan kişi"],
      performers: 4,
    },
  };

  return fallbackScenarios[performerCount] || fallbackScenarios[2];
}

