# İş İlanı Analiz & Mülakat Hazırlık Platformu

> **Vercel (Serverless) + Supabase (PostgreSQL) + Next.js 15 + Prisma + Yapay Zekâ** ile geliştirilmiş uçtan uca kariyer ve mülakat hazırlık platformu.

Kullanıcılar Kariyer.net, LinkedIn, Indeed, Secretcv, Yenibiris gibi platformlardaki bir iş ilanının linkini yapıştırarak (veya metin olarak girerek):
1. **İlan Nitelik Analizi:** Zorunlu ve tercih sebebi nitelikler, önem dereceleri (1-5), ATS için kritik anahtar kelimeler ve kırmızı bayraklar (iş tanımı riskleri).
2. **Şirket İstihbaratı:** Şirket kültürü, ürünleri, son haberleri, çalışan yorumları analizi, şirkete özel mülakat taktikleri ve tıklanabilir web kaynak linkleri.
3. **Mülakat Soruları & STAR Hikâye Bankası (Story Bank):** Teknik, davranışsal (STAR metodunda örnek cevaplar + adayın kendi CV deneyimlerinden çıkarılan **5-8 kişisel STAR hikâyesi** ve soru eşleştirmesi), senaryo/kriz vakaları, şirkete özel sorular ve adayın işverene sorabileceği akıllıca sorular.
4. **Takip Sorulu (Follow-up) İnteraktif Pratik Modu:** Kullanıcının verdiği mülakat cevaplarını 1-10 puanlayan, gelişim önerileri sunan ve gerçek bir mülakatçı gibi ("Peki o projede ekibiniz kaç kişiydi?") derinleştirici takip soruları soran yapay zekâ koçu.
5. **Vurgulu CV Uyumluluk Analizi & Önce/Sonra Skor Karşılaştırması:** PDF ve Word (DOCX) formatındaki CV'leri bellekte ayrıştırır; CV metnindeki cümleleri renklendirerek (kırmızı/turuncu/sarı) gösterir, revizyonlar önerir ve güncellenmiş CV tekrar yüklendiğinde **eski ve yeni uyum skorunu yan yana (`62 → 81`)** karşılaştırır.
6. **İlana Özel Ön Yazı (Cover Letter) Üretimi:** İlan analizi ve CV verilerini birleştirerek seçilen tonda (Kurumsal, Samimi/Startup, İddialı) tek tıkla ön yazı üretir.
7. **Başvuru Takip Paneli (Application Tracker) & Raporlama:** Analiz edilen her ilanı takip edilebilir bir başvuruya dönüştürür (Durum: İnceleniyor, Başvuruldu, Mülakat, Teklif, Red; mülakat tarihi ve kişisel notlar); tüm verileri tek tıkla yazdırılabilir/PDF rapora dönüştürür.

---

## 🚀 Mimari & Serverless Prensipleri

- **Sunucu & Fonksiyonlar:** Vercel Serverless Functions (`fra1` Frankfurt bölgesi, `maxDuration = 60`).
- **Veritabanı:** Supabase PostgreSQL + Prisma ORM (Transaction pooler & Session pooler desteği).
- **Güvenlik (RLS):** Supabase tablolarında Row Level Security (RLS) devrededir; anon anahtarla PostgREST üzerinden hiçbir veri okunamaz.
- **Bellek Yönetimi:** Yüklenen CV dosyaları diske veya buluta yazılmaz; yalnızca bellekte işlenip 30 gün içinde cron ile otomatik silinir.
- **Sağlayıcı Bağımsız LLM:** Tek bir ortam değişkeni (`LLM_PROVIDER`) ile Anthropic Claude veya Google Gemini arasında geçiş yapılabilir.

---

## 🛠️ Kurulum ve Yerel Geliştirme

### 1. Gereksinimler
- Node.js 18+ (Node v20 veya v22 önerilir)
- npm veya pnpm
- Supabase hesabı (ücretsiz plan yeterlidir)
- Anthropic veya Google Gemini API anahtarı

### 2. Depoyu Klonlama ve Paket Kurulumu
```bash
git clone <repo-url>
cd preparation_for_interview
npm install --legacy-peer-deps
```

### 3. Ortam Değişkenleri (`.env.local`)
`.env.example` dosyasını kopyalayarak `.env.local` oluşturun:
```bash
cp .env.example .env.local
```

