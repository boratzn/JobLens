import { z } from "zod";

// ---- Nitelik Şeması ----
export const NitelikSchema = z.object({
  ad: z.string(),
  kategori: z.enum([
    "teknik",
    "davranışsal",
    "eğitim",
    "deneyim",
    "dil",
    "sertifika",
    "diğer",
  ]),
  onemDerecesi: z.number().int().min(1).max(5),
  aciklama: z.string(),
});
export type Nitelik = z.infer<typeof NitelikSchema>;

// ---- Başvuru Takip (Application Tracker) Şeması ----
export const ApplicationStatusSchema = z.enum([
  "inceleniyor",
  "basvuruldu",
  "mulakat",
  "teklif",
  "red",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const ApplicationTrackerSchema = z.object({
  durum: ApplicationStatusSchema.default("inceleniyor"),
  mulakatTarihi: z.string().nullable().default(null),
  notlar: z.string().default(""),
  guncellenmeTarihi: z.string().optional(),
});
export type ApplicationTracker = z.infer<typeof ApplicationTrackerSchema>;

// ---- İlan Analiz Şeması ----
export const JobAnalysisSchema = z.object({
  baslik: z.string(),
  sirketAdi: z.string(),
  lokasyon: z.string().nullable().default(null),
  calismaSekli: z.enum(["ofis", "hibrit", "uzaktan", "belirtilmemiş"]).default("belirtilmemiş"),
  pozisyonSeviyesi: z
    .enum(["stajyer", "junior", "mid", "senior", "lead", "yönetici", "belirtilmemiş"])
    .default("belirtilmemiş"),
  deneyimYili: z.object({
    min: z.number().nullable().default(null),
    max: z.number().nullable().default(null),
  }),
  ozet: z.string(),
  zorunluNitelikler: z.array(NitelikSchema).default([]),
  tercihSebebiNitelikler: z.array(NitelikSchema).default([]),
  teknikBeceriler: z.array(z.string()).default([]),
  davranissalBeceriler: z.array(z.string()).default([]),
  egitim: z.string().nullable().default(null),
  diller: z
    .array(
      z.object({
        dil: z.string(),
        seviye: z.string(),
      })
    )
    .default([]),
  sertifikalar: z.array(z.string()).default([]),
  sorumluluklar: z.array(z.string()).default([]),
  yanHaklar: z.array(z.string()).default([]),
  anahtarKelimeler: z.array(z.string()).default([]),
  kirmiziBayraklar: z.array(z.string()).default([]),
  basvuruTakip: ApplicationTrackerSchema.optional(),
});
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

// ---- Şirket Bilgisi Şeması ----
export const CompanyInfoSchema = z.object({
  ad: z.string(),
  sektor: z.string().nullable().default(null),
  kurulusYili: z.string().nullable().default(null),
  calisanSayisi: z.string().nullable().default(null),
  merkez: z.string().nullable().default(null),
  webSitesi: z.string().nullable().default(null),
  ozet: z.string(),
  urunVeHizmetler: z.array(z.string()).default([]),
  sirketKulturu: z.array(z.string()).default([]),
  sonHaberler: z
    .array(
      z.object({
        baslik: z.string(),
        ozet: z.string(),
        kaynak: z.string(),
        tarih: z.string().nullable().default(null),
      })
    )
    .default([]),
  rakipler: z.array(z.string()).default([]),
  mulakatIpuclari: z.array(z.string()).default([]),
  kaynaklar: z
    .array(
      z.object({
        baslik: z.string(),
        url: z.string(),
      })
    )
    .default([]),
  guvenilirlikNotu: z.string(),
});
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;

// ---- Mülakat Soruları Şeması ----
export const SoruSchema = z.object({
  soru: z.string(),
  ilgiliNitelik: z.string(),
  zorluk: z.enum(["kolay", "orta", "zor"]).default("orta"),
  nedenSorulur: z.string(),
  ornekCevap: z.string(),
  cevapIpuclari: z.array(z.string()).default([]),
  kacinilacaklar: z.array(z.string()).default([]),
});
export type Soru = z.infer<typeof SoruSchema>;

export const SenaryoSoruSchema = SoruSchema.extend({
  senaryo: z.string(),
  degerlendirmeKriterleri: z.array(z.string()).default([]),
});
export type SenaryoSoru = z.infer<typeof SenaryoSoruSchema>;

// ---- STAR Hikâye Bankası (Story Bank) Şeması ----
export const StarStorySchema = z.object({
  id: z.string(),
  baslik: z.string(),
  sirketVeyaProje: z.string(),
  durum: z.string(),
  gorev: z.string(),
  eylem: z.string(),
  sonuc: z.string(),
  yetkinlikler: z.array(z.string()).default([]),
  eslesenSorular: z.array(z.string()).default([]),
});
export type StarStory = z.infer<typeof StarStorySchema>;

export const StarStoryBankSchema = z.object({
  hikayeler: z.array(StarStorySchema).default([]),
});
export type StarStoryBank = z.infer<typeof StarStoryBankSchema>;

// ---- Ön Yazı (Cover Letter) Şeması ----
export const CoverLetterSchema = z.object({
  ton: z.enum(["kurumsal", "samimi", "iddiali"]).default("kurumsal"),
  konuBasligi: z.string(),
  icerik: z.string(),
  vurgulananNitelikler: z.array(z.string()).default([]),
  ipucu: z.string(),
  tutarlilikKontrolu: z
    .object({
      uyumluMu: z.boolean().default(true),
      dogrulananDetaylar: z.array(z.string()).default([]),
      uyarilar: z.array(z.string()).default([]),
    })
    .optional(),
});
export type CoverLetter = z.infer<typeof CoverLetterSchema>;

// ---- Maaş ve Pazarlık Hazırlığı Şeması (#5) ----
export const MaasPazarlikSchema = z.object({
  stratejiOzeti: z.string(),
  beklentiSorusuCevaplari: z
    .array(
      z.object({
        senaryo: z.string(),
        ornekCevap: z.string(),
      })
    )
    .default([]),
  pazarlikTaktikleri: z.array(z.string()).default([]),
  yanHakMuzakeresi: z.array(z.string()).default([]),
  kacinilacakHatalar: z.array(z.string()).default([]),
});
export type MaasPazarlik = z.infer<typeof MaasPazarlikSchema>;

export const InterviewSetSchema = z.object({
  teknik: z.array(SoruSchema).default([]),
  davranissal: z.array(SoruSchema).default([]),
  senaryolu: z.array(SenaryoSoruSchema).default([]),
  sirketeOzel: z.array(SoruSchema).default([]),
  adayinSoracaklari: z
    .array(
      z.object({
        soru: z.string(),
        nedenIyi: z.string(),
      })
    )
    .default([]),
  hikayeBankasi: z.array(StarStorySchema).optional(),
  onYazi: CoverLetterSchema.optional(),
  maasPazarlik: MaasPazarlikSchema.optional(),
});
export type InterviewSet = z.infer<typeof InterviewSetSchema>;

// ---- CV Tutarlılık Kontrolü Şeması (#8) ----
export const TutarlilikBulgusuSchema = z.object({
  tur: z
    .enum([
      "tarih_cakismasi",
      "kariyer_boslugu",
      "unvan_uyumsuzlugu",
      "diger",
    ])
    .default("diger"),
  ciddiyet: z.enum(["yüksek", "orta", "düşük"]).default("orta"),
  aciklama: z.string(),
  mulakatSorusu: z.string(),
  savunmaOnerisi: z.string(),
});
export type TutarlilikBulgusu = z.infer<typeof TutarlilikBulgusuSchema>;

export const TutarlilikKontroluSchema = z.object({
  genelDurum: z
    .string()
    .default("CV içi tarih ve unvan akışı genel olarak tutarlı görünüyor."),
  bulgular: z.array(TutarlilikBulgusuSchema).default([]),
});
export type TutarlilikKontrolu = z.infer<typeof TutarlilikKontroluSchema>;

// ---- LinkedIn Profil Önerileri Şeması (#13) ----
export const LinkedinOnerileriSchema = z.object({
  baslikOnerileri: z.array(z.string()).default([]),
  hakkindaOnerisi: z.string().default(""),
  oneCikarilacakBeceriler: z.array(z.string()).default([]),
});
export type LinkedinOnerileri = z.infer<typeof LinkedinOnerileriSchema>;

// ---- GitHub / Portföy Analizi Şeması (#9) ----
export const GitHubProjectMatchSchema = z.object({
  repoAdi: z.string(),
  repoUrl: z.string(),
  uyumSkoru: z.number().min(0).max(100),
  nedenUygun: z.string(),
  cvEklemeOnerisi: z.string(),
  mulakatAnlatimi: z.string(),
});
export type GitHubProjectMatch = z.infer<typeof GitHubProjectMatchSchema>;

export const GitHubAnalysisSchema = z.object({
  kullaniciAdi: z.string(),
  ozetDegerlendirme: z.string(),
  oneCikanProjeler: z.array(GitHubProjectMatchSchema).default([]),
  portfoyTavsiyeleri: z.array(z.string()).default([]),
});
export type GitHubAnalysis = z.infer<typeof GitHubAnalysisSchema>;

// ---- İlansız Pozisyon Önerisi / Kariyer Pusulası Şeması (#10) ----
export const CareerCompassSchema = z.object({
  profilOzeti: z.string(),
  onerilenPozisyonlar: z
    .array(
      z.object({
        baslik: z.string(),
        uyumYuzdesi: z.number().min(0).max(100),
        seviye: z.string(),
        nedenUygun: z.string(),
        gucluBeceriler: z.array(z.string()).default([]),
        gelistirilecekBeceriler: z.array(z.string()).default([]),
        aramaAnahtarKelimeleri: z.array(z.string()).default([]),
      })
    )
    .default([]),
  kariyerHaritasiNotu: z.string(),
});
export type CareerCompass = z.infer<typeof CareerCompassSchema>;

// ---- CV Karşılaştırma Şeması ----
export const CvDuzenlemeSchema = z.object({
  bolum: z.enum([
    "özet",
    "deneyim",
    "beceriler",
    "eğitim",
    "projeler",
    "sertifikalar",
    "diğer",
  ]),
  mevcutMetin: z.string(),
  onerilenMetin: z.string(),
  gerekce: z.string(),
  oncelik: z.enum(["yüksek", "orta", "düşük"]).default("orta"),
  tur: z.enum(["değiştir", "ekle", "çıkar"]).default("değiştir"),
});
export type CvDuzenleme = z.infer<typeof CvDuzenlemeSchema>;

export const EksikNitelikPlaniSchema = z.object({
  nitelik: z.string(),
  onem: z.number().min(1).max(5),
  oneri: z.string(),
  kaynakOnerisi: z.string().optional().default(""),
  miniProjeFikri: z.string().optional().default(""),
  mulakatSavunmasi: z.string().optional().default(""),
});
export type EksikNitelikPlani = z.infer<typeof EksikNitelikPlaniSchema>;

export const CvMatchSchema = z.object({
  uyumSkoru: z.number().min(0).max(100),
  skorDagilimi: z.object({
    teknik: z.number().min(0).max(100),
    deneyim: z.number().min(0).max(100),
    egitim: z.number().min(0).max(100),
    dil: z.number().min(0).max(100),
    anahtarKelime: z.number().min(0).max(100),
  }),
  gucluYanlar: z.array(z.string()).default([]),
  eksikNitelikler: z.array(EksikNitelikPlaniSchema).default([]),
  eksikAnahtarKelimeler: z.array(z.string()).default([]),
  duzenlemeler: z.array(CvDuzenlemeSchema).default([]),
  atsUyarilari: z.array(z.string()).default([]),
  genelTavsiye: z.string(),
  tutarlilikKontrolu: TutarlilikKontroluSchema.optional(),
  linkedinOnerileri: LinkedinOnerileriSchema.optional(),
  githubAnalizi: GitHubAnalysisSchema.optional(),
});
export type CvMatch = z.infer<typeof CvMatchSchema>;

// ---- Pratik Cevap Değerlendirme & Takip (Follow-up) Sorusu Şeması ----
export const PracticeFeedbackSchema = z.object({
  puan: z.number().int().min(1).max(10),
  olumluYonler: z.array(z.string()),
  gelistirilmesiGerekenler: z.array(z.string()),
  ornekIyilestirme: z.string(),
  takipSorusu: z
    .string()
    .default(
      "Bu süreçte karşılaştığınız en kritik teknik veya iletişimsel engel neydi ve bunu nasıl ölçümlediniz?"
    ),
  takipIpucu: z
    .string()
    .default(
      "Somut bir metrik, ekip içi rolünüz ve aldığınız kararın doğrudan etkisini belirterek yanıtlayın."
    ),
});
export type PracticeFeedback = z.infer<typeof PracticeFeedbackSchema>;

// ---- Request Input Doğrulama Şemaları ----
export const JobAnalysisUrlInputSchema = z.object({
  url: z.string().url("Geçerli bir ilan linki giriniz"),
  force: z.boolean().optional().default(false),
});

export const JobAnalysisTextInputSchema = z.object({
  metin: z.string().min(50, "İlan metni en az 50 karakter olmalıdır"),
  baslik: z.string().optional(),
  sirketAdi: z.string().optional(),
});

// ---- CV ile Eşleşen Canlı İş İlanları Şeması ----
export const MatchedJobListingSchema = z.object({
  id: z.string(),
  baslik: z.string(),
  sirket: z.string(),
  lokasyon: z.string(),
  kaynakSite: z.string(),
  url: z.string(),
  yayinTarihi: z.string().nullable().default(null),
  uyumYuzdesi: z.number().min(0).max(100),
  nedenEslesiyor: z.string(),
  eslesenBeceriler: z.array(z.string()).default([]),
});
export type MatchedJobListing = z.infer<typeof MatchedJobListingSchema>;

export const CvJobSearchResultSchema = z.object({
  onerilenAramaTerimleri: z.array(z.string()).default([]),
  adayKidemSeviyesi: z.string().default("Belirtilmemiş"),
  ilanlar: z.array(MatchedJobListingSchema).default([]),
  platformAramaLinkleri: z
    .array(
      z.object({
        platform: z.string(),
        url: z.string(),
        aramaTerimi: z.string(),
      })
    )
    .default([]),
});
export type CvJobSearchResult = z.infer<typeof CvJobSearchResultSchema>;

// ---- Otomatik CV Düzenleme (Auto-Rewrite) Şeması ----
export const AutoEditedCvResultSchema = z.object({
  yeniCvMetni: z.string(),
  uygulananDegisiklikler: z
    .array(
      z.object({
        bolum: z.string(),
        yapilanIslem: z.string(),
        etki: z.string(),
      })
    )
    .default([]),
  eklenenAnahtarKelimeler: z.array(z.string()).default([]),
  yeniCvMatch: CvMatchSchema,
});
export type AutoEditedCvResult = z.infer<typeof AutoEditedCvResultSchema>;

