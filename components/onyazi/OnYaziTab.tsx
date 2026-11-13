"use client";

import React, { useState, useEffect } from "react";
import { CoverLetter } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  FileSignature,
  Sparkles,
  Copy,
  Check,
  Save,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface OnYaziTabProps {
  analysisId: string;
  initialCoverLetter: CoverLetter | null;
  hasCv: boolean;
  cvMetni: string | null;
  onCoverLetterUpdated: (cl: CoverLetter) => void;
}

export function OnYaziTab({
  analysisId,
  initialCoverLetter,
  hasCv,
  cvMetni,
  onCoverLetterUpdated,
}: OnYaziTabProps) {
  const [ton, setTon] = useState<"kurumsal" | "samimi" | "iddiali">(
    initialCoverLetter?.ton || "kurumsal"
  );
  const [ekNotlar, setEkNotlar] = useState("");
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(
    initialCoverLetter
  );
  const [editableKonu, setEditableKonu] = useState(
    initialCoverLetter?.konuBasligi || ""
  );
  const [editableIcerik, setEditableIcerik] = useState(
    initialCoverLetter?.icerik || ""
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<"konu" | "icerik" | "tumu" | null>(
    null
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCoverLetter) {
      setCoverLetter(initialCoverLetter);
      setEditableKonu(initialCoverLetter.konuBasligi);
      setEditableIcerik(initialCoverLetter.icerik);
      setTon(initialCoverLetter.ton);
    }
  }, [initialCoverLetter]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/onyazi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          ton,
          ekNotlar: ekNotlar.trim() || undefined,
          cvMetni: cvMetni || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ön yazı üretilemedi.");
      }
      setCoverLetter(data.onYazi);
      setEditableKonu(data.onYazi.konuBasligi);
      setEditableIcerik(data.onYazi.icerik);
      onCoverLetterUpdated(data.onYazi);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!coverLetter) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated: CoverLetter = {
        ...coverLetter,
        ton,
        konuBasligi: editableKonu,
        icerik: editableIcerik,
      };
      const res = await fetch("/api/onyazi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          onYazi: updated,
        }),
      });
      const data = await res.json();
      if (res.ok && data.onYazi) {
        setCoverLetter(data.onYazi);
        onCoverLetterUpdated(data.onYazi);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Ön yazı kaydetme hatası:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (type: "konu" | "icerik" | "tumu") => {
    const text =
      type === "konu"
        ? editableKonu
        : type === "icerik"
        ? editableIcerik
        : `Konu: ${editableKonu}\n\n${editableIcerik}`;
    navigator.clipboard.writeText(text);
    setCopiedField(type);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const tonOptions = [
    {
      id: "kurumsal",
      title: "Kurumsal & Resmi",
      desc: "Banka, kurumsal şirketler ve geleneksel sektörler için dengeli, saygın üslup.",
    },
    {
      id: "samimi",
      title: "Samimi & Startup",
      desc: "Teknoloji şirketleri, hızlı büyüyen girişimler ve ürün odaklı ekipler için dinamik üslup.",
    },
    {
      id: "iddiali",
      title: "İddialı & Sonuç Odaklı",
      desc: "Doğrudan çözdüğünüz problemlere, liderliğe ve metriklere odaklanan özgüvenli üslup.",
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Üretim & Ayarlar Kartı */}
      <Card className="p-6 bg-slate-900/60 border-white/[0.08]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
              <FileSignature className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                İlana ve CV'ye Özel Ön Yazı (Cover Letter)
                {hasCv ? (
                  <Badge variant="success" className="text-[10px]">
                    CV Verisiyle Kişiselleştirilmiş
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px]">
                    Yalnızca İlan Verisi (CV Yüklenmedi)
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                İlanın aradığı temel kriterleri, şirket kültürünü ve{" "}
                {hasCv
                  ? "yüklediğiniz CV'deki gerçek başarılarınızı"
                  : "pozisyon gereksinimlerini"}{" "}
                harmanlayarak ikna edici bir ön yazı oluşturun.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-5 space-y-5">
          {/* Ton Seçimi */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              1. Ön Yazı Tonunu Seçin
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {tonOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTon(item.id)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    ton === item.id
                      ? "bg-blue-600/15 border-blue-500/50 ring-1 ring-blue-500/30"
                      : "bg-slate-950/60 border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">
                      {item.title}
                    </span>
                    {ton === item.id && (
                      <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Özel Not */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              2. Özel Vurgulanmasını İstediğiniz Detay (Opsiyonel)
            </label>
            <Input
              value={ekNotlar}
              onChange={(e) => setEkNotlar(e.target.value)}
              placeholder="Örn: Yüksek lisans tezimin bu alanda olduğunu veya açık kaynak katkılarımı özellikle vurgula..."
              className="bg-slate-950/80 border-white/10 text-xs sm:text-sm"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              isLoading={isGenerating}
              disabled={isGenerating}
              variant="gradient"
              size="lg"
            >
              {coverLetter ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Seçilen Tonla Yeniden Üret
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ön Yazıyı Oluştur
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Üretilen Ön Yazı Editörü */}
      {coverLetter && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-8 p-6 bg-slate-900/80 border-blue-500/25 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize text-blue-300">
                  {coverLetter.ton} Ton
                </Badge>
                <span className="text-xs text-slate-400">
                  Metin üzerinde dilediğiniz değişikliği yapıp kaydedebilirsiniz.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy("tumu")}
                  className="text-xs"
                >
                  {copiedField === "tumu" ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                      Tümünü Kopyaladı
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Tümünü Kopyala
                    </>
                  )}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdits}
                  isLoading={isSaving}
                  disabled={isSaving}
                  className="text-xs"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                      Kaydedildi
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Değişiklikleri Kaydet
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Konu Başlığı */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Önerilen E-posta / Başvuru Başlığı:
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy("konu")}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === "konu" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" /> Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Başlığı Kopyala
                    </>
                  )}
                </button>
              </div>
              <Input
                value={editableKonu}
                onChange={(e) => setEditableKonu(e.target.value)}
                className="bg-slate-950/80 border-white/10 font-semibold text-white"
              />
            </div>

            {/* Ön Yazı Gövdesi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Ön Yazı Metni:
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy("icerik")}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === "icerik" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" /> Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Metni Kopyala
                    </>
                  )}
                </button>
              </div>
              <Textarea
                value={editableIcerik}
                onChange={(e) => setEditableIcerik(e.target.value)}
                rows={14}
                className="bg-slate-950/80 border-white/10 text-xs sm:text-sm leading-relaxed text-slate-100 font-normal"
              />
            </div>
          </Card>

          {/* Sağ Kolon: Vurgulanan Nitelikler & İpucu */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5 bg-slate-900/60 border-emerald-500/20">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-300 mb-3">
                <CheckCircle2 className="h-4 w-4" />
                Ön Yazıda Öne Çıkarılan Eşleşmeler
              </div>
              <div className="flex flex-wrap gap-1.5">
                {coverLetter.vurgulananNitelikler.map((n, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-200 border border-emerald-500/25"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-slate-900/60 border-amber-500/20">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-300 mb-2">
                <Lightbulb className="h-4 w-4" />
                İK Uzmanının Gönderim İpucu
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {coverLetter.ipucu}
              </p>
            </Card>

            {/* CV - Ön Yazı Tutarlılık Kontrolü (#8 Genişletmesi) */}
            <Card className="p-5 bg-slate-900/60 border-indigo-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                  <CheckCircle2 className="h-4 w-4" />
                  CV ↔ Ön Yazı Tutarlılık Denetimi
                </div>
                <Badge
                  variant={
                    coverLetter.tutarlilikKontrolu?.uyumluMu !== false
                      ? "success"
                      : "warning"
                  }
                  className="text-[10px]"
                >
                  {coverLetter.tutarlilikKontrolu?.uyumluMu !== false
                    ? "Tam Tutarlı"
                    : "Kontrol Önerilir"}
                </Badge>
              </div>
              {coverLetter.tutarlilikKontrolu?.dogrulananDetaylar &&
              coverLetter.tutarlilikKontrolu.dogrulananDetaylar.length > 0 ? (
                <ul className="space-y-1 text-xs text-slate-300">
                  {coverLetter.tutarlilikKontrolu.dogrulananDetaylar.map(
                    (d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{d}</span>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  Ön yazıdaki unvan, şirket adı ve deneyim vurguları hedef ilan ve{" "}
                  {hasCv ? "yüklenen CV verinizle" : "ilan kriterleriyle"}{" "}
                  doğrulandı.
                </p>
              )}
              {coverLetter.tutarlilikKontrolu?.uyarilar &&
                coverLetter.tutarlilikKontrolu.uyarilar.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    {coverLetter.tutarlilikKontrolu.uyarilar.map((u, i) => (
                      <p key={i} className="text-[11px] text-amber-300">
                        ⚠️ {u}
                      </p>
                    ))}
                  </div>
                )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
