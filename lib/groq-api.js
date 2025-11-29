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

  console.log("Calling Groq API with model:", options.model || "openai/gpt-oss-120b");

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "openai/gpt-oss-120b",
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
  const prompt = `Lütfen ${performerCount} oyuncu için doğaçlama komedi oyunu için yaratıcı ve zengin bir senaryo üret.

Gereksinimler:
- Başlık: Dikkat çekici, Türkçe (max 5 kelime)

- Hikaye: 5-6 cümlelik derinlemesine arka plan hikayesi. Hikaye şunları içermeli:
  * Kurulum: Normal hayatta rastlanması beklenilmeyen absürt bir durum veya olay
  * Karakter motivasyonları: Her karakterin ne istediği, hedefleri
  * Çatışmalar: İçsel veya dışsal çatışmalar, karakterler arası gerilimler
  * İlişki dinamikleri: Karakterler arasındaki ilişkiler, bağlantılar
  * Stakes (Bahisler): Başarısız olurlarsa veya başarılı olurlarsa ne olur?
  * Komedi karışımı: Absürt öğeler, durumsal komedi (yanlış anlaşılmalar, komik durumlar), karakter komedisi (garip kişilikler, tuhaf davranışlar)
  Hikaye mevcut zamanda veya geçmişte geçebilir ama spesifik tarihsel olaylara bağlı olmamalı. Yaratıcı ol, sıradan senaryolardan kaçın.

- Sahne: 2-3 cümlelik dengeli sahne açıklaması. Şunları içermeli:
  * Fiziksel ortam: Nerede, hangi mekan, önemli objeler/proplar (ama çok detaylı değil)
  * Duygusal atmosfer: Sahnenin tonu, havası, gerilim seviyesi
  * Ana durum: Oyuncuların oynayacağı temel durum
  * Özgürlük alanı: Oyunculara yaratıcılık için yeterli alan bırak, çok spesifik olma
  Absürt ama oynanabilir bir durum olmalı.

- Roller: Her oyuncu için hikayeye özel side-questler. Her rol, oyuncunun round içinde yapması beklenen 3-4 maddelik görevler/özellikler listesi olmalı. Bu side-questler:
  * Karışık etkileşim: Hem bireysel görevler, hem işbirlikçi görevler (diğer oyuncularla çalışma), hem rekabetçi görevler (diğer oyuncularla yarışma) içermeli
  * Etkileşimli öğeler: Bazı görevler diğer oyuncuların görevleriyle etkileşimli olmalı
  * Karakter özellikleri: Sadece eylemler değil, karakterin kişilik özellikleri, tuhaf davranışlar, komik alışkanlıklar da ekle
  * Senaryoya uyum: Senaryoya uyum sağlayacak absürt hareketler veya kişisel özellikler
  * Komedi karışımı: Absürt, durumsal ve karakter komedisi öğeleri içermeli
  * Canlandırılabilir: Komik ve absürt olmalı ama canlandırılabilir olmalı
  * Kısa ve net: Her madde kısa ve net olmalı (1 cümle)

Önemli: 
- Senaryo komedi odaklı olmalı, absürt, durumsal ve karakter komedisi karışımı içermeli
- Hikaye derinlemesine olmalı: karakter motivasyonları, çatışmalar, ilişkiler, stakes içermeli
- Etkileşim karışık olmalı: hem işbirliği hem rekabet öğeleri içermeli
- Sahne dengeli olmalı: yeterince spesifik ama oyunculara yaratıcılık alanı bırakmalı
- Canlandırılması uygun senaryolar üret (çok karmaşık veya imkansız durumlar değil)
- Oyuncuların RP yaparken eğlenmesi için komik ve ilginç detaylar ekle
- Tarihi olabilir ama spesifik tarihsel olaylara bağlı olmamalı

Sadece aşağıdaki JSON formatında cevap ver, başka hiçbir açıklama ekleme:
{
  "title": "Türkçe Senaryo Başlığı",
  "story": "5-6 cümlelik derinlemesine hikaye (kurulum, motivasyonlar, çatışmalar, ilişkiler, stakes, komedi karışımı)...",
  "scene": "2-3 cümlelik dengeli sahne açıklaması (fiziksel ortam, duygusal atmosfer, ana durum)...",
  "roles": [
    ["Side quest 1 (karışık etkileşim)", "Side quest 2 (karakter özelliği)", "Side quest 3 (etkileşimli)", "Side quest 4"],
    ["Side quest 1 (karışık etkileşim)", "Side quest 2 (karakter özelliği)", "Side quest 3 (etkileşimli)", "Side quest 4"]
  ]
}

Her rol bir array olmalı ve 3-4 maddelik side-quest içermeli. Side-questler bireysel, işbirlikçi ve rekabetçi öğeler içermeli, bazıları diğer oyuncuların görevleriyle etkileşimli olmalı.`;

  try {
    console.log(`Generating scenario for ${performerCount} performers...`);
    const response = await callGroqAPI([
      {
        role: "user",
        content: prompt,
      },
    ], {
      max_tokens: 2000, // Increased for longer, more detailed stories with character depth
    });

    console.log("Groq API scenario response:", response);

    // Parse JSON response - handle potentially truncated responses
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error("No JSON found in response:", response);
      throw new Error("Invalid JSON response from Groq API");
    }

    let jsonString = jsonMatch[0];
    let scenario;
    
    try {
      scenario = JSON.parse(jsonString);
    } catch (parseError) {
      console.warn("JSON parse error, response might be truncated:", parseError.message);
      console.warn("Response length:", response.length, "JSON string length:", jsonString.length);
      
      // Check if response was truncated (common when max_tokens limit is reached)
      // If scene field is incomplete, try to extract what we can
      if (jsonString.includes('"scene":') && !jsonString.match(/"scene":\s*"[^"]*",?\s*"roles"/)) {
        console.warn("Scene field appears incomplete, attempting to extract partial data...");
        
        // Try to extract title and story if they exist
        const titleMatch = jsonString.match(/"title":\s*"([^"]*)"/);
        const storyMatch = jsonString.match(/"story":\s*"([^"]*)"/);
        
        if (titleMatch && storyMatch) {
          console.warn("Extracted partial scenario data. Response was likely truncated.");
          throw new Error("Invalid JSON response from Groq API - response was truncated. The generated story is too long. Consider simplifying the prompt or increasing max_tokens further.");
        }
      }
      
      throw new Error("Invalid JSON response from Groq API - response may be truncated");
    }
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

    // Validate each role is an array with 3-4 items
    for (let i = 0; i < scenario.roles.length; i++) {
      const role = scenario.roles[i];
      if (!Array.isArray(role) || role.length < 3 || role.length > 4) {
        console.error(`Invalid role format at index ${i}:`, role, "Expected array with 3-4 items");
        throw new Error(`Invalid role format: role at index ${i} must be an array with 3-4 items`);
      }
    }

    console.log("Successfully generated scenario:", scenario.title);
    return {
      title: scenario.title.trim(),
      story: scenario.story.trim(),
      scene: scenario.scene.trim(),
      roles: scenario.roles.map((role) => role.map((item) => String(item).trim())),
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
      roles: [
        ["Acil butonuna ulaşmak için her türlü pozisyonu dene", "Her 30 saniyede bir 'Biri bizi duyuyor mu?' diye bağır", "Asansörün duvarlarına vurarak ritim tut", "Panik içinde nefes egzersizleri yap"],
        ["Telefon çekmiyor diye sürekli şikayet et", "Herkesi arayıp telefon çekmediğini söyle", "WiFi şifresini bulmaya çalış", "Sosyal medyada durumu paylaşmaya çalış"]
      ],
      performers: 2,
    },
    3: {
      title: "Süpermarket Çılgınlığı",
      story: "Süpermarkette son kalan efsanevi atıştırmalık için büyük bir yarış başladı. Üç kişi aynı anda aynı ürüne koşuyor. Biri alışveriş arabasıyla, diğeri koşarak, üçüncüsü ise stratejik bir plan yapmış. Herkes bu son ürünü almak istiyor ve durum giderek komikleşiyor.",
      scene: "Süpermarket rafında son kalan efsanevi atıştırmalık için üç kişi yarışıyor. Herkes aynı anda aynı ürüne ulaşmaya çalışıyor.",
      roles: [
        ["Alışveriş arabasıyla koşarken diğer müşterileri uyar", "Rafın önüne arabayı park et", "Ürünü almak için arabadan atla", "Diğerlerini engellemek için arabayı kullan"],
        ["Koşarken 'İlk ben gördüm!' diye bağır", "Diğerlerini geçmek için rafların arasından geç", "Ürünü almak için zıpla", "Rakip olarak gördüğün kişileri engelle"],
        ["Stratejik bir plan yap ve diğerlerini gözle", "En uygun anı bekle", "Diğerlerinin dikkatini dağıt", "Planını uygula ve ürünü al"]
      ],
      performers: 3,
    },
    4: {
      title: "Kayıp Kedi Macerası",
      story: "Mahallede kayıp bir kedi var ve dört komşu onu bulmaya çalışıyor. Her biri farklı bir yöntem kullanıyor: biri mama ile çağırıyor, diğeri kedi sesi çıkarıyor, üçüncüsü sosyal medyada paylaşım yapıyor, dördüncüsü ise profesyonel bir dedektif gibi davranıyor. Durum giderek absürtleşiyor.",
      scene: "Mahallede kayıp kedi aranıyor. Dört komşu farklı yöntemlerle kediyi bulmaya çalışıyor.",
      roles: [
        ["Mama ile kediyi çağır ve her köşede mama bırak", "Kedinin sevdiği yemekleri söyle", "Mama kabını sallayarak ses çıkar", "Diğerlerine kedinin yemek tercihlerini anlat"],
        ["Kedi sesi çıkar ve kediyi taklit et", "Farklı kedi sesleri dene", "Kedinin yanıt vermesini bekle", "Diğerlerine kedi dilini bildiğini söyle"],
        ["Sosyal medyada kayıp kedi ilanı paylaş", "Herkesi etiketle ve paylaşım yap", "Kedinin fotoğrafını göster", "Yorumlara cevap ver ve bilgi topla"],
        ["Profesyonel dedektif gibi davran ve ipuçları topla", "Diğerlerini sorgula", "Kedinin son görüldüğü yeri analiz et", "Detaylı bir rapor hazırla"]
      ],
      performers: 4,
    },
  };

  return fallbackScenarios[performerCount] || fallbackScenarios[2];
}

