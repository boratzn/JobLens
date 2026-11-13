import React from "react";
import { JobAnalysis } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Key,
  Languages,
  Award,
  ListChecks,
  Sparkles,
} from "lucide-react";

interface IlanOzetiTabProps {
  job: JobAnalysis;
}

export function IlanOzetiTab({ job }: IlanOzetiTabProps) {
  return (
    <div className="space-y-6">
      {/* Kırmızı Bayraklar / Uyarılar */}
      {job.kirmiziBayraklar && job.kirmiziBayraklar.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                Aday İçin Dikkat Edilmesi Gereken Noktalar (Kırmızı Bayraklar)
              </h4>
              <ul className="mt-2 space-y-1 text-xs sm:text-sm text-amber-200/90 list-disc list-inside leading-relaxed">
                {job.kirmiziBayraklar.map((kb, idx) => (
                  <li key={idx}>{kb}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Pozisyon Başlık & Hızlı Özet Kartı */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-blue-950/30 shadow-2xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl sm:text-3xl text-white font-extrabold tracking-tight">
                {job.baslik}
              </CardTitle>
              <p className="text-base font-semibold text-blue-400 mt-1 flex items-center gap-2">
                <span>{job.sirketAdi}</span>
                {job.lokasyon && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 text-sm font-normal flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.lokasyon}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="text-xs py-1 px-3">
                <Briefcase className="h-3.5 w-3.5 mr-1" />
                {job.pozisyonSeviyesi.toUpperCase()}
              </Badge>
              <Badge variant="secondary" className="text-xs py-1 px-3">
                {job.calismaSekli.toUpperCase()}
              </Badge>
              <Badge variant="secondary" className="text-xs py-1 px-3">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {job.deneyimYili.min !== null || job.deneyimYili.max !== null
                  ? `${job.deneyimYili.min || 0} - ${job.deneyimYili.max || "+"} Yıl Deneyim`
                  : "Deneyim Belirtilmemiş"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
            {job.ozet}
          </p>
        </CardContent>
      </Card>

      {/* Zorunlu & Tercih Sebebi Nitelikler Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zorunlu Nitelikler */}
        <Card className="border-red-500/20 bg-slate-900/50">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-red-400">
              <CheckCircle2 className="h-5 w-5" />
              Zorunlu Nitelikler ({job.zorunluNitelikler.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {job.zorunluNitelikler.map((n, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-white/[0.06] bg-slate-950/50 hover:border-red-500/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-white text-sm">
                    {n.ad}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/25">
                    Önem: {n.onemDerecesi}/5
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {n.aciklama}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tercih Sebebi Nitelikler */}
        <Card className="border-blue-500/20 bg-slate-900/50">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-400">
              <Sparkles className="h-5 w-5" />
              Tercih Sebebi Nitelikler ({job.tercihSebebiNitelikler.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {job.tercihSebebiNitelikler.length > 0 ? (
              job.tercihSebebiNitelikler.map((n, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-white/[0.06] bg-slate-950/50 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-white text-sm">
                      {n.ad}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                      Önem: {n.onemDerecesi}/5
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {n.aciklama}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                İlanda ayrı bir tercih sebebi nitelik belirtilmemiş.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ATS Anahtar Kelimeleri & Beceriler */}
      <Card className="border-amber-500/20 bg-slate-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-300">
            <Key className="h-4 w-4 text-amber-400" />
            ATS (Aday Takip Sistemi) Anahtar Kelimeleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {job.anahtarKelimeler.map((kw, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 shadow-sm"
              >
                #{kw}
              </span>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Teknik Beceriler
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {job.teknikBeceriler.map((tb, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tb}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Davranışsal Beceriler
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {job.davranissalBeceriler.map((db, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {db}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diller, Sertifikalar, Sorumluluklar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/60">
          <div className="flex items-center gap-2 font-bold text-sm mb-2 text-blue-400">
            <Languages className="h-4 w-4" />
            Dil Gereksinimleri
          </div>
          {job.diller && job.diller.length > 0 ? (
            <ul className="text-xs space-y-1 text-slate-300">
              {job.diller.map((d, i) => (
                <li key={i}>
                  <strong className="text-white">{d.dil}:</strong> {d.seviye}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Belirtilmemiş</p>
          )}
        </Card>

        <Card className="p-4 bg-slate-900/60">
          <div className="flex items-center gap-2 font-bold text-sm mb-2 text-emerald-400">
            <Award className="h-4 w-4" />
            Eğitim & Sertifikalar
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            {job.egitim && <p><strong>Eğitim:</strong> {job.egitim}</p>}
            {job.sertifikalar && job.sertifikalar.length > 0 ? (
              <p><strong>Sertifikalar:</strong> {job.sertifikalar.join(", ")}</p>
            ) : (
              !job.egitim && <p className="text-slate-500">Belirtilmemiş</p>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:col-span-2 bg-slate-900/60">
          <div className="flex items-center gap-2 font-bold text-sm mb-2 text-purple-400">
            <ListChecks className="h-4 w-4" />
            Temel Sorumluluklar
          </div>
          {job.sorumluluklar && job.sorumluluklar.length > 0 ? (
            <ul className="text-xs space-y-1 text-slate-300 list-disc list-inside">
              {job.sorumluluklar.slice(0, 4).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Detaylı sorumluluk listesi ilanda ayrıştırılmamış.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
