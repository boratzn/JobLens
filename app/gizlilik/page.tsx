import React from "react";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Trash2, Server, Globe2, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GizlilikPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16 space-y-8">
      {/* Başlık */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
          <Shield className="h-4 w-4" />
          6698 Sayılı KVKK ve Gizlilik Politikası
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">
          Kişisel Verilerin Korunması ve Gizlilik
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          İlanAnaliz Platformu olarak kişisel verilerinizin güvenliğine ve gizliliğinize en üst düzeyde önem veriyoruz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center bg-slate-900/60 border-white/[0.08]">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-sm text-white">
            Dosya Diske Kaydedilmez
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Yüklediğiniz PDF/Word CV dosyası sunucu diskine yazılmaz; yalnızca bellekte işlenir.
          </p>
        </Card>

        <Card className="p-6 text-center bg-slate-900/60 border-white/[0.08]">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
            <Trash2 className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-sm text-white">
            Otomatik & Anında Silme
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Çıkarılan metin 30 gün içinde cron ile otomatik silinir; dilediğiniz an tek tıkla silebilirsiniz.
          </p>
        </Card>

        <Card className="p-6 text-center bg-slate-900/60 border-white/[0.08]">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
            <Server className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-sm text-white">
            AB (Frankfurt) Sunucuları
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Veritabanı ve serverless altyapı Avrupa Birliği (Frankfurt / fra1) bölgesinde barındırılır.
          </p>
        </Card>
      </div>

      <Card className="p-6 sm:p-10 space-y-6 text-sm text-slate-300 leading-relaxed bg-slate-900/60 border-white/[0.08]">
        <div>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            1. Veri Sorumlusu ve Kapsam
          </h3>
          <p>
            Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, İlanAnaliz Platformu üzerinden işlenen kişisel veriler hakkında kullanıcıları bilgilendirmek amacıyla hazırlanmıştır.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-400" />
            2. İşlenen Kişisel Veriler ve İşlenme Amacı
          </h3>
          <p>
            Kullanıcı tarafından platforma yüklenen CV (özgeçmiş) belgelerinden ayrıştırılan metin verileri (eğitim, iş deneyimleri, beceriler, sertifikalar ve iletişim bilgileri), yalnızca kullanıcının talep ettiği iş ilanıyla karşılaştırma yapmak, uyumluluk skoru hesaplamak ve mülakat sorularını kişiselleştirmek amacıyla işlenir.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-blue-400" />
            3. Verilerin Yurt Dışına Aktarımı ve LLM Katmanı
          </h3>
          <p>
            Platform, analiz ve içerik üretiminde yapay zekâ sağlayıcılarının (Anthropic Claude ve/veya Google Gemini) kurumsal API hizmetlerini kullanmaktadır. Bu doğrultuda verileriniz, analiz süresince şifreli bağlantılar (TLS) üzerinden model sağlayıcılarına gönderilmekte ve işlenmektedir. Sağlayıcıların API kullanım koşulları kapsamında verileriniz model eğitimi için kullanılmamaktadır.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-blue-400" />
            4. Saklama Süresi ve Verilerin Silinmesi
          </h3>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>Yüklenen ham CV dosyaları diske veya bulut depolamaya ASLA kaydedilmez; yalnızca RAM'de metne çevrilir.</li>
            <li>Çıkarılan metin ve karşılaştırma sonuçları en fazla 30 gün boyunca saklanır ve günlük otomatik temizlik görevi (Vercel Cron) ile kalıcı olarak silinir.</li>
            <li>Kullanıcı, analiz sayfasındaki "CV'mi Şimdi Sil" butonunu kullanarak veya geçmiş sayfasından analizi silerek verilerini dilediği an veritabanından kalıcı olarak kaldırabilir.</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-white/[0.08] flex justify-center">
          <Link href="/">
            <Button variant="gradient" size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
