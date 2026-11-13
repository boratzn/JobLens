import Link from "next/link";
import { Shield, Sparkles, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-slate-950 py-10 px-4 sm:px-6 mt-auto">
      <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <span className="font-semibold text-slate-200">
            İlanAnaliz Platformu
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            Vercel Serverless + Supabase Frankfurt
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/gizlilik"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            KVKK Aydınlatma Metni & Gizlilik
          </Link>
          <Link
            href="/gecmis"
            className="hover:text-white transition-colors"
          >
            Geçmiş Analizlerim
          </Link>
        </div>
      </div>
    </footer>
  );
}
