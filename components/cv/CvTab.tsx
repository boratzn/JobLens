import React, { useState, useMemo } from "react";
import {
  CvMatch,
  CvDuzenleme,
  GitHubAnalysis,
} from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileText,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Tag,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  Share2,
  Code2,
  ExternalLink,
  SearchCheck,
  Wand2,
} from "lucide-react";
import Link from "next/link";

interface CvTabProps {
  analysisId: string;
  cvMatch: CvMatch | null;
  cvMetni: string | null;
  dosyaAdi: string | null;
  cvUploadId: string | null;
  previousCv?: {
    id: string;
    dosyaAdi: string;
    createdAt?: string;
    cvMatch: CvMatch | null;
  } | null;
  masterCv?: {
    text: string;
    fileName: string;
  } | null;
  isCheckingMasterCv?: boolean;
  onCompareMasterCv: () => Promise<void>;
  isLoading: boolean;
  onDeleteCv: (id: string) => Promise<void>;
  isDeleting: boolean;
  error?: string | null;
  onAutoUpdatedCv?: (payload: {
    cvUploadId: string;
    cvMatch: CvMatch;
    cvMetni: string;
    dosyaAdi: string;
    previousCv?: {
      id: string;
      dosyaAdi: string;
      createdAt?: string;
      cvMatch: CvMatch | null;
    } | null;
  }) => void;
}

