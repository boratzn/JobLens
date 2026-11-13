"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CareerCompass, CvJobSearchResult } from "@/lib/schemas";
import {
  Link2,
  FileText,
  Sparkles,
  ArrowRight,
  Target,
  Building2,
  MessageSquareCheck,
  FileCheck2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  History,
  Zap,
  CheckCircle2,
  TrendingUp,
  Compass,
  Upload,
  MapPin,
  Briefcase,
  Trash2,
  RefreshCw,
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");

  // Bağımsız Ana Sayfa CV Yönetimi & Eşleşen İlanları Çekme state'leri
  const [savedCvText, setSavedCvText] = useState<string | null>(null);
  const [savedCvFileName, setSavedCvFileName] = useState<string | null>(null);
  const [showCvUploadForm, setShowCvUploadForm] = useState(false);
  const [compassFile, setCompassFile] = useState<File | null>(null);
  const [compassKvkk, setCompassKvkk] = useState(false);
  const [compassLocation, setCompassLocation] = useState("Türkiye");
  const [compassCustomQuery, setCompassCustomQuery] = useState("");
  const [isUploadingMasterCv, setIsUploadingMasterCv] = useState(false);
  const [isSearchingMatchingJobs, setIsSearchingMatchingJobs] = useState(false);
  const [isLoadingCompass, setIsLoadingCompass] = useState(false);
  const [cvCenterError, setCvCenterError] = useState<string | null>(null);
  const [compassResult, setCompassResult] = useState<CareerCompass | null>(null);
  const [matchedJobsResult, setMatchedJobsResult] =
    useState<CvJobSearchResult | null>(null);
  const [analyzingJobUrl, setAnalyzingJobUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const localText = localStorage.getItem("master_cv_text");
      const localName = localStorage.getItem("master_cv_filename");
      if (localText && localText.length >= 40) {
        setSavedCvText(localText);
        setSavedCvFileName(localName || "Ozgecmis.pdf");
        return;
      }
    } catch {}

    // localStorage boşsa sunucuda daha önce yüklenmiş aktif CV var mı kontrol et
    fetch("/api/cv/aktif")
      .then((r) => r.json())
      .then((data) => {
        if (data.cv?.cvMetni) {
          setSavedCvText(data.cv.cvMetni);
          setSavedCvFileName(data.cv.dosyaAdi);
          try {
            localStorage.setItem("master_cv_text", data.cv.cvMetni);
            localStorage.setItem("master_cv_filename", data.cv.dosyaAdi);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alreadyAnalyzedData, setAlreadyAnalyzedData] = useState<{
    existingId: string;
    jobTitle: string;
    sirketAdi: string;
    createdAt: string;
    kaynakSite?: string;
  } | null>(null);

  // Hızlı test için örnek ilan metni doldurma
  const fillSampleData = (role: "frontend" | "backend") => {
    setActiveTab("text");
    if (role === "frontend") {
      setManualTitle("Senior Frontend Engineer");
      setManualCompany("TechCorp A.Ş.");
      setManualText(`Şirketimiz bünyesinde modern web teknolojileri geliştirecek Senior Frontend Engineer arıyoruz.
Aranan Nitelikler:
- En az 4 yıl React, TypeScript ve Next.js deneyimi
- Tailwind CSS ve modern UI bileşen kütüphaneleri (shadcn/ui, Radix) ile ileri düzey deneyim
- RESTful API ve GraphQL entegrasyonlarında tecrübe
- State management (Zustand, Redux Toolkit veya React Query) konularında yetkin
- Web performans optimizasyonu ve SEO prensiplerine hakim
- İyi derecede İngilizce
Sorumluluklar:
- Yüksek trafikli kullanıcı arayüzlerinin geliştirilmesi ve mimarisinin kurulması
- Kod kalitesi, test yazımı ve code review süreçlerinin yürütülmesi
- Ürün ve tasarım ekipleriyle yakın iş birliği içinde çalışılması.`);
    } else {
      setManualTitle("Backend Developer (Node.js & Go)");
      setManualCompany("Fintech Labs");
      setManualText(`Fintech ekibimiz için ölçeklenebilir mikroservis mimarileri geliştirecek Backend Developer arıyoruz.
Gereksinimler:
- En az 3 yıl Node.js / TypeScript veya Go ile backend geliştirme deneyimi
- PostgreSQL, Redis ve mesaj kuyrukları (RabbitMQ / Kafka) ile çalışma tecrübesi
- Docker, Kubernetes ve CI/CD süreçlerine aşinalık
- Yüksek erişilebilirlik ve finansal işlem güvenliği standartlarına hakim
- Çözüm odaklı ve güçlü iletişim becerilerine sahip ekip arkadaşı.`);
    }
  };

  const handleUrlSubmit = async (e?: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAlreadyAnalyzedData(null);
    setProgressStep(
      force
        ? "İlan yeniden çekiliyor ve analiz ediliyor..."
        : "İlan sayfası taranıyor ve çekiliyor..."
    );

    try {
      const response = await fetch("/api/ilan/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), force }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needManualText) {
          setActiveTab("text");
          setErrorMessage(
            data.error ||
              "İlan sitesi bot koruması uyguluyor. Lütfen ilan metnini aşağıya yapıştırınız."
          );
        } else {
          setErrorMessage(data.error || "İlan analiz edilirken bir hata oluştu.");
        }
        setIsLoading(false);
        setProgressStep(null);
        return;
      }

      if (data.alreadyAnalyzed) {
        setAlreadyAnalyzedData({
          existingId: data.existingId,
          jobTitle: data.jobTitle,
          sirketAdi: data.sirketAdi,
          createdAt: data.createdAt,
          kaynakSite: data.kaynakSite,
        });
        setIsLoading(false);
        setProgressStep(null);
        return;
      }

      setProgressStep("Analiz tamamlandı, sonuçlar açılıyor...");
      router.push(`/analiz/${data.id}`);
    } catch (err: any) {
      setErrorMessage("Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.");
      setIsLoading(false);
      setProgressStep(null);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim() || manualText.trim().length < 50) {
      setErrorMessage("Lütfen en az 50 karakterlik bir ilan metni yapıştırınız.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setProgressStep("İlan yapay zekâ tarafından derinlemesine analiz ediliyor...");

    try {
      const response = await fetch("/api/ilan/metin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metin: manualText.trim(),
          baslik: manualTitle.trim() || undefined,
          sirketAdi: manualCompany.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "İlan analiz edilirken bir hata oluştu.");
        setIsLoading(false);
        setProgressStep(null);
        return;
      }

      setProgressStep("Yönlendiriliyorsunuz...");
      router.push(`/analiz/${data.id}`);
    } catch (err) {
      setErrorMessage("Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.");
      setIsLoading(false);
      setProgressStep(null);
    }
  };

  // Ana Sayfada Bağımsız CV Yükleme
  const handleMasterCvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compassFile) {
      setCvCenterError("Lütfen yüklemek için CV dosyanızı (.pdf veya .docx) seçiniz.");
      return;
    }
    if (!compassKvkk) {
      setCvCenterError("Lütfen KVKK onay kutusunu işaretleyiniz.");
      return;
    }

    setIsUploadingMasterCv(true);
    setCvCenterError(null);

    try {
      const formData = new FormData();
      formData.append("file", compassFile);
      formData.append("kvkkOnay", "true");

      const uploadRes = await fetch("/api/cv/yukle", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "CV okunamadı.");
      }

      setSavedCvText(uploadData.text);
      setSavedCvFileName(uploadData.fileName);
      setShowCvUploadForm(false);
      setCompassFile(null);

      try {
        localStorage.setItem("master_cv_text", uploadData.text);
        localStorage.setItem("master_cv_filename", uploadData.fileName);
        localStorage.setItem("master_cv_updated_at", new Date().toISOString());
      } catch {}
    } catch (err: any) {
      setCvCenterError(err.message || "CV yüklenirken hata oluştu.");
    } finally {
      setIsUploadingMasterCv(false);
    }
  };

  // Ana Sayfada Kayıtlı CV'yi Silme
  const handleClearMasterCv = async () => {
    if (!confirm("Kayıtlı CV'nizi sistemden kaldırmak istediğinize emin misiniz?")) {
      return;
    }
    setSavedCvText(null);
    setSavedCvFileName(null);
    setMatchedJobsResult(null);
    setCompassResult(null);
    try {
      localStorage.removeItem("master_cv_text");
      localStorage.removeItem("master_cv_filename");
      localStorage.removeItem("master_cv_updated_at");
    } catch {}
    await fetch("/api/cv/aktif", { method: "DELETE" }).catch(() => {});
  };

  // Ana Sayfada CV ile Eşleşen Canlı İlanları Çek (LinkedIn, Kariyer.net, Indeed, Secretcv...)
  const handleFetchMatchingJobsOnHome = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!savedCvText) {
      setCvCenterError("Eşleşen ilanları çekmek için önce CV'nizi yüklemelisiniz.");
      return;
    }
    setIsSearchingMatchingJobs(true);
    setCvCenterError(null);
    try {
      const res = await fetch("/api/cv/ilan-ara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvMetni: savedCvText,
          lokasyon: compassLocation.trim() || "Türkiye",
          ozelAramaTerimi: compassCustomQuery.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Eşleşen ilanlar çekilemedi.");
      }
      setMatchedJobsResult(data);
    } catch (err: any) {
      setCvCenterError(err.message || "Eşleşen ilanlar çekilirken hata oluştu.");
    } finally {
      setIsSearchingMatchingJobs(false);
    }
  };

  // Ana Sayfada CV ile En Uygun 5 Pozisyonu Keşfet
  const handleFetchCompassOnHome = async () => {
    if (!savedCvText) {
      setCvCenterError("Pozisyon önerisi için önce CV'nizi yüklemelisiniz.");
      return;
    }
    setIsLoadingCompass(true);
    setCvCenterError(null);
    try {
      const res = await fetch("/api/cv/kariyer-pusulasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvMetni: savedCvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Pozisyon önerileri oluşturulamadı.");
      }
      setCompassResult(data.compass);
    } catch (err: any) {
      setCvCenterError(err.message || "Bir hata oluştu.");
    } finally {
      setIsLoadingCompass(false);
    }
  };

  const handleAnalyzeMatchedJobOnHome = async (
    jobUrl: string,
    baslik: string,
    sirket: string,
    nedenEslesiyor: string
  ) => {
    setAnalyzingJobUrl(jobUrl);
    try {
      const res = await fetch("/api/ilan/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/analiz/${data.id}`);
        return;
      }

      const fallbackRes = await fetch("/api/ilan/metin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baslik,
          sirketAdi: sirket,
          metin: `Pozisyon: ${baslik}\nŞirket: ${sirket}\nKaynak İlan Linki: ${jobUrl}\n\nCV Eşleşme Özeti: ${nedenEslesiyor}\nBu pozisyon için kapsamlı mülakat hazırlığı.`,
        }),
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackRes.ok && fallbackData.id) {
        router.push(`/analiz/${fallbackData.id}`);
      }
    } catch {
      window.open(jobUrl, "_blank");
    } finally {
      setAnalyzingJobUrl(null);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 py-12 lg:py-20 bg-grid-pattern overflow-hidden">
      {/* Arka plan ışık küreleri (Glow Orbs) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] glow-orb-primary pointer-events-none rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[300px] glow-orb-secondary pointer-events-none rounded-full blur-3xl opacity-60" />

      <div className="relative z-10 w-full max-w-4xl mx-auto space-y-10">
        {/* Hero Bölümü */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold shadow-lg shadow-blue-500/5 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            <span>Yeni Nesil AI Mülakat & Kariyer Koçu</span>
            <span className="h-1 w-1 rounded-full bg-blue-400" />
            <span className="text-slate-400 font-normal">Next.js + Supabase</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
            İş İlanını Verin,{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Mülakata Eksiksiz
            </span>{" "}
            Hazırlanın
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Kariyer.net, LinkedIn veya Indeed linkini yapıştırın. Yapay zekâ nitelikleri çıkarsın, şirketi araştırsın, STAR soruları üretsin ve CV'nizi ATS uyumuna göre puanlasın.
          </p>
        </div>

        {/* Ana Arama & Analiz Kartı */}
        <div className="relative rounded-3xl p-1 bg-gradient-to-b from-white/15 via-white/5 to-white/0 shadow-2xl shadow-black/80">
          <Card className="p-6 sm:p-8 bg-slate-900/90 border-0 rounded-[22px] backdrop-blur-2xl">
            {/* Sekme Değiştirici (Yalnızca İş İlanı Analizi İçin) */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-white/10 mb-6 max-w-md mx-auto shadow-inner">
              <button
                onClick={() => {
                  setActiveTab("url");
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "url"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Link2 className="h-4 w-4" />
                İlan Linki ile
              </button>
              <button
                onClick={() => {
                  setActiveTab("text");
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "text"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="h-4 w-4" />
                Metin Yapıştırarak
              </button>
            </div>

            {/* Hata Bildirimi */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-300">İşlem Tamamlanamadı</p>
                  <p className="mt-0.5 text-slate-300 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* İlerleme Durumu */}
            {isLoading && (
              <div className="mb-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-200 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
                <div className="h-5 w-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                <span className="font-medium text-slate-200">{progressStep}</span>
              </div>
            )}

            {/* Zaten Analiz Edildi Uyarısı */}
            {alreadyAnalyzedData && (
              <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm space-y-4 animate-in fade-in zoom-in-95 duration-200 shadow-xl shadow-amber-500/5">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/30">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-amber-300 text-sm sm:text-base">
                        Bu İlan Daha Önce Analiz Edilmiş!
                      </h4>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                        Geçmişte Kayıtlı
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">
                      <strong className="text-white">&ldquo;{alreadyAnalyzedData.jobTitle}&rdquo;</strong> ({alreadyAnalyzedData.sirketAdi}) ilanı sistemde ve geçmiş kayıtlarınızda zaten mevcut.
                    </p>
                    <p className="text-[11px] text-amber-300/80">
                      İlk analiz tarihi: {new Date(alreadyAnalyzedData.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-amber-500/20">
                  <Button
                    type="button"
                    size="sm"
                    variant="gradient"
                    onClick={() => router.push(`/analiz/${alreadyAnalyzedData.existingId}`)}
                    className="font-semibold shadow-md cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Mevcut Analizi Aç
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/gecmis")}
                    className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10 hover:text-white cursor-pointer"
                  >
                    <History className="h-4 w-4 mr-1.5" />
                    Geçmiş Analizlere Bak
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => handleUrlSubmit(undefined, true)}
                    className="text-xs text-slate-400 hover:text-white ml-auto cursor-pointer"
                  >
                    Yine de Yeniden Analiz Et
                  </Button>
                </div>
              </div>
            )}

            {/* URL Formu */}
            {activeTab === "url" && (
              <form onSubmit={handleUrlSubmit} className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Link2 className="h-5 w-5" />
                    </div>
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (alreadyAnalyzedData) setAlreadyAnalyzedData(null);
                      }}
                      placeholder="https://www.kariyer.net/is-ilani/... veya linkedin.com/jobs/..."
                      className="pl-12 h-14 text-sm sm:text-base rounded-2xl bg-slate-950/80 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    variant="gradient"
                    isLoading={isLoading}
                    disabled={isLoading || !url.trim()}
                    className="h-14 px-8 shrink-0 text-sm sm:text-base font-bold rounded-2xl shadow-xl shadow-blue-500/25"
                  >
                    <span>Analiz Et</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* Desteklenen Siteler ve Örnek Doldurma Butonları */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.06] text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-500">Örnek İlan Dene:</span>
                    <button
                      type="button"
                      onClick={() => fillSampleData("frontend")}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-medium transition-colors cursor-pointer border border-white/5"
                    >
                      Frontend Engineer
                    </button>
                    <button
                      type="button"
                      onClick={() => fillSampleData("backend")}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-medium transition-colors cursor-pointer border border-white/5"
                    >
                      Backend Developer
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500">
                    <span>Kariyer.net</span>
                    <span>•</span>
                    <span>LinkedIn</span>
                    <span>•</span>
                    <span>Indeed</span>
                  </div>
                </div>
              </form>
            )}

            {/* Metin Yapıştırma Formu */}
            {activeTab === "text" && (
              <form onSubmit={handleTextSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Pozisyon Başlığı (Örn: Kıdemli Yazılım Uzmanı)"
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-slate-950/80 border-white/10"
                  />
                  <Input
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder="Şirket Adı (Örn: Trendyol)"
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-slate-950/80 border-white/10"
                  />
                </div>

                <Textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="İş ilanındaki sorumluluklar, aranan nitelikler ve şirket tanımını buraya yapıştırınız..."
                  rows={8}
                  required
                  disabled={isLoading}
                  className="rounded-2xl bg-slate-950/80 border-white/10 leading-relaxed font-mono text-xs sm:text-sm"
                />

                <Button
                  type="submit"
                  size="lg"
                  variant="gradient"
                  className="w-full h-14 text-sm sm:text-base font-bold rounded-2xl shadow-xl shadow-blue-500/25"
                  isLoading={isLoading}
                  disabled={isLoading || manualText.trim().length < 50}
                >
                  <span>İlan Metnini Analiz Et</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* İş İlanından Bağımsız Ana Sayfa CV Merkezi & Eşleşen İlanları Çekme Alanı */}
        <div
          id="cv-merkezi"
          className="relative rounded-3xl p-1 bg-gradient-to-b from-emerald-500/25 via-emerald-500/5 to-transparent shadow-2xl shadow-black/70"
        >
          <Card className="p-6 sm:p-8 bg-slate-900/90 border-0 rounded-[22px] backdrop-blur-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white flex flex-wrap items-center gap-2">
                    CV Merkezim & Eşleşen İlanları Çek
                    {savedCvText ? (
                      <Badge variant="success" className="text-[11px]">
                        ✓ Aktif CV: {savedCvFileName}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[11px]">
                        Henüz CV Yüklenmedi
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    CV'nizi herhangi bir iş ilanından bağımsız olarak buradan yükleyin. Yüklediğiniz CV tüm ilan analizlerinde otomatik kullanılır ve LinkedIn, Kariyer.net, Indeed, Secretcv üzerindeki eşleşen ilanları tek tıkla çeker.
                  </p>
                </div>
              </div>

              {savedCvText && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowCvUploadForm((prev) => !prev)}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    CV'yi Değiştir
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearMasterCv}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    CV'yi Kaldır
                  </Button>
                </div>
              )}
            </div>

            {cvCenterError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{cvCenterError}</span>
              </div>
            )}

            {/* CV Yükleme Formu (Henüz CV yüklenmediyse veya Değiştir butonuna basıldıysa) */}
            {(!savedCvText || showCvUploadForm) && (
              <form
                onSubmit={handleMasterCvUpload}
                className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-emerald-500/25"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Upload className="h-8 w-8 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white">
                        Özgeçmişinizi (PDF veya DOCX) Seçin
                      </p>
                      <p className="text-xs text-slate-400">
                        Maksimum 4 MB • Dosyanız diske kaydedilmez, metni çıkarılarak analizlerinizle eşleştirilir.
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) =>
                      setCompassFile(e.target.files?.[0] || null)
                    }
                    className="text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compassKvkk}
                      onChange={(e) => setCompassKvkk(e.target.checked)}
                      className="rounded border-white/20 bg-slate-800 text-emerald-600 h-4 w-4"
                    />
                    <span>
                      KVKK Aydınlatma Metnini okudum; CV metnimin analiz için işlenmesini onaylıyorum.
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    {showCvUploadForm && savedCvText && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCvUploadForm(false)}
                        className="text-xs"
                      >
                        İptal
                      </Button>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      variant="gradient"
                      isLoading={isUploadingMasterCv}
                      disabled={isUploadingMasterCv || !compassFile}
                      className="px-5 h-10 text-xs font-bold"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      CV'mi Kaydet ve Etkinleştir
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* CV Yüklüyse: Eşleşen İlanları Çek & Uygun Pozisyonları Keşfet Kontrolleri */}
            {savedCvText && (
              <div className="space-y-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      Yüklediğiniz CV ile Eşleşen Canlı İlanları Çekin
                    </span>
                    <p className="text-xs text-slate-400">
                      LinkedIn, Kariyer.net, Indeed, Secretcv ve Yenibiris üzerinden CV'nizle en yüksek uyum gösteren güncel ilanları listeleyin.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Input
                      value={compassCustomQuery}
                      onChange={(e) => setCompassCustomQuery(e.target.value)}
                      placeholder="Özel unvan/kelime (opsiyonel)"
                      className="w-44 bg-slate-900 border-white/15 text-xs h-10"
                    />
                    <Input
                      value={compassLocation}
                      onChange={(e) => setCompassLocation(e.target.value)}
                      placeholder="Şehir/Ülke (örn: İstanbul)"
                      className="w-40 bg-slate-900 border-white/15 text-xs h-10"
                    />
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      onClick={() => handleFetchMatchingJobsOnHome()}
                      isLoading={isSearchingMatchingJobs}
                      disabled={isSearchingMatchingJobs}
                      className="h-10 px-4 text-xs font-bold"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Eşleşen İlanları Çek
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleFetchCompassOnHome}
                      isLoading={isLoadingCompass}
                      disabled={isLoadingCompass}
                      className="h-10 px-4 text-xs font-bold border border-emerald-500/30 text-emerald-300"
                    >
                      <Compass className="h-3.5 w-3.5 mr-1.5" />
                      En Uygun 5 Pozisyonu Öner
                    </Button>
                  </div>
                </div>

                {/* Çekilen Canlı İş İlanları (LinkedIn, Kariyer.net, Indeed, Secretcv, Yenibiris) */}
                {matchedJobsResult && (
                  <div className="pt-2 space-y-4 animate-in fade-in">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">
                        İlan Sitelerinde Filtreli Aç:
                      </span>
                      {matchedJobsResult.platformAramaLinkleri.map(
                        (pl, idx) => (
                          <a
                            key={idx}
                            href={pl.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 hover:border-blue-500/40 text-xs font-semibold text-blue-300 transition-all"
                          >
                            <span>{pl.platform}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )
                      )}
                    </div>

                    {matchedJobsResult.ilanlar.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {matchedJobsResult.ilanlar.map((ilan, idx) => (
                          <div
                            key={ilan.id || idx}
                            className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-3 text-xs"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="inline-block px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold text-[10px] mb-1">
                                    {ilan.kaynakSite}
                                  </span>
                                  <h5 className="text-sm font-bold text-white leading-snug">
                                    {ilan.baslik}
                                  </h5>
                                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                    <span className="font-semibold text-slate-300">
                                      {ilan.sirket}
                                    </span>
                                    <span>•</span>
                                    <MapPin className="h-3 w-3 inline" />
                                    <span>{ilan.lokasyon}</span>
                                  </p>
                                </div>
                                <Badge
                                  variant="success"
                                  className="text-xs shrink-0"
                                >
                                  %{ilan.uyumYuzdesi} Uyum
                                </Badge>
                              </div>

                              <p className="text-slate-300 leading-relaxed">
                                {ilan.nedenEslesiyor}
                              </p>

                              {ilan.eslesenBeceriler.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {ilan.eslesenBeceriler.map((b, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]"
                                    >
                                      ✓ {b}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                              <a
                                href={ilan.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                              >
                                <span>İlanı Aç</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>

                              <Button
                                size="sm"
                                variant="gradient"
                                isLoading={analyzingJobUrl === ilan.url}
                                disabled={!!analyzingJobUrl}
                                onClick={() =>
                                  handleAnalyzeMatchedJobOnHome(
                                    ilan.url,
                                    ilan.baslik,
                                    ilan.sirket,
                                    ilan.nedenEslesiyor
                                  )
                                }
                                className="h-8 px-3 text-xs"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                Bu İlanı Analiz Et
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Doğrudan listelenen ilan bulunamadı; yukarıdaki platform butonlarına tıklayarak CV anahtar kelimelerinizle filtrelenmiş ilanları açabilirsiniz.
                      </p>
                    )}
                  </div>
                )}

                {/* Kariyer Pusulası (En Uygun 5 Pozisyon) Sonuçları */}
                {compassResult && (
                  <div className="pt-4 border-t border-white/10 space-y-5 animate-in fade-in">
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">
                        🧭 Kariyer Pusulası — Profil Özeti
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {compassResult.profilOzeti}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-white">
                        Sizin İçin En Uygun 5 Pozisyon:
                      </h4>
                      <div className="grid grid-cols-1 gap-3.5">
                        {compassResult.onerilenPozisyonlar.map((pos, idx) => (
                          <div
                            key={idx}
                            className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center">
                                  #{idx + 1}
                                </span>
                                <h5 className="text-sm sm:text-base font-bold text-white">
                                  {pos.baslik}
                                </h5>
                                <Badge variant="outline" className="text-[10px]">
                                  {pos.seviye}
                                </Badge>
                              </div>
                              <Badge variant="success" className="text-xs">
                                %{pos.uyumYuzdesi} Uyum
                              </Badge>
                            </div>

                            <p className="text-slate-300 leading-relaxed">
                              {pos.nedenUygun}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <strong className="text-emerald-300 block mb-1">
                                  ✓ Güçlü Olduğunuz Beceriler:
                                </strong>
                                <div className="flex flex-wrap gap-1">
                                  {pos.gucluBeceriler.map((g, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[11px]"
                                    >
                                      {g}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <strong className="text-amber-300 block mb-1">
                                  📈 Öne Çıkmak İçin Geliştirilecekler:
                                </strong>
                                <div className="flex flex-wrap gap-1">
                                  {pos.gelistirilecekBeceriler.map((g, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[11px]"
                                    >
                                      {g}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-slate-200 leading-relaxed">
                      <strong className="text-blue-300 block mb-1">
                        🗺️ Kariyer Geçiş & Gelişim Yol Haritası Notu:
                      </strong>
                      {compassResult.kariyerHaritasiNotu}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* 4 Ana Yetenek / Özellik Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md hover:border-blue-500/30 hover:bg-slate-900/60 transition-all duration-300 group">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <Target className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm text-white">
              Nitelik & ATS Taraması
            </h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-normal">
              Zorunlu ve tercih sebebi şartlar 1-5 puanlanır, CV filtreleri için kritik anahtar kelimeler listelenir.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-300 group">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm text-white">
              Şirket İstihbaratı
            </h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-normal">
              Şirket kültürü, son haberleri, çalışan yorumları analizi ve doğrulanmış web kaynak bağlantıları sunulur.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md hover:border-purple-500/30 hover:bg-slate-900/60 transition-all duration-300 group">
            <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <MessageSquareCheck className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm text-white">
              STAR Mülakat Soruları
            </h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-normal">
              Teknik, kriz senaryoları ve STAR örnek cevaplarıyla hazırlanıp yapay zekâ koçuyla pratik yapın.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md hover:border-emerald-500/30 hover:bg-slate-900/60 transition-all duration-300 group">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm text-white">
              Vurgulu CV Analizi
            </h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-normal">
              CV metninizdeki cümleler renklerle vurgulanır; tek tıkla kopyalanabilir güçlü revizyonlar önerilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
