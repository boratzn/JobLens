"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { History, Shield, Briefcase, KeyRound, X, Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const [showByokModal, setShowByokModal] = useState(false);
  const [byokProvider, setByokProvider] = useState<"gemini" | "anthropic">(
    "gemini"
  );
  const [byokKey, setByokKey] = useState("");
  const [byokModel, setByokModel] = useState("");
  const [hasActiveByok, setHasActiveByok] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Oturum / Cihazlar Arası Eşitleme (Sync Code) state'leri
  const [syncId, setSyncId] = useState("");
  const [targetSyncId, setTargetSyncId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [copiedSyncId, setCopiedSyncId] = useState(false);

  useEffect(() => {
    try {
      const savedProv = localStorage.getItem("byok_provider");
      const savedKey = localStorage.getItem("byok_key");
      const savedMod = localStorage.getItem("byok_model");
      if (savedProv === "anthropic" || savedProv === "gemini") {
        setByokProvider(savedProv);
      }
      if (savedKey) {
        setByokKey(savedKey);
        setHasActiveByok(true);
      }
      if (savedMod) {
        setByokModel(savedMod);
      }
    } catch {
      // localStorage kapalıysa yoksay
    }
  }, []);

  useEffect(() => {
    if (showByokModal && !syncId) {
      fetch("/api/oturum")
        .then((r) => r.json())
        .then((data) => {
          if (data.anonymousId) setSyncId(data.anonymousId);
        })
        .catch(() => {});
    }
  }, [showByokModal, syncId]);

  const handleSyncSession = async () => {
    if (!targetSyncId.trim()) return;
    setIsSyncing(true);
    setSyncSuccess(null);
    try {
      const res = await fetch("/api/oturum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAnonymousId: targetSyncId.trim(),
          mergeExisting: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.anonymousId) {
        setSyncId(data.anonymousId);
        setTargetSyncId("");
        setSyncSuccess(
          `Oturum eşitlendi! Toplam ${data.analysisCount ?? 0} başvuru kaydı bu cihaza bağlandı.`
        );
      }
    } catch {
      // hata yoksay
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveByok = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = byokKey.trim();
    const cleanModel = byokModel.trim();

    if (!cleanKey) {
      handleClearByok();
      return;
    }

    localStorage.setItem("byok_provider", byokProvider);
    localStorage.setItem("byok_key", cleanKey);
    localStorage.setItem("byok_model", cleanModel);

    const maxAge = 60 * 60 * 24 * 30; // 30 gün
    document.cookie = `byok_provider=${encodeURIComponent(
      byokProvider
    )}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `byok_key=${encodeURIComponent(
      cleanKey
    )}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `byok_model=${encodeURIComponent(
      cleanModel
    )}; path=/; max-age=${maxAge}; SameSite=Lax`;

    setHasActiveByok(true);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      setShowByokModal(false);
    }, 1000);
  };

  const handleClearByok = () => {
    localStorage.removeItem("byok_provider");
    localStorage.removeItem("byok_key");
    localStorage.removeItem("byok_model");
    document.cookie = "byok_provider=; path=/; max-age=0";
    document.cookie = "byok_key=; path=/; max-age=0";
    document.cookie = "byok_model=; path=/; max-age=0";
    setByokKey("");
    setByokModel("");
    setHasActiveByok(false);
    setShowByokModal(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-3 font-extrabold text-lg sm:text-xl text-white transition-opacity"
          >
            <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 shadow-lg shadow-blue-500/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-200">
              <Briefcase className="h-5 w-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight flex items-center gap-1 leading-none">
                İlan
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Analiz
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal tracking-wide mt-1">
                AI Mülakat & CV Koçu
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Briefcase className="h-4 w-4 text-blue-400" />
              <span>Yeni İlan</span>
            </Link>

            <Link
              href="/gecmis"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <History className="h-4 w-4 text-slate-400" />
              <span>Başvurularım & Geçmiş</span>
            </Link>

            <Link
              href="/gizlilik"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
            >
              <Shield className="h-4 w-4 text-slate-400" />
              <span>KVKK</span>
            </Link>

            <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => setShowByokModal(true)}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                hasActiveByok
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
              }`}
              title="Kendi Gemini veya Claude API Anahtarınızı Kullanın (BYOK)"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{hasActiveByok ? "Kendi API Anahtarım Aktif" : "API Anahtarım (BYOK)"}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* BYOK (Kendi API Anahtarını Getir - #12) Modalı */}
      {showByokModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  Kendi API Anahtarını Getir (BYOK)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowByokModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Kendi <strong>Google Gemini</strong> veya <strong>Anthropic Claude</strong> API anahtarınızı girerek sunucu istek limitlerine (rate limit) takılmadan sınırsız analiz yapabilirsiniz. Anahtarınız yalnızca kendi tarayıcınızda saklanır.
            </p>

            <form onSubmit={handleSaveByok} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1.5">
                  Sağlayıcı Seçin:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setByokProvider("gemini")}
                    className={`py-2.5 rounded-xl font-bold border cursor-pointer ${
                      byokProvider === "gemini"
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-slate-950 border-white/10 text-slate-400"
                    }`}
                  >
                    Google Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => setByokProvider("anthropic")}
                    className={`py-2.5 rounded-xl font-bold border cursor-pointer ${
                      byokProvider === "anthropic"
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-slate-950 border-white/10 text-slate-400"
                    }`}
                  >
                    Anthropic Claude
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  API Anahtarı ({byokProvider === "gemini" ? "AIza..." : "sk-ant-..."}):
                </label>
                <Input
                  type="password"
                  value={byokKey}
                  onChange={(e) => setByokKey(e.target.value)}
                  placeholder="API anahtarınızı buraya yapıştırın"
                  className="bg-slate-950 border-white/15 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  Model Adı (Opsiyonel):
                </label>
                <Input
                  type="text"
                  value={byokModel}
                  onChange={(e) => setByokModel(e.target.value)}
                  placeholder={
                    byokProvider === "gemini"
                      ? "Varsayılan: gemini-3.5-flash-lite"
                      : "Varsayılan: claude-3-5-sonnet-20241022"
                  }
                  className="bg-slate-950 border-white/15 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {hasActiveByok ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearByok}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Anahtarı Kaldır (Varsayılana Dön)
                  </Button>
                ) : (
                  <span />
                )}

                <Button type="submit" variant="gradient" size="sm">
                  {savedToast ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Kaydedildi
                    </>
                  ) : (
                    "Kaydet ve Etkinleştir"
                  )}
                </Button>
              </div>
            </form>

            {/* Cihazlar Arası Oturum & Başvuru Geçmişi Eşitleme */}
            <div className="pt-4 border-t border-white/10 space-y-3 text-xs">
              <div className="font-bold text-slate-200 flex items-center justify-between">
                <span>Cihazlar Arası Başvuru Eşitleme Kodu</span>
                {syncId && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(syncId);
                      setCopiedSyncId(true);
                      setTimeout(() => setCopiedSyncId(false), 2000);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSyncId ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" /> Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Kodumu Kopyala
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Başvuru takip panelinizi ve CV analiz geçmişinizi başka bir bilgisayar veya telefona taşımak için aşağıdaki eşitleme kodunuzu kullanabilirsiniz:
              </p>
              {syncId && (
                <div className="p-2 rounded-lg bg-slate-950 border border-white/10 font-mono text-[11px] text-slate-300 select-all truncate">
                  {syncId}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={targetSyncId}
                  onChange={(e) => setTargetSyncId(e.target.value)}
                  placeholder="Başka cihazdaki eşitleme kodunu yapıştırın..."
                  className="bg-slate-950 border-white/15 text-xs h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleSyncSession}
                  isLoading={isSyncing}
                  disabled={isSyncing || !targetSyncId.trim()}
                  className="h-9 px-3 text-xs shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Eşitle
                </Button>
              </div>
              {syncSuccess && (
                <p className="text-[11px] text-emerald-400 font-medium">
                  ✓ {syncSuccess}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