`.env.local` dosyasını kendi API anahtarlarınız ve veritabanı bağlantı dizelerinizle doldurun:
```env
# ---- LLM Sağlayıcısı ----
LLM_PROVIDER=gemini               # anthropic | gemini
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# ---- Web Arama Sağlayıcısı (Şirket Bilgisi) ----
SEARCH_PROVIDER=none              # tavily | serper | none
TAVILY_API_KEY=
SERPER_API_KEY=

# ---- Supabase / Veritabanı ----
DATABASE_URL="postgresql://postgres.[PROJE-REF]:[SIFRE]@aws-0-[BOLGE].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJE-REF]:[SIFRE]@aws-0-[BOLGE].pooler.supabase.com:5432/postgres"

# ---- Güvenlik & Cron ----
CRON_SECRET=rastgele_guclu_bir_dize_32_karakter_en_az
RATE_LIMIT_PER_MINUTE=10
CV_RETENTION_DAYS=30
```

### 4. Veritabanı Migration ve Prisma Client
Supabase bağlantı dizelerinizi girdikten sonra tabloları oluşturun:
```bash
npx prisma migrate dev
```

### 5. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```
Tarayıcınızda `http://localhost:3000` adresini açarak uygulamayı kullanmaya başlayabilirsiniz.

### 6. Testleri Çalıştırma
```bash
npm test
```

---

## ☁️ Supabase ve Vercel Canlıya Alma Rehberi

