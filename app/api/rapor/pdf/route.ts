import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { JobAnalysis, CompanyInfo, InterviewSet, CvMatch } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get("analysisId");

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId parametresi gereklidir." },
        { status: 400 }
      );
    }

    const analysis = await db.analysis.findUnique({
      where: { id: analysisId },
      include: {
        cvUploads: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analiz kaydı bulunamadı." },
        { status: 404 }
      );
    }

    const job = analysis.jobAnalysis as unknown as JobAnalysis;
    const company = analysis.companyInfo as unknown as CompanyInfo | null;
    const interview = analysis.interviewSet as unknown as InterviewSet | null;
    const latestCv = analysis.cvUploads[0];
    const previousCv = analysis.cvUploads[1];
    const cvMatch = latestCv?.cvMatch as unknown as CvMatch | null;
    const prevCvMatch = previousCv?.cvMatch as unknown as CvMatch | null;

    // Türkçe karakterleri tam destekleyen, şık tasarımlı yazdırılabilir/PDF HTML belgesi
    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Mülakat Hazırlık Raporu — ${job.baslik} (${job.sirketAdi})</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    h1 { font-size: 24px; color: #0f172a; margin-bottom: 4px; }
    h2 { font-size: 18px; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
    h3 { font-size: 14px; color: #0f172a; margin-top: 14px; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #e0f2fe; color: #0369a1; margin-right: 4px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    .score-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; margin: 12px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .print-button {
      position: fixed; top: 16px; right: 16px; background: #2563eb; color: white;
      border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;
    }
    @media print {
      .print-button { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">🖨️ PDF Olarak Kaydet / Yazdır</button>

  <header style="margin-bottom: 20px;">
    <h1>${job.baslik}</h1>
    <div style="font-size: 15px; color: #475569; font-weight: 500;">${job.sirketAdi} ${job.lokasyon ? `• ${job.lokasyon}` : ""}</div>
    <div style="margin-top: 8px;">
      <span class="badge">Seviye: ${job.pozisyonSeviyesi}</span>
      <span class="badge">Çalışma Şekli: ${job.calismaSekli}</span>
      <span class="badge">Deneyim: ${job.deneyimYili.min || 0} - ${job.deneyimYili.max || "+"} Yıl</span>
    </div>
  </header>

  <h2>1. Pozisyon Özeti ve İstenen Nitelikler</h2>
  <p>${job.ozet}</p>
  
  <div class="grid">
    <div class="card">
      <h3 style="color: #b91c1c;">Zorunlu Nitelikler</h3>
      <ul>
        ${job.zorunluNitelikler.map((n) => `<li><strong>${n.ad}:</strong> ${n.aciklama}</li>`).join("")}
      </ul>
    </div>
    <div class="card">
      <h3 style="color: #0369a1;">Tercih Sebebi Beceriler</h3>
      <ul>
        ${job.tercihSebebiNitelikler.map((n) => `<li><strong>${n.ad}:</strong> ${n.aciklama}</li>`).join("")}
      </ul>
    </div>
  </div>

  <div style="margin-top: 8px;">
    <strong>ATS Anahtar Kelimeleri:</strong>
    ${job.anahtarKelimeler.map((k) => `<span class="badge" style="background:#f1f5f9;color:#334155;">${k}</span>`).join(" ")}
  </div>

  ${
    company
      ? `
  <h2>2. Şirket Araştırması ve Kültürü</h2>
  <div class="card">
    <p><strong>Genel Bilgi:</strong> ${company.ozet}</p>
    ${company.sektor ? `<p><strong>Sektör:</strong> ${company.sektor} | <strong>Merkez:</strong> ${company.merkez || "-"}</p>` : ""}
    ${company.sirketKulturu.length > 0 ? `<p><strong>Şirket Kültürü:</strong> ${company.sirketKulturu.join(", ")}</p>` : ""}
    ${company.mulakatIpuclari.length > 0 ? `<p><strong>Mülakat Taktikleri:</strong></p><ul>${company.mulakatIpuclari.map((t) => `<li>${t}</li>`).join("")}</ul>` : ""}
  </div>
  `
      : ""
  }

  ${
    cvMatch
      ? `
  <h2>3. CV Uyumluluk Analizi</h2>
  <div class="score-box">
    <h3 style="margin-top:0; color:#1d4ed8;">
      Genel Uyum Skoru: ${
        prevCvMatch
          ? `%${prevCvMatch.uyumSkoru} → %${cvMatch.uyumSkoru} (${
              cvMatch.uyumSkoru - prevCvMatch.uyumSkoru >= 0 ? "+" : ""
            }${cvMatch.uyumSkoru - prevCvMatch.uyumSkoru} puan)`
          : `%${cvMatch.uyumSkoru}`
      }
    </h3>
    <p><strong>Özet Değerlendirme:</strong> ${cvMatch.genelTavsiye}</p>
    <div>
      <span class="badge">Teknik: %${cvMatch.skorDagilimi.teknik}</span>
      <span class="badge">Deneyim: %${cvMatch.skorDagilimi.deneyim}</span>
      <span class="badge">Eğitim: %${cvMatch.skorDagilimi.egitim}</span>
      <span class="badge">Anahtar Kelime: %${cvMatch.skorDagilimi.anahtarKelime}</span>
    </div>
  </div>

  ${
    cvMatch.duzenlemeler.length > 0
      ? `
    <h3>CV Düzenleme ve İyileştirme Önerileri:</h3>
    ${cvMatch.duzenlemeler
      .map(
        (d, idx) => `
      <div class="card">
        <div><strong>#${idx + 1} [${d.bolum.toUpperCase()}] ${d.tur.toUpperCase()} (Öncelik: ${d.oncelik})</strong></div>
        <div style="color: #991b1b; text-decoration: line-through; margin: 4px 0;">${d.mevcutMetin || "(Eksik Metin)"}</div>
        <div style="color: #166534; font-weight: 600;">${d.onerilenMetin}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;"><em>Gerekçe:</em> ${d.gerekce}</div>
      </div>
    `
      )
      .join("")}
  `
      : ""
  }

  ${
    cvMatch.eksikNitelikler && cvMatch.eksikNitelikler.length > 0
      ? `
    <h3>Çalışılacaklar Listesi (Eksik Nitelik Eylem Planı):</h3>
    ${cvMatch.eksikNitelikler
      .map(
        (eksik) => `
      <div class="card">
        <div><strong>${eksik.nitelik} (Önem: ${eksik.onem}/5)</strong> — ${eksik.oneri}</div>
        ${eksik.kaynakOnerisi ? `<div style="margin-top:4px;"><strong>📚 Kaynak Önerisi:</strong> ${eksik.kaynakOnerisi}</div>` : ""}
        ${eksik.miniProjeFikri ? `<div><strong>🛠️ Mini Proje Fikri:</strong> ${eksik.miniProjeFikri}</div>` : ""}
        ${eksik.mulakatSavunmasi ? `<div style="color:#1e40af;"><strong>💬 Mülakat Savunması:</strong> "${eksik.mulakatSavunmasi}"</div>` : ""}
      </div>
    `
      )
      .join("")}
  `
      : ""
  }

  ${
    cvMatch.tutarlilikKontrolu && cvMatch.tutarlilikKontrolu.bulgular.length > 0
      ? `
    <h3>CV İçi Tutarlılık Kontrolü:</h3>
    ${cvMatch.tutarlilikKontrolu.bulgular
      .map(
        (b) => `
      <div class="card">
        <div><strong>[${b.tur.toUpperCase()}] (${b.ciddiyet}):</strong> ${b.aciklama}</div>
        <div><strong>Muhtemel Mülakat Sorusu:</strong> "${b.mulakatSorusu}"</div>
        <div style="color:#166534;"><strong>Savunma Önerisi:</strong> ${b.savunmaOnerisi}</div>
      </div>
    `
      )
      .join("")}
  `
      : ""
  }

  ${
    cvMatch.linkedinOnerileri &&
    (cvMatch.linkedinOnerileri.baslikOnerileri.length > 0 ||
      cvMatch.linkedinOnerileri.hakkindaOnerisi)
      ? `
    <h3>LinkedIn Profil Optimizasyonu:</h3>
    <div class="card">
      ${
        cvMatch.linkedinOnerileri.baslikOnerileri.length > 0
          ? `<p><strong>Önerilen LinkedIn Başlıkları (Headline):</strong></p><ul>${cvMatch.linkedinOnerileri.baslikOnerileri.map((h) => `<li>${h}</li>`).join("")}</ul>`
          : ""
      }
      ${
        cvMatch.linkedinOnerileri.hakkindaOnerisi
          ? `<p><strong>Hakkında (About) Metni:</strong><br/>${cvMatch.linkedinOnerileri.hakkindaOnerisi.replace(/\n/g, "<br/>")}</p>`
          : ""
      }
    </div>
  `
      : ""
  }

  ${
    cvMatch.githubAnalizi && cvMatch.githubAnalizi.oneCikanProjeler.length > 0
      ? `
    <h3>GitHub Portföy Analizi (@${cvMatch.githubAnalizi.kullaniciAdi}):</h3>
    ${cvMatch.githubAnalizi.oneCikanProjeler
      .map(
        (p) => `
      <div class="card">
        <div><strong>${p.repoAdi} (Uyum: %${p.uyumSkoru})</strong></div>
        <div>${p.nedenUygun}</div>
        <div style="color:#166534;margin-top:4px;"><strong>CV Maddesi:</strong> ${p.cvEklemeOnerisi}</div>
      </div>
    `
      )
      .join("")}
  `
      : ""
  }
  `
      : ""
  }

  ${
    interview
      ? `
  <h2>4. Örnek Mülakat Soruları ve STAR Yanıtları</h2>

  <h3>Teknik Sorular</h3>
  ${interview.teknik
    .map(
      (s, i) => `
    <div class="card">
      <strong>${i + 1}. ${s.soru}</strong> <span class="badge">${s.zorluk}</span>
      <p style="margin: 4px 0; color: #475569;"><em>Neden Sorulur:</em> ${s.nedenSorulur}</p>
      <div style="background: white; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; margin-top: 6px;">
        <strong>Örnek Cevap:</strong> ${s.ornekCevap}
      </div>
    </div>
  `
    )
    .join("")}

  <h3>Davranışsal Sorular (STAR Formatında)</h3>
  ${interview.davranissal
    .map(
      (s, i) => `
    <div class="card">
      <strong>${i + 1}. ${s.soru}</strong>
      <div style="background: white; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; margin-top: 6px;">
        <strong>Örnek STAR Cevabı:</strong><br/>
        ${s.ornekCevap.replace(/\n/g, "<br/>")}
      </div>
    </div>
  `
    )
    .join("")}

  ${
    interview.senaryolu.length > 0
      ? `
  <h3>Vaka ve Kriz Senaryoları</h3>
  ${interview.senaryolu
    .map(
      (s, i) => `
    <div class="card">
      <strong>${i + 1}. ${s.soru}</strong>
      <p style="background: #f1f5f9; padding: 6px; border-radius: 4px;"><strong>Senaryo:</strong> ${s.senaryo}</p>
      <p><strong>Örnek Çözüm Yaklaşımı:</strong> ${s.ornekCevap}</p>
    </div>
  `
    )
    .join("")}
  `
      : ""
  }
  `
      : ""
  }

  ${
    interview?.hikayeBankasi && interview.hikayeBankasi.length > 0
      ? `
  <h2>5. Kişisel STAR Hikâye Bankası (Story Bank)</h2>
  ${interview.hikayeBankasi
    .map(
      (st, i) => `
    <div class="card">
      <strong>#${i + 1} ${st.baslik} (${st.sirketVeyaProje})</strong>
      <p style="margin:4px 0;"><strong>Durum:</strong> ${st.durum} | <strong>Görev:</strong> ${st.gorev}</p>
      <p style="margin:4px 0;"><strong>Eylem:</strong> ${st.eylem}</p>
      <p style="margin:4px 0; color:#166534;"><strong>Sonuç:</strong> ${st.sonuc}</p>
    </div>
  `
    )
    .join("")}
  `
      : ""
  }

  ${
    interview?.onYazi
      ? `
  <h2>6. İlana Özel Ön Yazı (Cover Letter)</h2>
  <div class="card">
    <p><strong>Konu:</strong> ${interview.onYazi.konuBasligi}</p>
    <div style="white-space: pre-line; background: white; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">${interview.onYazi.icerik}</div>
  </div>
  `
      : ""
  }

  ${
    interview?.maasPazarlik
      ? `
  <h2>7. Maaş ve Pazarlık Hazırlığı Stratejisi</h2>
  <div class="card">
    <p><strong>Strateji Özeti:</strong> ${interview.maasPazarlik.stratejiOzeti}</p>
    ${
      interview.maasPazarlik.beklentiSorusuCevaplari.length > 0
        ? `<p><strong>"Maaş beklentiniz nedir?" Yanıt Senaryoları:</strong></p><ul>${interview.maasPazarlik.beklentiSorusuCevaplari
            .map((b) => `<li><strong>${b.senaryo}:</strong> "${b.ornekCevap}"</li>`)
            .join("")}</ul>`
        : ""
    }
    ${
      interview.maasPazarlik.pazarlikTaktikleri.length > 0
        ? `<p><strong>Pazarlık Taktikleri:</strong></p><ul>${interview.maasPazarlik.pazarlikTaktikleri
            .map((t) => `<li>${t}</li>`)
            .join("")}</ul>`
        : ""
    }
  </div>
  `
      : ""
  }

  <footer style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
    İş İlanı Analiz & Mülakat Hazırlık Platformu tarafından ${new Date().toLocaleDateString("tr-TR")} tarihinde oluşturuldu.
  </footer>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("PDF rapor oluşturma hatası:", error);
    return NextResponse.json(
      { error: "Rapor oluşturulurken bir hata oluştu." },
      { status: 500 }
    );
  }
}
