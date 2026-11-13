import React from "react";
import { CompanyInfo } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Globe,
  Users,
  MapPin,
  Calendar,
  Lightbulb,
  Newspaper,
  ExternalLink,
  ShieldAlert,
  Search,
  Sparkles,
} from "lucide-react";

interface SirketTabProps {
  company: CompanyInfo | null;
  isLoading: boolean;
  onFetchCompany: () => void;
  error?: string | null;
}

export function SirketTab({
  company,
  isLoading,
  onFetchCompany,
  error,
}: SirketTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-slate-900/60 border border-white/5 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-900/60 border border-white/5 rounded-2xl" />
          <div className="h-64 bg-slate-900/60 border border-white/5 rounded-2xl" />
        </div>
        <div className="flex items-center justify-center p-8 gap-3 text-slate-400">
          <Sparkles className="h-5 w-5 animate-spin text-blue-400" />
          <span>Şirket web istihbaratı ve güncel haberler taranıyor...</span>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <Card className="text-center py-16 px-6 bg-slate-900/40 border-white/[0.08]">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
          <Building2 className="h-7 w-7" />
        </div>
        <CardTitle className="text-xl font-bold mb-2 text-white">Şirket İstihbaratı ve Mülakat Taktikleri</CardTitle>
        <p className="text-slate-400 max-w-md mx-auto text-sm mb-6 leading-relaxed">
          Bu şirket hakkında sektör bilgisi, kültür, son haberler ve şirkete özel mülakat tüyolarını yapay zekâ ile araştırın.
        </p>
        {error && (
          <div className="max-w-md mx-auto mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {error}
          </div>
        )}
        <Button onClick={onFetchCompany} size="lg" variant="gradient">
          <Search className="h-4 w-4 mr-2" />
          Şirketi Araştır
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Güvenilirlik Bildirimi */}
      {company.guvenilirlikNotu && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 flex items-start gap-3 backdrop-blur-md">
          <ShieldAlert className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs sm:text-sm text-blue-200/90 leading-relaxed">
            {company.guvenilirlikNotu}
          </p>
        </div>
      )}

      {/* Şirket Ana Profil Kartı */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/30 shadow-2xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-blue-500/20 border border-white/20">
                {company.ad.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl text-white font-extrabold">{company.ad}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5 font-medium">
                  {company.sektor && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Building2 className="h-3.5 w-3.5 text-blue-400" />
                      {company.sektor}
                    </span>
                  )}
                  {company.merkez && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {company.merkez}
                    </span>
                  )}
                  {company.calisanSayisi && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {company.calisanSayisi} Çalışan
                    </span>
                  )}
                  {company.kurulusYili && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Kuruluş: {company.kurulusYili}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {company.webSitesi && (
              <a
                href={
                  company.webSitesi.startsWith("http")
                    ? company.webSitesi
                    : `https://${company.webSitesi}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer shadow-sm"
              >
                <Globe className="h-3.5 w-3.5" />
                Resmi Web Sitesi
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            {company.ozet}
          </p>
        </CardContent>
      </Card>

      {/* Kültür ve Mülakat Taktikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mülakat Taktikleri */}
        <Card className="border-amber-500/20 bg-slate-900/60">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-300">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              Bu Şirkete Özel Mülakat Taktikleri
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {company.mulakatIpuclari.map((ipucu, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-200/90 leading-relaxed"
              >
                {ipucu}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Şirket Kültürü & Ürünler */}
        <Card className="border-indigo-500/20 bg-slate-900/60">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-300">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Kültür & Değerler
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Öne Çıkan Değerler
              </h5>
              <div className="flex flex-wrap gap-2">
                {company.sirketKulturu.map((k, i) => (
                  <Badge key={i} variant="secondary" className="text-xs py-1">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>

            {company.urunVeHizmetler.length > 0 && (
              <div className="pt-3 border-t border-white/[0.06]">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Ürün & Hizmet Alanları
                </h5>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {company.urunVeHizmetler.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Son Haberler */}
      {company.sonHaberler && company.sonHaberler.length > 0 && (
        <Card className="border-blue-500/20 bg-slate-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-300">
              <Newspaper className="h-5 w-5 text-blue-400" />
              Son Haberler & Gelişmeler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.sonHaberler.map((h, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-white/[0.06] bg-slate-950/60"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h6 className="font-bold text-sm text-white">
                    {h.baslik}
                  </h6>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {h.kaynak} {h.tarih ? `• ${h.tarih}` : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {h.ozet}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Doğrulanmış Kaynak Linkleri */}
      {company.kaynaklar && company.kaynaklar.length > 0 && (
        <div className="pt-2">
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            İncelenen Web Kaynakları ({company.kaynaklar.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {company.kaynaklar.map((k, i) => (
              <a
                key={i}
                href={k.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.05] border border-white/10 hover:border-blue-400/40 hover:text-blue-300 hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <span>{k.baslik || "Web Kaynağı"}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