### Adım 1: Supabase Projesi Oluşturma
1. [supabase.com](https://supabase.com) adresine gidip yeni bir proje oluşturun.
2. Bölge olarak **Central EU (Frankfurt)** seçin (Vercel ile aynı bölgede olması gecikmeyi minimuma indirir).
3. Güçlü bir veritabanı şifresi belirleyin ve not edin.
4. Supabase panelinde sol alttaki **Project Settings -> Database** (veya üstteki **Connect**) bölümüne gidin:
   - **Transaction pooler (Port 6543):** Bağlantı dizesini kopyalayın, sonuna `?pgbouncer=true&connection_limit=1` ekleyip Vercel'de `DATABASE_URL` olarak tanımlayın.
   - **Session pooler / Direct (Port 5432):** Bağlantı dizesini kopyalayın ve `DIRECT_URL` olarak tanımlayın.
   - Bağlantı dizelerindeki `[YOUR-PASSWORD]` kısmını kendi şifrenizle değiştirdiğinizden emin olun.

### Adım 2: GitHub Reposu
1. GitHub'da yeni bir (tercihen private) repo açın.
2. `.env` ve `.env.local` dosyalarının `.gitignore` içinde olduğunu teyit edin.
3. Projeyi GitHub'a push edin.

### Adım 3: Vercel Proje Kurulumu
1. [vercel.com](https://vercel.com) adresine gidin ve **Add New -> Project** seçeneğine tıklayın.
2. GitHub reponuzu bağlayın (Framework otomatik Next.js olarak tanınacaktır).
3. **Environment Variables** bölümüne `.env.example` içindeki tüm değişkenleri girin:
   - `LLM_PROVIDER`, `GEMINI_API_KEY` veya `ANTHROPIC_API_KEY`
   - `DATABASE_URL` ve `DIRECT_URL`
   - `CRON_SECRET`
   - `SEARCH_PROVIDER` (Tavily veya Serper kullanacaksanız ilgili API anahtarı)
4. **Deploy** butonuna basın.
   - Build sırasında `prisma migrate deploy` komutu otomatik çalışır ve Supabase veritabanındaki tabloları ve RLS politikalarını canlıya uygular.

### Adım 4: Canlı Ayarlarının Kontrolü
- **Bölge:** Vercel projenizde **Settings -> Functions** altında bölgenin `fra1` (Frankfurt) olduğunu teyit edin.
- **Cron Jobs:** **Settings -> Cron Jobs** sekmesinde `/api/cron/temizlik` görevinin her gece `0 3 * * *` (03:00) saatinde listelendiğini kontrol edin.

---

## 🔧 Sık Karşılaşılan Sorunlar ve Çözümleri

- **"Prepared statement already exists" hatası:**
  `DATABASE_URL` değişkeninin sonuna `?pgbouncer=true&connection_limit=1` parametresini eklediğinizden emin olun.
- **"Can't reach database server" hatası:**
  Şifrenizde özel karakterler varsa URL encode gerekebilir. Supabase projesi ücretsiz planda uzun süre kullanılmadığında duraklatılabilir; Supabase panelinden projeyi uyandırın (Resume).
- **Fonksiyon zaman aşımı (Timeout):**
  Tüm LLM ve Scraping route'larında `export const maxDuration = 60;` tanımlıdır. Vercel Pro planı 60 saniyeye kadar destekler; Hobby planında tekil isteklerin 50 saniyenin altında kalmasına dikkat edilmelidir.
- **LinkedIn / İlan Çekilemiyor (Bot Duvarı):**
  LinkedIn, Kariyer.net veya Indeed gibi platformlar sunucu IP adreslerini bot korumasıyla engelleyebilir. Bu durumda sistem kullanıcıya nazik bir uyarı verir ve **"İlan Metnini Yapıştır"** sekmesini otomatik açar.

---

## 🛡️ Güvenlik ve KVKK

- **RLS (Row Level Security):** `Analysis`, `CvUpload` ve `RateLimit` tablolarında RLS etkindir. Supabase'in herkese açık istemci API'si üzerinden veri okunamaz.
- **Kişisel Veri Saklama Süresi:** Yüklenen CV metinleri en fazla 30 gün saklanır ve Cron temizlik göreviyle silinir. Kullanıcı dilediği an "CV'mi Şimdi Sil" butonuyla anında silebilir.
- **Anonymous Session:** Kimlik doğrulama gerektirmeden, her kullanıcıya `httpOnly`, `secure`, `sameSite=lax` çereziyle rastgele bir `anonymousId` atanır ve geçmiş kayıtları yalnızca bu çerez sahibi tarafından görüntülenebilir.

---

## ✨ Tamamlanan Gelişmiş Özellikler (Uçtan Uca Asistan)

- **1. Önce/Sonra Skor Karşılaştırması:** Güncellenmiş CV tekrar yüklendiğinde eski ve yeni uyum skorunu (`62 → 81`) ve tamamlanan anahtar kelimeleri yan yana gösterir.
- **2. Hikâye Bankası (STAR Story Bank):** Adayın CV deneyimlerinden 5-8 kişisel STAR hikâyesi çıkarır ve davranışsal mülakat sorularıyla eşleştirir.
- **3. Takip (Follow-up) Soruları:** Pratik modunda cevaptan sonra gerçek bir mülakatçı gibi derinleştirici takip soruları üretir ve tekrar puanlar.
- **4. “Çalışılacaklar” Listesi (Actionable Study Plan):** Eksik nitelikler için mülakata kadar açığı kapatacak kaynak önerisi, 1-2 günlük mini proje fikri ve mülakat savunma stratejisi üretir.
- **5. Maaş ve Pazarlık Hazırlığı:** Pozisyon ve kıdeme göre maaş beklentisi sorusuna stratejik yanıt senaryoları ve yan hak müzakere ipuçları sunar.
- **6. Başvuru Takip Paneli (Application Tracker):** Analiz edilen her ilanı Kanban & Liste görünümünde takip edilebilir bir başvuruya dönüştürür (durum, mülakat tarihi, notlar) ve cihazlar arası eşitleme kodu sunar.
- **7. İlana Özel Ön Yazı (Cover Letter) Üretimi:** Kurumsal, Samimi ve İddialı tonlarda ön yazı üretir, düzenleme ve kaydetme imkânı verir.
- **8. Tutarlılık Kontrolü (CV İçi & CV–Ön Yazı):** CV içindeki tarih çakışmaları, >3 ay açıklanmamış kariyer boşlukları ve unvan uyumsuzlukları ile CV–Ön Yazı tutarlılığını denetler.
- **9. GitHub / Portföy Analizi:** Adayın herkese açık GitHub repolarını çekip hedef ilanla eşleşen projeleri ve hazır CV maddelerini önerir.
- **10. İlansız Pozisyon Önerisi (Kariyer Pusulası):** Sadece CV yükleyerek adayın profiline en uygun 5 pozisyonu, uyum yüzdesini ve arama kelimelerini önerir.
- **11. Sesli Mülakat Provası (Web Speech API):** Tarayıcı yerleşik TTS/STT desteğiyle soruları sesli okur ve adayın mikrofonla verdiği sözlü cevabı yazıya döküp puanlar.
- **12. Kendi API Anahtarını Getir (BYOK):** Kullanıcının kendi Claude veya Gemini anahtarını girerek sunucu rate-limit kotasına takılmadan çalışmasını sağlar.
- **13. LinkedIn Profil Önerileri & Optimize CV İndirme:** LinkedIn Başlığı (Headline) ve “Hakkında” (About) bölümü önerileri üretir; tüm önerilerin uygulandığı optimize CV'yi Word (`.doc`) veya `.txt` olarak indirir.
- **14. Prompt Testi, Injection Test Seti & Chrome Eklentisi:** `lib/llm/judge.ts` (LLM-as-a-Judge), `test/prompt-security.test.ts` güvenlik test seti ve `chrome-extension/` klasöründe tek tıkla ilan analiz eden Chrome eklentisi yer alır.