export function CvTab({
  analysisId,
  cvMatch,
  cvMetni,
  dosyaAdi,
  cvUploadId,
  previousCv,
  masterCv,
  isCheckingMasterCv,
  onCompareMasterCv,
  isLoading,
  onDeleteCv,
  isDeleting,
  error,
  onAutoUpdatedCv,
}: CvTabProps) {
  const [selectedEditIndex, setSelectedEditIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showOptimizedPreview, setShowOptimizedPreview] = useState(false);

  // GitHub Portföy Analizi state'leri (#9)
  const [githubUsername, setGithubUsername] = useState("");
  const [githubData, setGithubData] = useState<GitHubAnalysis | null>(
    cvMatch?.githubAnalizi || null
  );
  const [isAnalyzingGithub, setIsAnalyzingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [copiedSpecialKey, setCopiedSpecialKey] = useState<string | null>(null);

  // Otomatik CV Düzenleme (Auto-Rewrite) state'leri
  const [isAutoEditing, setIsAutoEditing] = useState(false);
  const [autoEditError, setAutoEditError] = useState<string | null>(null);
  const [autoEditChanges, setAutoEditChanges] = useState<
    { bolum: string; yapilanIslem: string; etki: string }[]
  >([]);
  const [autoAddedKeywords, setAutoAddedKeywords] = useState<string[]>([]);
  const [customEditedCvText, setCustomEditedCvText] = useState<string | null>(
    null
  );

  const handleAutoRewriteCv = async () => {
    setIsAutoEditing(true);
    setAutoEditError(null);
    try {
      const res = await fetch("/api/cv/otomatik-duzenle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          cvUploadId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "CV otomatik düzenlenemedi.");
      }

      setAutoEditChanges(data.uygulananDegisiklikler || []);
      setAutoAddedKeywords(data.eklenenAnahtarKelimeler || []);
      setCustomEditedCvText(data.cvMetni);
      setShowOptimizedPreview(true);

      if (onAutoUpdatedCv) {
        onAutoUpdatedCv({
          cvUploadId: data.cvUploadId,
          cvMatch: data.cvMatch,
          cvMetni: data.cvMetni,
          dosyaAdi: data.dosyaAdi,
          previousCv: data.previousCv,
        });
      }
    } catch (err: any) {
      setAutoEditError(err.message);
    } finally {
      setIsAutoEditing(false);
    }
  };

  const handleCopySpecial = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSpecialKey(key);
    setTimeout(() => setCopiedSpecialKey(null), 2000);
  };

  const handleAnalyzeGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername.trim()) return;
    setIsAnalyzingGithub(true);
    setGithubError(null);
    try {
      const res = await fetch("/api/github/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          githubUsername: githubUsername.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "GitHub analizi yapılamadı.");
      }
      setGithubData(data.githubAnalizi);
    } catch (err: any) {
      setGithubError(err.message);
    } finally {
      setIsAnalyzingGithub(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Metin vurgulama (Highlighting)
  const highlightedCvSegments = useMemo(() => {
    if (!cvMetni || !cvMatch?.duzenlemeler) return null;

    const text = cvMetni;
    const edits = cvMatch.duzenlemeler;

    const matches: { start: number; end: number; editIndex: number; edit: CvDuzenleme }[] = [];

    edits.forEach((edit, editIndex) => {
      if (!edit.mevcutMetin || edit.tur === "ekle") return;
      const cleanTarget = edit.mevcutMetin.trim();
      if (!cleanTarget) return;

      let idx = text.indexOf(cleanTarget);
      if (idx === -1) {
        idx = text.toLowerCase().indexOf(cleanTarget.toLowerCase());
      }

      if (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + cleanTarget.length,
          editIndex,
          edit,
        });
      }
    });

    matches.sort((a, b) => a.start - b.start);
    const nonOverlapping: typeof matches = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        nonOverlapping.push(m);
        lastEnd = m.end;
      }
    }

    const segments: React.ReactNode[] = [];
    let currentIdx = 0;

    nonOverlapping.forEach((m, i) => {
      if (m.start > currentIdx) {
        segments.push(
          <span key={`txt-${i}`} className="text-slate-300">
            {text.substring(currentIdx, m.start)}
          </span>
        );
      }

      const priorityClass =
        m.edit.oncelik === "yüksek"
          ? "bg-red-500/30 text-red-200 border-b-2 border-red-500 font-semibold"
          : m.edit.oncelik === "orta"
          ? "bg-amber-500/30 text-amber-200 border-b-2 border-amber-500 font-semibold"
          : "bg-yellow-500/25 text-yellow-200 border-b-2 border-yellow-500 font-semibold";

      const isSelected = selectedEditIndex === m.editIndex;

      segments.push(
        <mark
          key={`mark-${i}`}
          onClick={() => setSelectedEditIndex(m.editIndex)}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all ${priorityClass} ${
            isSelected
              ? "ring-2 ring-blue-400 shadow-lg shadow-blue-500/20"
              : "hover:opacity-80"
          }`}
          title={`Öneri #${m.editIndex + 1} (${m.edit.oncelik} öncelik) - İncelemek için tıkla`}
        >
          {text.substring(m.start, m.end)}
        </mark>
      );

      currentIdx = m.end;
    });

    if (currentIdx < text.length) {
      segments.push(
        <span key="txt-end" className="text-slate-300">
          {text.substring(currentIdx)}
        </span>
      );
    }

    return segments;
  }, [cvMetni, cvMatch, selectedEditIndex]);

  // Tüm AI önerilerinin uygulanmış olduğu Optimize CV metni
  const optimizedCvText = useMemo(() => {
    if (customEditedCvText !== null) return customEditedCvText;
    if (!cvMetni || !cvMatch?.duzenlemeler) return cvMetni || "";
    let result = cvMetni;
    for (const edit of cvMatch.duzenlemeler) {
      if (edit.tur === "değiştir" && edit.mevcutMetin?.trim()) {
        result = result.replace(edit.mevcutMetin.trim(), edit.onerilenMetin);
      } else if (edit.tur === "çıkar" && edit.mevcutMetin?.trim()) {
        result = result.replace(edit.mevcutMetin.trim(), "");
      }
    }
    const additions = cvMatch.duzenlemeler.filter((d) => d.tur === "ekle");
    if (additions.length > 0) {
      result +=
        "\n\n--- İLANA ÖZEL EKLENEN YETKİNLİK & BAŞARI MADDELERİ ---\n" +
        additions
          .map((a) => `• [${a.bolum.toUpperCase()}] ${a.onerilenMetin}`)
          .join("\n");
    }
    return result;
  }, [cvMetni, cvMatch, customEditedCvText]);

  const handleDownloadOptimizedCv = (format: "doc" | "txt") => {
    if (!optimizedCvText) return;
    if (format === "txt") {
      const blob = new Blob([optimizedCvText], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Optimize_CV_${(dosyaAdi || "Aday").replace(/\.[^.]+$/, "")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Optimize CV</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#111;white-space:pre-wrap;}</style></head><body>${optimizedCvText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</body></html>`;
      const blob = new Blob([htmlDoc], {
        type: "application/msword;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Optimize_CV_${(dosyaAdi || "Aday").replace(/\.[^.]+$/, "")}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // CV Uyumluluk Durumu Kontrolü (Ana Sayfadaki Master CV üzerinden)
  if (!cvMatch || !cvMetni) {
    if (isLoading || isCheckingMasterCv) {
      return (
        <Card className="max-w-3xl mx-auto p-8 sm:p-12 bg-slate-900/60 border-blue-500/25 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 animate-pulse">
            <Sparkles className="h-8 w-8 animate-spin" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-extrabold text-white">
            Kayıtlı CV'niz Bu İş İlanıyla Karşılaştırılıyor...
          </CardTitle>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Ana sayfada yüklediğiniz{" "}
            <strong className="text-slate-200">
              {masterCv?.fileName || "CV"}
            </strong>{" "}
            dosyası hedef ilandaki kriterler, ATS anahtar kelimeleri ve deneyim beklentileriyle eşleştiriliyor. Lütfen birkaç saniye bekleyin.
          </p>
        </Card>
      );
    }

    // Kullanıcı Ana Sayfada hiç CV yüklemediyse uyarı göster
    if (!masterCv) {
      return (
        <Card className="max-w-3xl mx-auto p-6 sm:p-10 bg-slate-900/60 border-amber-500/30">
          <div className="text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <Badge variant="warning" className="text-xs px-3 py-0.5">
                CV Bulunamadı Uyarısı
              </Badge>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold text-white">
                Henüz Sistemde Yüklü Bir CV'niz Bulunmuyor
              </CardTitle>
              <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                CV ekleme alanı iş ilanlarından bağımsız olarak{" "}
                <strong className="text-white">Ana Sayfada</strong> yer almaktadır. Bu iş ilanıyla CV uyumluluğunuzu ölçmek, eksik ATS kelimelerini görmek ve CV'nizi ilana göre otomatik düzenlemek için lütfen önce Ana Sayfadan CV'nizi yükleyin.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/#cv-merkezi"
                className="inline-flex items-center justify-center h-12 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Upload className="h-4 w-4 mr-2" />
                Ana Sayfaya Git ve CV Yükle
              </Link>
            </div>
          </div>
        </Card>
      );
    }

    // Master CV var ama henüz karşılaştırılmadıysa (veya hata oluştuysa)
    return (
      <Card className="max-w-3xl mx-auto p-6 sm:p-10 bg-slate-900/60 border-blue-500/25">
        <div className="text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 border border-white/20">
            <FileText className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-white">
              Kayıtlı CV'nizi Bu İlanla Karşılaştırın
            </CardTitle>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              Ana sayfada yüklü olan{" "}
              <strong className="text-emerald-300">{masterCv.fileName}</strong>{" "}
              dosyanız bu iş ilanıyla karşılaştırılmaya hazır.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-center gap-2 max-w-lg mx-auto">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              size="lg"
              variant="gradient"
              onClick={onCompareMasterCv}
              isLoading={isLoading}
              disabled={isLoading}
              className="h-12 px-6 font-bold text-sm rounded-2xl"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Kayıtlı CV'mi ({masterCv.fileName}) Bu İlanla Karşılaştır
            </Button>

            <Link
              href="/#cv-merkezi"
              className="inline-flex items-center justify-center h-12 px-5 rounded-2xl text-xs font-semibold bg-slate-950 border border-white/15 hover:border-white/30 text-slate-300 hover:text-white transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Ana Sayfada CV Değiştir
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const currentEdit =
    selectedEditIndex !== null && cvMatch.duzenlemeler[selectedEditIndex]
      ? cvMatch.duzenlemeler[selectedEditIndex]
      : cvMatch.duzenlemeler[0] || null;

  const prevMatch = previousCv?.cvMatch || null;
  const scoreDiff = prevMatch ? cvMatch.uyumSkoru - prevMatch.uyumSkoru : null;
  const resolvedKeywords = prevMatch
    ? (prevMatch.eksikAnahtarKelimeler || []).filter(
        (kw) =>
          !(cvMatch.eksikAnahtarKelimeler || []).some(
            (curr) => curr.toLowerCase() === kw.toLowerCase()
          )
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Önce / Sonra Skor Karşılaştırma Banner'ı (JobShinobi tarzı 62 -> 81) */}
      {prevMatch && (
        <Card className="border-emerald-500/35 bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-blue-950/50 p-5 sm:p-6 shadow-xl animate-in fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-[11px] px-2.5 py-0.5">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  Önce / Sonra Skor Karşılaştırması
                </Badge>
                <span className="text-xs text-slate-400">
                  {previousCv?.dosyaAdi} → {dosyaAdi}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-center">
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">
                    Önceki CV
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-300">
                    %{prevMatch.uyumSkoru}
                  </span>
                </div>

                <ArrowRight className="h-6 w-6 text-emerald-400 shrink-0" />

                <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-center">
                  <span className="text-[10px] uppercase text-emerald-300 block font-bold">
                    Yeni CV
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-300">
                    %{cvMatch.uyumSkoru}
                  </span>
                </div>

                {scoreDiff !== null && (
                  <div
                    className={`px-3.5 py-2 rounded-xl font-extrabold text-sm ${
                      scoreDiff > 0
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : scoreDiff < 0
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {scoreDiff > 0
                      ? `+${scoreDiff} Puan Artış 🚀`
                      : scoreDiff < 0
                      ? `${scoreDiff} Puan Değişim`
                      : "Skor Aynı Kaldı"}
                  </div>
                )}
              </div>
            </div>

            {/* Kategori Bazlı Değişim Özeti */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {(
                [
                  ["teknik", "Teknik"],
                  ["deneyim", "Deneyim"],
                  ["anahtarKelime", "ATS Kelime"],
                ] as const
              ).map(([k, label]) => {
                const oldVal = prevMatch.skorDagilimi[k] || 0;
                const newVal = cvMatch.skorDagilimi[k] || 0;
                const diff = newVal - oldVal;
                return (
                  <div
                    key={k}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.08]"
                  >
                    <span className="text-[10px] text-slate-400 block">
                      {label}
                    </span>
                    <div className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <span className="text-slate-400">%{oldVal}</span>
                      <span>→</span>
                      <span className="text-emerald-300">%{newVal}</span>
                      {diff !== 0 && (
                        <span
                          className={`text-[10px] ${
                            diff > 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          ({diff > 0 ? `+${diff}` : diff})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {resolvedKeywords.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Yeni CV'de Tamamlanan Anahtar Kelimeler:
              </span>
              {resolvedKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                >
                  ✓ {kw}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Skor & Dağılım Kartı */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-slate-900/90 to-blue-950/30 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 40 * (1 - cvMatch.uyumSkoru / 100)
                  }`}
                  strokeLinecap="round"
                  className={
                    cvMatch.uyumSkoru >= 80
                      ? "text-emerald-400"
                      : cvMatch.uyumSkoru >= 60
                      ? "text-blue-400"
                      : "text-amber-400"
                  }
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-white">
                  %{cvMatch.uyumSkoru}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Uyum
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                {cvMatch.uyumSkoru >= 80
                  ? "Yüksek Uyumluluk 🎉"
                  : cvMatch.uyumSkoru >= 60
                  ? "İyi Seviyede Profil 👍"
                  : "Geliştirilmesi Gereken Noktalar Var ⚠️"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md leading-relaxed">
                {cvMatch.genelTavsiye}
              </p>
            </div>
          </div>

          <div className="w-full md:w-80 space-y-2.5 text-xs">
            {Object.entries(cvMatch.skorDagilimi).map(([key, value]) => {
              const labels: Record<string, string> = {
                teknik: "Teknik Nitelikler",
                deneyim: "Deneyim Yılı & Seviye",
                egitim: "Eğitim",
                dil: "Yabancı Dil",
                anahtarKelime: "ATS Anahtar Kelimeler",
              };
              return (
                <div key={key}>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-slate-400">
                      {labels[key] || key}
                    </span>
                    <span className="font-bold text-white">
                      %{value}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        value >= 80
                          ? "bg-emerald-400"
                          : value >= 60
                          ? "bg-blue-400"
                          : "bg-amber-400"
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>
              İncelenen Dosya: <strong className="text-white">{dosyaAdi}</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="gradient"
              size="sm"
              onClick={handleAutoRewriteCv}
              isLoading={isAutoEditing}
              disabled={isAutoEditing}
              className="text-xs shadow-lg shadow-blue-500/20"
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              CV'mi İlana Göre Otomatik Değiştir & Yeniden Puanla
            </Button>

            {masterCv && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onCompareMasterCv}
                isLoading={isLoading}
                disabled={isLoading}
                className="text-xs border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Ana Sayfadaki Güncel CV ile Yeniden Karşılaştır
              </Button>
            )}

            <Link
              href="/#cv-merkezi"
              className="inline-flex items-center justify-center h-8 px-3 rounded-xl text-xs font-semibold bg-slate-950 border border-white/15 hover:border-white/30 text-slate-300 hover:text-white transition-all"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Ana Sayfada CV Değiştir
            </Link>

            {cvUploadId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteCv(cvUploadId)}
                disabled={isDeleting}
                isLoading={isDeleting}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Bu Analizi Sıfırla
              </Button>
            )}
          </div>
        </div>

        {autoEditError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{autoEditError}</span>
          </div>
        )}

        {autoEditChanges.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Wand2 className="h-4 w-4" />
                Yapay Zekâ Tarafından Otomatik Uygulanan CV Değişiklikleri ({autoEditChanges.length})
              </span>
              <Badge variant="success" className="text-[10px]">
                Yeni CV Hazır & İndirilebilir
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {autoEditChanges.map((chg, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs"
                >
                  <strong className="text-emerald-300 uppercase text-[10px] block">
                    {chg.bolum}
                  </strong>
                  <p className="text-slate-200 font-medium">{chg.yapilanIslem}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{chg.etki}</p>
                </div>
              ))}
            </div>
            {autoAddedKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-emerald-300">
                  Entegre Edilen ATS Kelimeleri:
                </span>
                {autoAddedKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[10px] font-semibold"
                  >
                    +{kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Eksik Kelimeler & ATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 bg-slate-900/60 border-amber-500/20">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-300 mb-2.5">
            <Tag className="h-4 w-4" />
            CV'nizde Eksik Olan ATS Anahtar Kelimeleri ({cvMatch.eksikAnahtarKelimeler.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cvMatch.eksikAnahtarKelimeler.map((kw, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25"
              >
                +{kw}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-slate-900/60 border-blue-500/20">
          <div className="flex items-center gap-2 font-bold text-xs text-blue-300 mb-2.5">
            <ShieldCheck className="h-4 w-4" />
            ATS (Aday Takip Sistemi) Uyarıları
          </div>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside leading-relaxed">
            {cvMatch.atsUyarilari.map((uyari, i) => (
              <li key={i}>{uyari}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* İki Sütunlu Görünüm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sol Kolon: CV Metni */}
        <Card className="lg:col-span-7 bg-slate-900/60 border-white/[0.08] overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-white/[0.08] bg-slate-950/60 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowOptimizedPreview(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !showOptimizedPreview
                      ? "bg-blue-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  Orijinal CV & Vurgular
                </button>
                <button
                  type="button"
                  onClick={() => setShowOptimizedPreview(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    showOptimizedPreview
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-emerald-300 hover:bg-emerald-500/15"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Optimize Edilmiş CV Önizlemesi
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownloadOptimizedCv("doc")}
                  className="h-7 px-2.5 text-[11px]"
                >
                  Word (.doc) İndir
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownloadOptimizedCv("txt")}
                  className="h-7 px-2.5 text-[11px]"
                >
                  .txt İndir
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleCopySpecial(optimizedCvText, "optimized-cv-all")
                  }
                  className="h-7 px-2.5 text-[11px]"
                >
                  {copiedSpecialKey === "optimized-cv-all" ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-400" />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Kopyala
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!showOptimizedPreview && (
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-red-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-red-400 inline-block" /> Yüksek
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Orta
                </span>
                <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" /> Düşük
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-5 max-h-[600px] overflow-y-auto text-xs leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/40">
            {showOptimizedPreview ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-300 font-sans">
                  <span>
                    ✨ Aşağıdaki optimize edilmiş CV metnini dilediğiniz gibi düzenleyebilir ve üstteki butonlarla Word (.doc) veya .txt olarak indirebilirsiniz:
                  </span>
                </div>
                <Textarea
                  value={optimizedCvText}
                  onChange={(e) => setCustomEditedCvText(e.target.value)}
                  rows={22}
                  className="bg-slate-950/90 border-emerald-500/30 text-emerald-100 font-mono text-xs leading-relaxed"
                />
              </div>
            ) : (
              <>
                {highlightedCvSegments || cvMetni}

                {cvMatch.duzenlemeler
                  .filter((d) => d.tur === "ekle")
                  .map((d, idx) => (
                    <div
                      key={`ekle-${idx}`}
                      onClick={() => {
                        const originalIdx = cvMatch.duzenlemeler.indexOf(d);
                        setSelectedEditIndex(originalIdx);
                      }}
                      className="mt-3 p-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/10 text-emerald-200 cursor-pointer hover:bg-emerald-500/20 transition-all"
                    >
                      <strong className="text-[11px] font-bold block mb-0.5 text-emerald-300">
                        + [{d.bolum.toUpperCase()}] Bölümüne Ekleme Önerisi (Tıkla):
                      </strong>
                      <span className="text-xs">{d.onerilenMetin}</span>
                    </div>
                  ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Sağ Kolon: Aktif Öneri Kartı */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <Card className="border-blue-500/30 bg-slate-900/80 shadow-2xl">
            <CardHeader className="pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  Öneri Detayı {selectedEditIndex !== null ? `#${selectedEditIndex + 1}` : ""}
                </CardTitle>
                {currentEdit && (
                  <Badge
                    variant={
                      currentEdit.oncelik === "yüksek"
                        ? "destructive"
                        : currentEdit.oncelik === "orta"
                        ? "warning"
                        : "secondary"
                    }
                    className="text-[10px] capitalize"
                  >
                    {currentEdit.oncelik} Öncelik
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {currentEdit ? (
                <>
                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                      Bölüm & İşlem
                    </span>
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <span className="capitalize">{currentEdit.bolum}</span>
                      <span>•</span>
                      <span className="capitalize">{currentEdit.tur}</span>
                    </div>
                  </div>

                  {currentEdit.mevcutMetin && (
                    <div>
                      <span className="text-[11px] font-bold uppercase text-red-400 block mb-1">
                        Mevcut Cümleniz:
                      </span>
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-200 leading-relaxed font-mono">
                        {currentEdit.mevcutMetin}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase text-emerald-400">
                        Önerilen Güçlü İfade:
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            currentEdit.onerilenMetin,
                            selectedEditIndex ?? 0
                          )
                        }
                        className="h-6 px-2 text-[10px]"
                      >
                        {copiedIndex === selectedEditIndex ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-emerald-400" />
                            Kopyalandı
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Kopyala
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-100 font-medium leading-relaxed">
                      {currentEdit.onerilenMetin}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                      Gerekçe:
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                      {currentEdit.gerekce}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">
                  İncelemek istediğiniz vurgulu metne tıklayınız.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Diğer Önerilere Hızlı Geçiş */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Tüm Öneriler ({cvMatch.duzenlemeler.length})
            </span>
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
              {cvMatch.duzenlemeler.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedEditIndex(i)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                    selectedEditIndex === i
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-200 font-bold"
                      : "bg-slate-900/60 border-white/[0.06] text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate max-w-[210px]">
                    #{i + 1} [{d.bolum}] {d.onerilenMetin.substring(0, 35)}...
                  </span>
                  <Badge
                    variant={
                      d.oncelik === "yüksek"
                        ? "destructive"
                        : d.oncelik === "orta"
                        ? "warning"
                        : "secondary"
                    }
                    className="text-[9px] py-0 px-1.5"
                  >
                    {d.oncelik}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* #4 Çalışılacaklar Listesi (Actionable Study Plan) */}
      {cvMatch.eksikNitelikler && cvMatch.eksikNitelikler.length > 0 && (
        <Card className="p-6 bg-slate-900/60 border-indigo-500/25 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Mülakata Kadar “Çalışılacaklar” & Açık Kapatma Planı
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Eksik nitelikler için mülakata kadar uygulayabileceğiniz hızlı çalışma kaynakları, mini projeler ve mülakatta bu eksikliği dürüstçe anlatma stratejisi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cvMatch.eksikNitelikler.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.08] space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">
                    {item.nitelik}
                  </span>
                  <Badge
                    variant={item.onem >= 4 ? "destructive" : "warning"}
                    className="text-[10px]"
                  >
                    Önem: {item.onem}/5
                  </Badge>
                </div>

                <p className="text-slate-300 leading-relaxed">{item.oneri}</p>

                {item.kaynakOnerisi && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200">
                    <strong className="text-blue-300 block mb-0.5">
                      📚 Hızlı Kaynak / Konu:
                    </strong>
                    {item.kaynakOnerisi}
                  </div>
                )}

                {item.miniProjeFikri && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                    <strong className="text-emerald-300 block mb-0.5">
                      🛠️ Mülakata Kadar Mini Proje Önerisi:
                    </strong>
                    {item.miniProjeFikri}
                  </div>
                )}

                {item.mulakatSavunmasi && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    <strong className="text-amber-300 block mb-0.5">
                      🎙️ Mülakatta Dürüst & Güçlü Anlatım:
                    </strong>
                    "{item.mulakatSavunmasi}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* #8 Tutarlılık Kontrolü (Tarih Çakışması, Kariyer Boşluğu ve Unvan Denetimi) */}
      {cvMatch.tutarlilikKontrolu && (
        <Card className="p-6 bg-slate-900/60 border-amber-500/25 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <SearchCheck className="h-5 w-5 text-amber-400" />
                CV Tutarlılık & Kariyer Boşluğu Denetimi
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {cvMatch.tutarlilikKontrolu.genelDurum}
              </p>
            </div>
            <Badge
              variant={
                cvMatch.tutarlilikKontrolu.bulgular.length === 0
                  ? "success"
                  : "warning"
              }
            >
              {cvMatch.tutarlilikKontrolu.bulgular.length === 0
                ? "Sorun Tespit Edilmedi"
                : `${cvMatch.tutarlilikKontrolu.bulgular.length} Dikkat Noktası`}
            </Badge>
          </div>

          {cvMatch.tutarlilikKontrolu.bulgular.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cvMatch.tutarlilikKontrolu.bulgular.map((b, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 uppercase text-[11px]">
                      {b.tur.replace("_", " ")}
                    </span>
                    <Badge
                      variant={
                        b.ciddiyet === "yüksek" ? "destructive" : "warning"
                      }
                      className="text-[10px]"
                    >
                      {b.ciddiyet} dikkat
                    </Badge>
                  </div>
                  <p className="text-slate-200 font-medium">{b.aciklama}</p>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-white/[0.06] text-slate-300">
                    <strong className="text-red-300 block mb-0.5">
                      Gelebilecek Mülakat Sorusu:
                    </strong>
                    "{b.mulakatSorusu}"
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                    <strong className="text-emerald-300 block mb-0.5">
                      Önerilen Savunma & Açıklama:
                    </strong>
                    {b.savunmaOnerisi}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* #13 LinkedIn Profil Optimizasyonu */}
      {cvMatch.linkedinOnerileri &&
        (cvMatch.linkedinOnerileri.baslikOnerileri.length > 0 ||
          cvMatch.linkedinOnerileri.hakkindaOnerisi) && (
          <Card className="p-6 bg-slate-900/60 border-blue-500/25 space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-400" />
                Hedef İlana Uygun LinkedIn Profil Önerileri
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                İK uzmanlarının LinkedIn aramalarında üst sıralarda çıkmak için kullanabileceğiniz Başlık (Headline) ve Hakkında (About) metinleri.
              </p>
            </div>

            {cvMatch.linkedinOnerileri.baslikOnerileri.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block">
                  Önerilen LinkedIn Başlıkları (Headline):
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {cvMatch.linkedinOnerileri.baslikOnerileri.map((hl, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-100 font-medium">{hl}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopySpecial(hl, `hl-${i}`)}
                        className="h-7 px-2.5 text-[11px] shrink-0"
                      >
                        {copiedSpecialKey === `hl-${i}` ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-emerald-400" />
                            Kopyalandı
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Kopyala
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvMatch.linkedinOnerileri.hakkindaOnerisi && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Önerilen LinkedIn "Hakkında (About)" Bölümü:
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleCopySpecial(
                        cvMatch.linkedinOnerileri!.hakkindaOnerisi,
                        "li-about"
                      )
                    }
                    className="h-7 px-2.5 text-[11px]"
                  >
                    {copiedSpecialKey === "li-about" ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-emerald-400" />
                        Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Kopyala
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {cvMatch.linkedinOnerileri.hakkindaOnerisi}
                </div>
              </div>
            )}
          </Card>
        )}

      {/* #9 GitHub / Portföy Analizi */}
      <Card className="p-6 bg-slate-900/60 border-purple-500/25 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="h-5 w-5 text-purple-400" />
              GitHub / Portföy Analizi (İlana Uygun Repoları Öne Çıkar)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              GitHub kullanıcı adınızı girin; herkese açık projeleriniz taranarak bu ilanla en çok eşleşen (veya CV'de unuttuğunuz) repolarınız için hazır CV maddeleri üretilsin.
            </p>
          </div>

          <form
            onSubmit={handleAnalyzeGithub}
            className="flex items-center gap-2 shrink-0"
          >
            <Input
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="github.com/kullaniciadi"
              className="w-52 sm:w-64 bg-slate-950 border-white/15 text-xs h-10"
            />
            <Button
              type="submit"
              variant="gradient"
              size="sm"
              isLoading={isAnalyzingGithub}
              disabled={isAnalyzingGithub || !githubUsername.trim()}
              className="h-10 px-4 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Repoları Analiz Et
            </Button>
          </form>
        </div>

        {githubError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{githubError}</span>
          </div>
        )}

        {(githubData || cvMatch.githubAnalizi) && (
          <div className="space-y-4 pt-2 border-t border-white/[0.08]">
            <p className="text-xs text-slate-300 leading-relaxed">
              {(githubData || cvMatch.githubAnalizi)!.ozetDegerlendirme}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(githubData || cvMatch.githubAnalizi)!.oneCikanProjeler.map(
                (proj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <a
                        href={proj.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sm text-purple-300 hover:underline flex items-center gap-1"
                      >
                        {proj.repoAdi}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <Badge variant="success" className="text-[10px]">
                        %{proj.uyumSkoru} İlan Uyumu
                      </Badge>
                    </div>

                    <p className="text-slate-300">{proj.nedenUygun}</p>

                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-emerald-300">
                          CV'ye Eklenecek Hazır Madde:
                        </strong>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopySpecial(
                              proj.cvEklemeOnerisi,
                              `gh-cv-${idx}`
                            )
                          }
                          className="text-[10px] text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedSpecialKey === `gh-cv-${idx}` ? (
                            <>
                              <Check className="h-3 w-3" /> Kopyalandı
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Kopyala
                            </>
                          )}
                        </button>
                      </div>
                      <p>{proj.cvEklemeOnerisi}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-white/[0.06] text-slate-300">
                      <strong className="text-purple-300 block mb-0.5">
                        Mülakatta Nasıl Anlatmalı:
                      </strong>
                      {proj.mulakatAnlatimi}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
