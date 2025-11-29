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
  const prompt = `Lütfen ${performerCount} oyuncu için doğaçlama komedi oyunu için absürt, gerçek dışı bir senaryo üret.

Gereksinimler:
- Başlık: Dikkat çekici, Türkçe (max 5 kelime)

- Hikaye: 4-5 cümlelik basit ve net arka plan hikayesi. Hikaye şunları içermeli:
  * Basit kurulum: ABSÜRT bir durum - gerçek hayatta yaşanmayacak, tuhaf bir durum. Ortam absürt olmalı (ör: uçan süpermarket, konuşan nesnelerle dolu kafe, yerçekimsiz asansör, altın ördekli park vb.). Tek bir basit durum, karmaşık komplikasyonlar yok.
  * Basit motivasyonlar: Her karakter için tek, net bir hedef. Karmaşık motivasyonlar yerine basit ve anlaşılır hedefler.
  * Tek ana çatışma: Çoklu çatışmalar yerine tek odaklı durum. İçsel ve dışsal çatışmaları birleştirip tek bir basit çatışma yapma.
  * Basit ilişkiler: Karmaşık geçmiş hikayeler yerine basit ilişki (komşu, tanıdık, yabancı, iş arkadaşı vb.). Uzun geçmiş hikayeler, karmaşık bağlantılar yok.
  * Sade bahisler: Basit ve anlaşılır sonuçlar. Başarısız olurlarsa veya başarılı olurlarsa ne olur? Karmaşık sonuçlar yerine basit sonuçlar.
  * Komedi: Ortam ve durum absürt olmalı - gerçek hayatta yaşanmayacak türde. Karakterler ve durumlar doğal olarak absürt olacak, zorlama komedi detayları eklenmemeli.
  ABSÜRT ORTAMLAR VE DURUMLAR TEŞVİK EDİLİYOR: Gerçek hayatta yaşanmayacak absürt mekanlar, tuhaf nesneler, absürt durumlar kullan. Fantastik öğeler kullanılabilir ama basit tut. Karmaşık komplikasyonlar, çoklu çatışmalar, uzun geçmiş hikayeler ekleme. Senaryo okunduğu anda ne yapılacağı net olmalı, oyuncuların hemen başlayabileceği basit ama absürt bir durum.

- Sahne: 2-3 cümlelik basit sahne açıklaması. Şunları içermeli:
  * Fiziksel ortam: ABSÜRT bir mekan - gerçek hayatta yaşanmayacak, tuhaf bir yer (ör: uçan süpermarket, konuşan nesnelerle dolu kafe, yerçekimsiz asansör, altın ördekli park, tersine dönmüş dünya vb.). Önemli objeler/proplar absürt olabilir (ama çok detaylı değil, basit tut)
  * Duygusal atmosfer: Sahnenin basit tonu, havası
  * Ana durum: Oyuncuların oynayacağı temel durum - anında anlaşılabilir, oyuncuların hemen başlayabileceği basit bir durum. Karmaşık komplikasyonlar yok, tek bir basit durum.
  * Spontane başlangıç: Oyuncuların ön hazırlık yapmadan, düşünmeden hemen canlandırabileceği durum. Senaryo okunduğu anda ne yapılacağı net olmalı.
  ABSÜRT ve pratik olarak canlandırılabilir, basit bir durum olmalı. Ortam gerçek hayatta yaşanmayacak kadar absürt olmalı. Fantastik öğeler, absürt nesneler, tuhaf mekanlar kullanılabilir ama basit tut. Zorlama komedi detayları eklenmemeli, absürtlük doğal olmalı.

- Roller: Her oyuncu için hikayeye özel side-questler. Her rol, oyuncunun round içinde yapması beklenen 3-4 maddelik görevler/özellikler listesi olmalı. Bu side-questler:
  * Basit ve anlaşılır görevler: Her görev tek adımlı, net ve hızlıca anlaşılabilir olmalı. Oyuncuların düşünmeden hemen canlandırabileceği görevler. Karmaşık multi-step görevler yerine basit, spontane canlandırılabilir görevler.
  * Etkileşim: Basit etkileşimler (bireysel görevler, işbirlikçi veya rekabetçi görevler) ama karmaşık değil. Bazı görevler diğer oyuncularla etkileşimli olabilir ama basit ve net olmalı.
  * Karakter özellikleri: Basit kişilik özellikleri, absürt ortama uygun davranışlar. Karmaşık karakter gelişimi değil, hızlıca canlandırılabilir özellikler.
  * Senaryoya uyum: Senaryoya uyum sağlayacak basit hareketler veya kişisel özellikler. Absürt ortama uygun, zorlama komedi yok.
  * Komedi: Absürt durumlar ve karakterler doğal olarak komik olacak, zorlama komedi detayları eklenmemeli.
  * Canlandırılabilir: Pratik olarak canlandırılabilir olmalı (fiziksel olarak mümkün, özel props veya efekt gerektirmeyen, spontane canlandırılabilir, absürt ama oynanabilir)
  * Kısa ve net: Her madde kısa ve net olmalı (1 cümle), anında anlaşılabilir

Önemli: 
- Senaryo BASIT ve SPONTANE canlandırılabilir olmalı: Oyuncuların düşünmeden hemen başlayabileceği, anında anlaşılabilir, karmaşık komplikasyonlar içermeyen basit durumlar
- Senaryo ABSÜRT ve gerçek dışı olmalı: ORTAM gerçek hayatta yaşanmayacak kadar absürt olmalı. Absürt mekanlar, tuhaf nesneler, gerçek dışı durumlar. Fantastik öğeler kullanılabilir ama basit tut. Zorlama komedi detayları eklenmemeli, absürtlük doğal olmalı.
- ABSÜRT ORTAMLAR VE DURUMLAR TEŞVİK EDİLİYOR: Gerçek hayatta yaşanmayacak absürt mekanlar (uçan yerler, konuşan nesneler, yerçekimsiz ortamlar vb.), fantastik öğeler, tuhaf nesneler, absürt durumlar kullan. Ama olay örgüsü basit kalmalı!
- Basit hikaye: Basit motivasyonlar, tek ana çatışma, basit ilişkiler, sade bahisler. Karmaşık komplikasyonlar, çoklu çatışmalar, uzun geçmiş hikayeler YOK.
- Basit etkileşimler: Karmaşık değil, basit işbirliği veya rekabet öğeleri
- Hızlı başlangıç: Senaryo okunduğu anda ne yapılacağı net olmalı, oyuncuların uzun süre düşünmesine gerek olmamalı
- Canlandırılması uygun senaryolar üret: Anlaşılabilir, pratik, özel props veya efekt gerektirmeyen, fiziksel olarak mümkün, spontane canlandırılabilir durumlar
- Senaryo basit tut ama ortam absürt olsun - gerçek hayatta yaşanmayacak türde. Zorlama komedi detayları eklenmemeli.
- Tarihi olabilir ama spesifik tarihsel olaylara bağlı olmamalı

Sadece aşağıdaki JSON formatında cevap ver, başka hiçbir açıklama ekleme:
{
  "title": "Türkçe Senaryo Başlığı",
  "story": "4-5 cümlelik basit ve net ama absürt hikaye - ABSÜRT ORTAM (basit kurulum ama absürt mekan, basit motivasyonlar, tek ana çatışma, basit ilişkiler, sade bahisler)...",
  "scene": "2-3 cümlelik basit sahne açıklaması - ABSÜRT MEKAN (gerçek hayatta yaşanmayacak absürt fiziksel ortam, basit atmosfer, anında anlaşılabilir ana durum)...",
  "roles": [
    ["Basit görev 1 (spontane, absürt)", "Basit görev 2 (anlaşılabilir)", "Basit görev 3 (basit etkileşim)", "Basit görev 4"],
    ["Basit görev 1 (spontane, absürt)", "Basit görev 2 (anlaşılabilir)", "Basit görev 3 (basit etkileşim)", "Basit görev 4"]
  ]
}

Her rol bir array olmalı ve 3-4 maddelik basit, anlaşılabilir, spontane canlandırılabilir side-quest içermeli. Side-questler basit görevler olmalı, karmaşık değil. Bazıları diğer oyuncularla basit etkileşimler içerebilir ama karmaşık olmamalı.`;

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

