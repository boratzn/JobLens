"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationStatus, ApplicationTracker, CvMatch } from "@/lib/schemas";
import {
  Briefcase,
  Building,
  Calendar,
  Trash2,
  ArrowRight,
  FileCheck2,
  Kanban,
  List,
  StickyNote,
  Save,
  Check,
  TrendingUp,
} from "lucide-react";

interface HistoryCvItem {
  id: string;
  dosyaAdi: string;
  cvMatch: CvMatch | null;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  url: string | null;
  kaynakSite: string;
  createdAt: string;
  jobAnalysis: {
    baslik: string;
    sirketAdi: string;
    lokasyon: string | null;
    pozisyonSeviyesi: string;
    calismaSekli: string;
    basvuruTakip?: ApplicationTracker;
  };
  cvUploads?: HistoryCvItem[];
  _count: {
    cvUploads: number;
  };
}

const STATUS_CONFIG: {
  id: ApplicationStatus;
  label: string;
  shortLabel: string;
  badgeClass: string;
}[] = [
  {
    id: "inceleniyor",
    label: "🔍 İnceleniyor",
    shortLabel: "İnceleniyor",
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
  },
  {
    id: "basvuruldu",
    label: "📨 Başvuruldu",
    shortLabel: "Başvuruldu",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  {
    id: "mulakat",
    label: "🗓️ Mülakat",
    shortLabel: "Mülakat",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  {
    id: "teklif",
    label: "🎉 Teklif",
    shortLabel: "Teklif",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "red",
    label: "❌ Red / Kapandı",
    shortLabel: "Red",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
  },
];

export default function GecmisPage() {
  const [analyses, setAnalyses] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "tumu">(
    "tumu"
  );
  const [viewMode, setViewMode] = useState<"liste" | "kanban">("liste");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/gecmis");
      const data = await res.json();
      if (data.analyses) {
        setAnalyses(data.analyses);
      }
    } catch (err) {
      console.error("Geçmiş yükleme hatası:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getItemTracker = (item: HistoryItem): ApplicationTracker => {
    return (
      item.jobAnalysis.basvuruTakip || {
        durum: "inceleniyor",
        mulakatTarihi: null,
        notlar: "",
      }
    );
  };

  const handleUpdateTracker = async (
    id: string,
    updates: Partial<ApplicationTracker>
  ) => {
    setSavingId(id);
    try {
      const res = await fetch("/api/gecmis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (res.ok && data.basvuruTakip) {
        setAnalyses((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  jobAnalysis: {
                    ...item.jobAnalysis,
                    basvuruTakip: data.basvuruTakip,
                  },
                }
              : item
          )
        );
        setSavedId(id);
        setTimeout(() => setSavedId(null), 2000);
      }
    } catch (err) {
      console.error("Başvuru durumu güncelleme hatası:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu başvuruyu ve analizi silmek istediğinize emin misiniz?")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch("/api/gecmis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAnalyses((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Silme hatası:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAnalyses = analyses.filter((item) => {
    if (filterStatus === "tumu") return true;
    return getItemTracker(item).durum === filterStatus;
  });

  const countByStatus = (st: ApplicationStatus) =>
    analyses.filter((a) => getItemTracker(a).durum === st).length;

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12 space-y-8">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Kanban className="h-8 w-8 text-blue-400" />
            Başvuru Takip Paneli & Geçmiş
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Analiz ettiğiniz tüm ilanların başvuru durumlarını, mülakat tarihlerini, CV skor gelişimlerinizi ve kişisel notlarınızı tek merkezden yönetin.
          </p>
        </div>

        <Link href="/">
          <Button variant="gradient" size="lg">
            <Briefcase className="h-4 w-4 mr-2" />
            Yeni İlan Analiz Et
          </Button>
        </Link>
      </div>

      {/* Özet İstatistik Kartları */}
      {analyses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STATUS_CONFIG.map((st) => {
            const count = countByStatus(st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() =>
                  setFilterStatus((prev) => (prev === st.id ? "tumu" : st.id))
                }
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterStatus === st.id
                    ? `${st.badgeClass} ring-2 ring-white/20`
                    : "bg-slate-900/60 border-white/[0.08] hover:border-white/20"
                }`}
              >
                <span className="text-xs font-semibold text-slate-400 block">
                  {st.label}
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtre & Görünüm Seçici Çubuğu */}
      {analyses.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus("tumu")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "tumu"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-900/70 text-slate-400 hover:text-white border border-white/[0.08]"
              }`}
            >
              Tümü ({analyses.length})
            </button>
            {STATUS_CONFIG.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === st.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900/70 text-slate-400 hover:text-white border border-white/[0.08]"
                }`}
              >
                {st.label} ({countByStatus(st.id)})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewMode("liste")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                viewMode === "liste"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Liste
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban Pano
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-slate-900/60 border border-white/5 rounded-2xl" />
          <div className="h-28 bg-slate-900/60 border border-white/5 rounded-2xl" />
        </div>
      ) : analyses.length === 0 ? (
        <Card className="text-center py-20 px-6 bg-slate-900/40 border-white/[0.08]">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <Kanban className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white">
            Henüz Kayıtlı Bir Başvurunuz veya Analiziniz Yok
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1.5 mb-6 leading-relaxed">
            Kariyer.net, LinkedIn veya başka bir platformdan bir iş ilanı linki yapıştırarak ilk analizinizi ve başvuru takibinizi hemen başlatın.
          </p>
          <Link href="/">
            <Button variant="gradient" size="lg">
              <Briefcase className="h-4 w-4 mr-2" />
              İlk İlanı Analiz Et
            </Button>
          </Link>
        </Card>
      ) : viewMode === "kanban" ? (
        /* KANBAN GÖRÜNÜMÜ */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {STATUS_CONFIG.map((col) => {
            const colItems = analyses.filter(
              (a) => getItemTracker(a).durum === col.id
            );
            return (
              <div
                key={col.id}
                className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/[0.08] space-y-3 min-h-[260px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-bold text-white">
                    {col.label}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {colItems.length}
                  </Badge>
                </div>

                {colItems.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-8">
                    Bu aşamada ilan yok
                  </p>
                ) : (
                  colItems.map((item) => {
                    const tracker = getItemTracker(item);
                    const latestScore =
                      item.cvUploads?.[0]?.cvMatch?.uyumSkoru ?? null;
                    const prevScore =
                      item.cvUploads?.[1]?.cvMatch?.uyumSkoru ?? null;
                    return (
                      <Card
                        key={item.id}
                        className="p-3.5 bg-slate-950/80 border-white/10 space-y-2.5"
                      >
                        <div>
                          <Link
                            href={`/analiz/${item.id}`}
                            className="text-xs font-bold text-white hover:text-blue-400 line-clamp-2 block"
                          >
                            {item.jobAnalysis.baslik}
                          </Link>
                          <span className="text-[11px] text-blue-400 font-semibold block mt-0.5">
                            {item.jobAnalysis.sirketAdi}
                          </span>
                        </div>

                        {latestScore !== null && (
                          <div className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {prevScore !== null
                              ? `CV: %${prevScore} → %${latestScore}`
                              : `CV Uyum: %${latestScore}`}
                          </div>
                        )}

                        {tracker.mulakatTarihi && (
                          <div className="text-[10px] text-amber-300 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Mülakat: {tracker.mulakatTarihi.substring(0, 10)}
                          </div>
                        )}

                        {tracker.notlar && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-900/80 p-2 rounded-lg">
                            {tracker.notlar}
                          </p>
                        )}

                        <div className="pt-1 flex items-center justify-between gap-1">
                          <select
                            value={tracker.durum}
                            onChange={(e) =>
                              handleUpdateTracker(item.id, {
                                durum: e.target.value as ApplicationStatus,
                              })
                            }
                            className="bg-slate-900 border border-white/10 rounded-lg text-[10px] text-slate-200 px-2 py-1"
                          >
                            {STATUS_CONFIG.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.shortLabel}
                              </option>
                            ))}
                          </select>

                          <Link
                            href={`/analiz/${item.id}`}
                            className="text-[11px] font-semibold text-blue-400 hover:underline flex items-center"
                          >
                            Aç <ArrowRight className="h-3 w-3 ml-0.5" />
                          </Link>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* LİSTE GÖRÜNÜMÜ */
        <div className="space-y-3.5">
          {filteredAnalyses.map((item) => {
            const tracker = getItemTracker(item);
            const latestScore = item.cvUploads?.[0]?.cvMatch?.uyumSkoru ?? null;
            const prevScore = item.cvUploads?.[1]?.cvMatch?.uyumSkoru ?? null;
            const isEditingNote = editingNoteId === item.id;
            const dateStr = new Date(item.createdAt).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            return (
              <Card
                key={item.id}
                className="bg-slate-900/60 border-white/[0.08] hover:border-white/20 transition-all shadow-md"
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold text-slate-300"
                        >
                          {item.kaynakSite}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dateStr}
                        </span>
                        {latestScore !== null ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 rounded-lg">
                            <FileCheck2 className="h-3 w-3" />
                            {prevScore !== null
                              ? `CV Skoru: %${prevScore} → %${latestScore}`
                              : `CV Skoru: %${latestScore}`}
                          </span>
                        ) : item._count?.cvUploads > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 rounded-lg">
                            <FileCheck2 className="h-3 w-3" />
                            CV Karşılaştırıldı
                          </span>
                        ) : null}
                      </div>

                      <Link href={`/analiz/${item.id}`}>
                        <h3 className="text-lg sm:text-xl font-bold text-white truncate hover:text-blue-300 transition-colors">
                          {item.jobAnalysis.baslik}
                        </h3>
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1 text-blue-400 font-bold">
                          <Building className="h-3.5 w-3.5" />
                          {item.jobAnalysis.sirketAdi}
                        </span>
                        {item.jobAnalysis.lokasyon && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span>{item.jobAnalysis.lokasyon}</span>
                          </>
                        )}
                        <span className="text-slate-600">•</span>
                        <span className="capitalize">
                          {item.jobAnalysis.calismaSekli}
                        </span>
                      </div>
                    </div>

                    {/* Durum Seçici & Aksiyonlar */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <select
                        value={tracker.durum}
                        onChange={(e) =>
                          handleUpdateTracker(item.id, {
                            durum: e.target.value as ApplicationStatus,
                          })
                        }
                        className="h-10 px-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {STATUS_CONFIG.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-slate-950 border border-white/10">
                        <Calendar className="h-3.5 w-3.5 text-amber-400" />
                        <input
                          type="date"
                          value={
                            tracker.mulakatTarihi
                              ? tracker.mulakatTarihi.substring(0, 10)
                              : ""
                          }
                          onChange={(e) =>
                            handleUpdateTracker(item.id, {
                              mulakatTarihi: e.target.value || null,
                            })
                          }
                          title="Mülakat Tarihi Seçin"
                          className="bg-transparent text-xs text-slate-200 focus:outline-none"
                        />
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (isEditingNote) {
                            setEditingNoteId(null);
                          } else {
                            setEditingNoteId(item.id);
                            setNoteDraft(tracker.notlar || "");
                          }
                        }}
                        className="text-xs h-10 px-3 rounded-xl"
                      >
                        <StickyNote className="h-3.5 w-3.5 mr-1 text-blue-400" />
                        Not
                      </Button>

                      <Link href={`/analiz/${item.id}`}>
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs h-10 px-4 rounded-xl"
                        >
                          <span>Hazırlık Alanı</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        isLoading={deletingId === item.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 w-10 p-0 rounded-xl"
                        title="Analizi Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mevcut Not Gösterimi veya Düzenleme Kutusu */}
                  {(tracker.notlar || isEditingNote) && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      {isEditingNote ? (
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                          <Textarea
                            rows={2}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Bu başvuru için notlarınızı yazın (İK iletişim, beklenti, mülakat izlenimi)..."
                            className="bg-slate-950/80 border-white/10 text-xs flex-1"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingNoteId(null)}
                              className="text-xs"
                            >
                              Kapat
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              isLoading={savingId === item.id}
                              onClick={async () => {
                                await handleUpdateTracker(item.id, {
                                  notlar: noteDraft,
                                });
                                setEditingNoteId(null);
                              }}
                              className="text-xs"
                            >
                              <Save className="h-3.5 w-3.5 mr-1" />
                              Kaydet
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNoteId(item.id);
                            setNoteDraft(tracker.notlar || "");
                          }}
                          className="text-xs text-slate-300 bg-slate-950/50 px-3.5 py-2 rounded-xl border border-white/[0.05] cursor-pointer hover:border-white/15 flex items-center justify-between"
                        >
                          <span>
                            <strong className="text-blue-400 mr-1.5">Not:</strong>
                            {tracker.notlar}
                          </span>
                          {savedId === item.id && (
                            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                              <Check className="h-3 w-3" /> Kaydedildi
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
