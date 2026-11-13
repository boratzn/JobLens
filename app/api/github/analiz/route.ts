import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Schemas from "@/lib/schemas";
import type {
  GitHubAnalysis,
  JobAnalysis,
  CvMatch,
} from "@/lib/schemas";
import { generateJSONWithRetry } from "@/lib/llm";

const FallbackGitHubAnalysisSchema = z.object({
  kullaniciAdi: z.string(),
  ozetDegerlendirme: z.string(),
  oneCikanProjeler: z
    .array(
      z.object({
        repoAdi: z.string(),
        repoUrl: z.string(),
        uyumSkoru: z.number().min(0).max(100),
        nedenUygun: z.string(),
        cvEklemeOnerisi: z.string(),
        mulakatAnlatimi: z.string(),
      })
    )
    .default([]),
  portfoyTavsiyeleri: z.array(z.string()).default([]),
});

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "github-analiz");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const { analysisId, githubUsername } = await request.json();

    if (!analysisId || !githubUsername) {
      return NextResponse.json(
        { error: "analysisId ve GitHub kullanıcı adı zorunludur." },
        { status: 400 }
      );
    }

    // URL veya @kullaniciadi yapıştırıldıysa kullanıcı adını ayıkla (github.com/user, https://github.com/user vb. dahil)
    const cleanUsername = String(githubUsername)
      .trim()
      .replace(/^@+/, "")
      .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
      .split(/[/?#\s]/)[0]
      .trim();

    if (!cleanUsername || !/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Geçerli bir GitHub kullanıcı adı giriniz (örn: kullaniciadi)." },
        { status: 400 }
      );
    }

    const analysis = await db.analysis.findUnique({
      where: { id: analysisId },
      include: {
        cvUploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "İlan analizi bulunamadı." },
        { status: 404 }
      );
    }

    // GitHub Public API'den repoları çek
    const ghRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(
        cleanUsername
      )}/repos?sort=updated&per_page=15`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "IlanAnaliz-Career-Coach/1.0",
        },
      }
    );

    if (!ghRes.ok) {
      if (ghRes.status === 404) {
        return NextResponse.json(
          { error: `"${cleanUsername}" adlı GitHub kullanıcısı bulunamadı.` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "GitHub profili alınırken bir sorun oluştu." },
        { status: 502 }
      );
    }

    const reposData = await ghRes.json();
    if (!Array.isArray(reposData) || reposData.length === 0) {
      return NextResponse.json(
        {
          error:
            "Bu GitHub profilinde herkese açık (public) bir proje/repo bulunamadı.",
        },
        { status: 400 }
      );
    }

    const nonForkRepos = reposData.filter((r: any) => !r.fork);
    const sourceRepos = nonForkRepos.length > 0 ? nonForkRepos : reposData;

    const repoSummaries = sourceRepos
      .slice(0, 12)
      .map((r: any) => ({
        name: r.name,
        url: r.html_url,
        description: r.description || "Açıklama yok",
        language: r.language || "Belirtilmemiş",
        topics: Array.isArray(r.topics) ? r.topics.join(", ") : "",
        stars: r.stargazers_count || 0,
        updatedAt: r.updated_at ? r.updated_at.substring(0, 10) : "",
      }));

    const jobAnalysis = analysis.jobAnalysis as unknown as JobAnalysis;
    const latestCv = analysis.cvUploads[0] || null;
    const cvMetni = latestCv?.cvMetni || "";

    const systemPrompt = `
Sen kıdemli bir yazılım mühendisliği yöneticisi (Engineering Manager) ve teknik işe alım uzmanısın.
Adayın GitHub profilindeki herkese açık repoları inceleyip hedef iş ilanıyla en çok örtüşen projeleri (CV'de unutulmuş veya yeterince vurgulanmamış olanlar dahil) seçeceksin.
Her öne çıkan proje için:
1. Neden bu ilanla uyumlu olduğunu,
2. CV'nin "Projeler" bölümüne doğrudan kopyalanabilecek güçlü bir maddeyi ("cvEklemeOnerisi"),
3. Teknik mülakatta bu projeyi anlatırken hangi mimari noktaları vurgulaması gerektiğini ("mulakatAnlatimi") Türkçe olarak üret.
`;

    const userPrompt = `
Hedef İlan: ${jobAnalysis.baslik} (${jobAnalysis.sirketAdi})
Seviye: ${jobAnalysis.pozisyonSeviyesi}
Aranan Teknik Beceriler: ${jobAnalysis.teknikBeceriler.join(", ")}
Zorunlu Nitelikler: ${jobAnalysis.zorunluNitelikler.map((n) => n.ad).join(", ")}

Adayın GitHub Kullanıcı Adı: ${cleanUsername}
GitHub Repoları:
<github_repolari>
${JSON.stringify(repoSummaries, null, 2)}
</github_repolari>

${
  cvMetni
    ? `Adayın Mevcut CV Metni (CV'de bahsedilmemiş ama ilana uygun repoları özellikle yakala):\n<cv_metni>\n${cvMetni.substring(0, 4000)}\n</cv_metni>`
    : ""
}

Lütfen GitHubAnalysisSchema formatında JSON üret.
`;

    const activeSchema =
      Schemas.GitHubAnalysisSchema || FallbackGitHubAnalysisSchema;

    const githubAnalizi = await generateJSONWithRetry<GitHubAnalysis>({
      system: systemPrompt,
      user: userPrompt,
      schema: activeSchema,
      temperature: 0.25,
    });

    if (latestCv && latestCv.cvMatch) {
      const updatedMatch: CvMatch = {
        ...(latestCv.cvMatch as unknown as CvMatch),
        githubAnalizi,
      };
      await db.cvUpload.update({
        where: { id: latestCv.id },
        data: {
          cvMatch: updatedMatch as any,
        },
      });
    }

    return NextResponse.json({
      githubAnalizi,
    });
  } catch (error: any) {
    console.error("GitHub analiz hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "GitHub portföy analizi yapılırken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
