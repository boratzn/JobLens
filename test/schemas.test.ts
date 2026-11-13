import { describe, it, expect } from "vitest";
import {
  JobAnalysisSchema,
  CompanyInfoSchema,
  InterviewSetSchema,
  CvMatchSchema,
  StarStorySchema,
  CoverLetterSchema,
  ApplicationTrackerSchema,
  PracticeFeedbackSchema,
} from "@/lib/schemas";

describe("Zod Data Models Validation", () => {
  it("JobAnalysisSchema geçerli iş ilanını onaylar", () => {
    const validJob = {
      baslik: "Kıdemli Frontend Geliştirici",
      sirketAdi: "Teknoloji A.Ş.",
      lokasyon: "İstanbul (Hibrit)",
      calismaSekli: "hibrit",
      pozisyonSeviyesi: "senior",
      deneyimYili: { min: 4, max: 7 },
      ozet: "Modern frontend mimarileri ve React ekosisteminde deneyimli ekip arkadaşı aranıyor.",
      zorunluNitelikler: [
        {
          ad: "React & TypeScript",
          kategori: "teknik",
          onemDerecesi: 5,
          aciklama: "En az 4 yıl ileri düzey React ve TypeScript deneyimi.",
        },
      ],
      tercihSebebiNitelikler: [],
      teknikBeceriler: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
      davranissalBeceriler: ["Takım çalışması", "Problem çözme"],
      egitim: "Bilgisayar Mühendisliği veya ilgili lisans",
      diller: [{ dil: "İngilizce", seviye: "B2/C1" }],
      sertifikalar: [],
      sorumluluklar: ["Frontend mimarisinin geliştirilmesi"],
      yanHaklar: ["Özel sağlık sigortası", "Yemek kartı"],
      anahtarKelimeler: ["React", "Next.js", "State Management"],
      kirmiziBayraklar: [],
    };

    const parsed = JobAnalysisSchema.safeParse(validJob);
    expect(parsed.success).toBe(true);
  });

  it("CvMatchSchema uyumluluk ve düzenleme alanlarını doğrular", () => {
    const validCvMatch = {
      uyumSkoru: 85,
      skorDagilimi: {
        teknik: 88,
        deneyim: 80,
        egitim: 90,
        dil: 85,
        anahtarKelime: 82,
      },
      gucluYanlar: ["Güçlü React deneyimi", "Modern araç seti kullanımı"],
      eksikNitelikler: [
        {
          nitelik: "Docker",
          onem: 3,
          oneri: "Temel konteynerizasyon deneyiminizi ekleyin",
        },
      ],
      eksikAnahtarKelimeler: ["Docker", "GraphQL"],
      duzenlemeler: [
        {
          bolum: "deneyim",
          mevcutMetin: "Frontend projelerinde çalıştım.",
          onerilenMetin:
            "React ve Next.js kullanarak 100K+ aktif kullanıcılı e-ticaret platformunun frontend mimarisini optimize ettim.",
          gerekce: "Metrikler ve teknolojilerle etkiyi somutlaştırma",
          oncelik: "yüksek",
          tur: "değiştir",
        },
      ],
      atsUyarilari: ["İletişim bilgilerinizde LinkedIn profil linki eksik."],
      genelTavsiye:
        "Profiliniz ilan için oldukça güçlü, deneyim ifadelerini metriklerle destekleyerek şansınızı artırabilirsiniz.",
    };

    const parsed = CvMatchSchema.safeParse(validCvMatch);
    expect(parsed.success).toBe(true);
  });

  it("StarStorySchema, CoverLetterSchema, ApplicationTrackerSchema ve PracticeFeedbackSchema yeni MVP özelliklerini doğrular", () => {
    const story = StarStorySchema.safeParse({
      id: "story-1",
      baslik: "Ödeme Sistemi Mikroservis Dönüşümü",
      sirketVeyaProje: "FinTech A.Ş.",
      durum: "Monolitik ödeme servisi yoğun kampanya dönemlerinde yavaşlıyordu.",
      gorev: "Sıfır kesintiyle mikroservis mimarisine geçişi yönetmek.",
      eylem: "Event-driven mimari ve kuyruk yapısı kurguladım.",
      sonuc: "Yanıt süresi %45 azaldı, hata oranı %0.1'in altına indi.",
      yetkinlikler: ["Mimari Tasarım", "Kriz Yönetimi"],
      eslesenSorular: ["Zor bir teknik problemi nasıl çözdünüz?"],
    });
    expect(story.success).toBe(true);

    const coverLetter = CoverLetterSchema.safeParse({
      ton: "kurumsal",
      konuBasligi: "Kıdemli Frontend Geliştirici Başvurusu — Ad Soyad",
      icerik: "Sayın İşe Alım Yöneticisi,\n\nŞirketinizin...",
      vurgulananNitelikler: ["React", "TypeScript", "Performans Optimizasyonu"],
      ipucu: "Başvuruyu gönderirken GitHub portföy linkinizi de ekleyin.",
    });
    expect(coverLetter.success).toBe(true);

    const tracker = ApplicationTrackerSchema.safeParse({
      durum: "mulakat",
      mulakatTarihi: "2026-11-05",
      notlar: "İK görüşmesi olumlu geçti, teknik mülakat bekleniyor.",
    });
    expect(tracker.success).toBe(true);

    const feedback = PracticeFeedbackSchema.safeParse({
      puan: 8,
      olumluYonler: ["STAR adımları net"],
      gelistirilmesiGerekenler: ["Sonuç metriği eklenebilir"],
      ornekIyilestirme: "Sonuç olarak %30 hız artışı sağladık...",
      takipSorusu: "Peki o projede ekibiniz kaç kişiydi ve görev dağılımını nasıl yaptınız?",
      takipIpucu: "Ekip büyüklüğünü ve kendi sorumluluk sınırınızı net belirtin.",
    });
    expect(feedback.success).toBe(true);
  });
});
