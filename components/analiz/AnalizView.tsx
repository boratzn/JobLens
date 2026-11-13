"use client";

import React, { useState, useEffect } from "react";
import {
  JobAnalysis,
  CompanyInfo,
  InterviewSet,
  CvMatch,
  CoverLetter,
  StarStory,
  ApplicationStatus,
} from "@/lib/schemas";
import { IlanOzetiTab } from "@/components/ilan/IlanOzetiTab";
import { SirketTab } from "@/components/sirket/SirketTab";
import { MulakatTab } from "@/components/mulakat/MulakatTab";
import { CvTab } from "@/components/cv/CvTab";
import { OnYaziTab } from "@/components/onyazi/OnYaziTab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Building2,
  HelpCircle,
  FileCheck,
  FileSignature,
  Download,
  ArrowLeft,
  Calendar,
  StickyNote,
  Check,
  Save,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface AnalizViewProps {
  initialAnalysis: {
    id: string;
    url: string | null;
    kaynakSite: string;
    createdAt: string;
    jobAnalysis: JobAnalysis;
    companyInfo: CompanyInfo | null;
    interviewSet: InterviewSet | null;
    latestCv: {
      id: string;
      dosyaAdi: string;
      cvMetni: string;
      cvMatch: CvMatch | null;
    } | null;
    previousCv?: {
      id: string;
      dosyaAdi: string;
      createdAt?: string;
      cvMatch: CvMatch | null;
    } | null;
  };
}

const STATUS_OPTIONS: {
  id: ApplicationStatus;
  label: string;
  color: string;
}[] = [
  {
    id: "inceleniyor",
    label: "🔍 İnceleniyor",
    color: "bg-slate-800 text-slate-300 border-slate-700",
  },
  {
    id: "basvuruldu",
    label: "📨 Başvuruldu",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  {
    id: "mulakat",
    label: "🗓️ Mülakat",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  {
    id: "teklif",
    label: "🎉 Teklif Alındı",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "red",
    label: "❌ Red / Kapandı",
    color: "bg-red-500/20 text-red-300 border-red-500/40",
  },
];

export function AnalizView({ initialAnalysis }: AnalizViewProps) {
  const [activeTab, setActiveTab] = useState<
    "ilan" | "sirket" | "mulakat" | "cv" | "onyazi"
  >("ilan");

  // Şirket state'leri
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(
    initialAnalysis.companyInfo
  );
  const [isFetchingCompany, setIsFetchingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Mülakat & Ön Yazı state'leri
  const [interviewSet, setInterviewSet] = useState<InterviewSet | null>(
    initialAnalysis.interviewSet
  );
  const [isGeneratingInterview, setIsGeneratingInterview] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  // CV & Önce/Sonra Skor state'leri
  const [cvMatch, setCvMatch] = useState<CvMatch | null>(
    initialAnalysis.latestCv?.cvMatch || null
  );
  const [cvMetni, setCvMetni] = useState<string | null>(
    initialAnalysis.latestCv?.cvMetni || null
  );
  const [dosyaAdi, setDosyaAdi] = useState<string | null>(
    initialAnalysis.latestCv?.dosyaAdi || null
  );
  const [cvUploadId, setCvUploadId] = useState<string | null>(
    initialAnalysis.latestCv?.id || null
  );
  const [previousCv, setPreviousCv] = useState<{
    id: string;
    dosyaAdi: string;
    createdAt?: string;
    cvMatch: CvMatch | null;
  } | null>(initialAnalysis.previousCv || null);

  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [isDeletingCv, setIsDeletingCv] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  // Ana sayfadan bağımsız yüklenen Master CV state'i
  const [masterCv, setMasterCv] = useState<{
    text: string;
    fileName: string;
  } | null>(null);
  const [isCheckingMasterCv, setIsCheckingMasterCv] = useState(true);

  // Başvuru Takip (Application Tracker) state'leri
  const initialTracker = initialAnalysis.jobAnalysis.basvuruTakip || {
    durum: "inceleniyor" as ApplicationStatus,
    mulakatTarihi: null,
    notlar: "",
  };
  const [basvuruDurumu, setBasvuruDurumu] = useState<ApplicationStatus>(
    initialTracker.durum
  );
  const [mulakatTarihi, setMulakatTarihi] = useState<string>(
    initialTracker.mulakatTarihi || ""
  );
  const [notlar, setNotlar] = useState<string>(initialTracker.notlar || "");
  const [showTrackerNotes, setShowTrackerNotes] = useState(false);
  const [isSavingTracker, setIsSavingTracker] = useState(false);
  const [trackerSaved, setTrackerSaved] = useState(false);

  const job = initialAnalysis.jobAnalysis;

  // Başvuru Durumu / Not Kaydetme
  const handleSaveTracker = async (
    nextDurum?: ApplicationStatus,
    nextTarih?: string,
    nextNotlar?: string
  ) => {
    setIsSavingTracker(true);
    setTrackerSaved(false);
    try {
      const payload = {
        id: initialAnalysis.id,
        durum: nextDurum ?? basvuruDurumu,
        mulakatTarihi: (nextTarih ?? mulakatTarihi) || null,
        notlar: nextNotlar ?? notlar,
      };
      const res = await fetch("/api/gecmis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setTrackerSaved(true);
        setTimeout(() => setTrackerSaved(false), 2000);
      }
    } catch (err) {
      console.error("Başvuru durumu kaydetme hatası:", err);
    } finally {
      setIsSavingTracker(false);
    }
  };

  // Şirket araştırmasını tetikle
  const fetchCompanyInfo = async () => {
    setIsFetchingCompany(true);
    setCompanyError(null);
    try {
      const res = await fetch("/api/sirket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: initialAnalysis.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Şirket araştırması başarısız oldu.");
      }
      setCompanyInfo(data.companyInfo);
    } catch (err: any) {
      setCompanyError(err.message);
    } finally {
      setIsFetchingCompany(false);
    }
  };

  // Mülakat sorularını üret
  const generateInterviewSet = async () => {
    setIsGeneratingInterview(true);
    try {
      const res = await fetch("/api/mulakat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: initialAnalysis.id,
          cvMetni: cvMetni || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Mülakat soruları üretilemedi.");
      }
      setInterviewSet(data.interviewSet);
    } catch (err: any) {
      console.error("Mülakat seti hatası:", err);
    } finally {
      setIsGeneratingInterview(false);
    }
  };

  // Kategori bazlı daha fazla soru üret
  const handleGenerateMore = async (kategori: string) => {
    setIsGeneratingMore(true);
    try {
      const res = await fetch("/api/mulakat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: initialAnalysis.id,
          kategori,
          dahaFazla: true,
          cvMetni: cvMetni || undefined,
        }),
      });
      const data = await res.json();
      if (data.interviewSet) {
        setInterviewSet(data.interviewSet);
      }
    } catch (err) {
      console.error("Daha fazla soru üretme hatası:", err);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  // Ana Sayfada Yüklenmiş Master CV'yi Bu İlanla Karşılaştırma
  const handleCompareWithMasterCv = async (
    textToCompare?: string,
    fileNameToCompare?: string
  ) => {
    const targetText = textToCompare || masterCv?.text;
    const targetName = fileNameToCompare || masterCv?.fileName || "Ana_Sayfa_CV.pdf";
    if (!targetText) return;

    setIsUploadingCv(true);
    setCvError(null);
    try {
      const compareRes = await fetch("/api/cv/karsilastir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: initialAnalysis.id,
          cvMetni: targetText,
          dosyaAdi: targetName,
        }),
      });

      const compareData = await compareRes.json();
      if (!compareRes.ok) {
        throw new Error(compareData.error || "CV karşılaştırılamadı.");
      }

      if (compareData.previousCv) {
        setPreviousCv(compareData.previousCv);
      } else if (cvMatch && cvUploadId && dosyaAdi) {
        setPreviousCv({
          id: cvUploadId,
          dosyaAdi,
          cvMatch,
        });
      }

      setCvMatch(compareData.cvMatch);
      setCvMetni(compareData.cvMetni);
      setDosyaAdi(compareData.dosyaAdi);
      setCvUploadId(compareData.cvUploadId);
    } catch (err: any) {
      setCvError(err.message);
    } finally {
      setIsUploadingCv(false);
    }
  };

  // CV Silme (Bu ilana ait CV analizini sıfırla)
  const handleDeleteCv = async (id: string) => {
    if (!confirm("Bu ilana ait CV analiz verilerinizin silinmesini onaylıyor musunuz?")) {
      return;
    }
    setIsDeletingCv(true);
    try {
      const res = await fetch(`/api/cv/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCvMatch(null);
        setCvMetni(null);
        setDosyaAdi(null);
        setCvUploadId(null);
        setPreviousCv(null);
      }
    } catch (err) {
      console.error("CV silme hatası:", err);
    } finally {
      setIsDeletingCv(false);
    }
  };

  // Sayfa açıldığında Ana Sayfadaki Master CV'yi yükle, ayrıca mülakat ve şirket araştırmasını başlat
  useEffect(() => {
    const loadMasterCv = async () => {
      try {
        const savedText = localStorage.getItem("master_cv_text");
        const savedName = localStorage.getItem("master_cv_filename");
        if (savedText && savedName) {
          setMasterCv({ text: savedText, fileName: savedName });
          setIsCheckingMasterCv(false);
          return;
        }
        const res = await fetch("/api/cv/aktif");
        if (res.ok) {
          const data = await res.json();
          if (data.cv?.cvMetni && data.cv?.dosyaAdi) {
            setMasterCv({
              text: data.cv.cvMetni,
              fileName: data.cv.dosyaAdi,
            });
            localStorage.setItem("master_cv_text", data.cv.cvMetni);
            localStorage.setItem("master_cv_filename", data.cv.dosyaAdi);
          }
        }
      } catch {
        // sessiz geç
      } finally {
        setIsCheckingMasterCv(false);
      }
    };

    loadMasterCv();

    if (!companyInfo && !isFetchingCompany) {
      fetchCompanyInfo();
    }
    if (!interviewSet && !isGeneratingInterview) {
      generateInterviewSet();
    }
  }, []);

  // Sekme değiştiğinde henüz başlamadıysa tetikle
  useEffect(() => {
    if (activeTab === "sirket" && !companyInfo && !isFetchingCompany) {
      fetchCompanyInfo();
    }
    if (activeTab === "mulakat" && !interviewSet && !isGeneratingInterview) {
      generateInterviewSet();
    }
    if (
      activeTab === "cv" &&
      !cvMatch &&
      masterCv &&
      !isUploadingCv &&
      !cvError
    ) {
      handleCompareWithMasterCv(masterCv.text, masterCv.fileName);
    }
  }, [activeTab, masterCv]);

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* Üst Başlık & Aksiyon Çubuğu */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/gecmis"
              className="inline-flex items-center text-xs text-slate-400 hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Başvuru Takip Paneli
            </Link>
            <span className="text-slate-700">•</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {initialAnalysis.kaynakSite}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {job.baslik}
          </h1>
          <p className="text-sm font-semibold text-blue-400">
            {job.sirketAdi} {job.lokasyon ? `— ${job.lokasyon}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/rapor/pdf?analysisId=${initialAnalysis.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 shadow-sm transition-all"
          >
            <Download className="h-4 w-4 mr-2 text-blue-400" />
            PDF Rapor İndir / Yazdır
          </a>
        </div>
      </div>

      {/* Başvuru Takip Çubuğu (Application Tracker Bar) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/70 border border-white/[0.08] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1.5">
              Başvuru Durumu:
            </span>
            {STATUS_OPTIONS.map((st) => {
              const active = basvuruDurumu === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setBasvuruDurumu(st.id);
                    handleSaveTracker(st.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? `${st.color} ring-2 ring-white/15 shadow-sm`
                      : "bg-slate-950/50 border-white/[0.06] text-slate-400 hover:text-white"
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-950/70 border border-white/10 rounded-xl px-2.5 py-1">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] text-slate-400">Mülakat Tarihi:</span>
              <input
                type="date"
                value={mulakatTarihi ? mulakatTarihi.substring(0, 10) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setMulakatTarihi(val);
                  handleSaveTracker( undefined, val );
                }}
                className="bg-transparent text-xs text-white focus:outline-none"
              />
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowTrackerNotes((prev) => !prev)}
              className="text-xs h-8"
            >
              <StickyNote className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
              {notlar ? "Notları Düzenle" : "Not Ekle"}
            </Button>

            {trackerSaved && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Kaydedildi
              </span>
            )}
          </div>
        </div>

        {showTrackerNotes && (
          <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end animate-in fade-in">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Bu Başvuru İçin Özel Notlarınız (İK iletişim kişisi, maaş beklentisi, izlenimler):
              </label>
              <Textarea
                rows={2}
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
                placeholder="Örn: İK'dan Ayşe Hanım ile görüşüldü, teknik mülakat haftaya Perşembe yapılacak..."
                className="bg-slate-950/80 border-white/10 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleSaveTracker(undefined, undefined, notlar)}
              isLoading={isSavingTracker}
              className="text-xs shrink-0"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Notu Kaydet
            </Button>
          </div>
        )}
      </div>

      {/* 5 Ana Sekme Butonları */}
      <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-white/[0.08] backdrop-blur-md">
        <button
          onClick={() => setActiveTab("ilan")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "ilan"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          İlan Özeti & Nitelikler
        </button>

        <button
          onClick={() => setActiveTab("sirket")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "sirket"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Şirket İstihbaratı
          {companyInfo && (
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("mulakat")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "mulakat"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Mülakat & STAR Hikâyeleri
          {interviewSet ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Hazır
            </span>
          ) : isGeneratingInterview ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-medium border border-indigo-500/30 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
              Hazırlanıyor
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("cv")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "cv"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileCheck className="h-4 w-4" />
          CV Uyumluluk Analizi
          {cvMatch && (
            <Badge variant="success" className="text-[10px] py-0 px-1.5 ml-1">
              {previousCv?.cvMatch
                ? `%${previousCv.cvMatch.uyumSkoru} → %${cvMatch.uyumSkoru}`
                : `%${cvMatch.uyumSkoru}`}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("onyazi")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "onyazi"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileSignature className="h-4 w-4" />
          Ön Yazı (Cover Letter)
          {interviewSet?.onYazi && (
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      {/* Aktif Sekme İçeriği */}
      <div className="pt-2">
        {activeTab === "ilan" && <IlanOzetiTab job={job} />}

        {activeTab === "sirket" && (
          <SirketTab
            company={companyInfo}
            isLoading={isFetchingCompany}
            onFetchCompany={fetchCompanyInfo}
            error={companyError}
          />
        )}

        {activeTab === "mulakat" && (
          <MulakatTab
            analysisId={initialAnalysis.id}
            interviewSet={interviewSet}
            hasCv={!!(cvMetni || masterCv?.text)}
            cvMetni={cvMetni || masterCv?.text || null}
            isLoading={isGeneratingInterview}
            onGenerateSet={generateInterviewSet}
            onGenerateMore={handleGenerateMore}
            isGeneratingMore={isGeneratingMore}
            onStoryBankUpdated={(stories: StarStory[]) => {
              if (interviewSet) {
                setInterviewSet({
                  ...interviewSet,
                  hikayeBankasi: stories,
                });
              }
            }}
            onSwitchToCvTab={() => setActiveTab("cv")}
          />
        )}

        {activeTab === "cv" && (
          <CvTab
            analysisId={initialAnalysis.id}
            cvMatch={cvMatch}
            cvMetni={cvMetni}
            dosyaAdi={dosyaAdi}
            cvUploadId={cvUploadId}
            previousCv={previousCv}
            masterCv={masterCv}
            isCheckingMasterCv={isCheckingMasterCv}
            onCompareMasterCv={() =>
              masterCv
                ? handleCompareWithMasterCv(masterCv.text, masterCv.fileName)
                : Promise.resolve()
            }
            isLoading={isUploadingCv}
            onDeleteCv={handleDeleteCv}
            isDeleting={isDeletingCv}
            error={cvError}
            onAutoUpdatedCv={(payload) => {
              if (payload.previousCv) {
                setPreviousCv(payload.previousCv);
              }
              setCvMatch(payload.cvMatch);
              setCvMetni(payload.cvMetni);
              setDosyaAdi(payload.dosyaAdi);
              setCvUploadId(payload.cvUploadId);
            }}
          />
        )}

        {activeTab === "onyazi" && (
          <OnYaziTab
            analysisId={initialAnalysis.id}
            initialCoverLetter={interviewSet?.onYazi || null}
            hasCv={!!(cvMetni || masterCv?.text)}
            cvMetni={cvMetni || masterCv?.text || null}
            onCoverLetterUpdated={(cl: CoverLetter) => {
              setInterviewSet((prev) =>
                prev
                  ? { ...prev, onYazi: cl }
                  : {
                      teknik: [],
                      davranissal: [],
                      senaryolu: [],
                      sirketeOzel: [],
                      adayinSoracaklari: [],
                      onYazi: cl,
                    }
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
