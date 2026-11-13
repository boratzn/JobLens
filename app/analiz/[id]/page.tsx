import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAnonymousId } from "@/lib/anonymous";
import { AnalizView } from "@/components/analiz/AnalizView";
import { JobAnalysis, CompanyInfo, InterviewSet, CvMatch } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export default async function AnalizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anonymousId = await getAnonymousId();

  let analysis = null;
  try {
    analysis = await db.analysis.findUnique({
      where: { id },
      include: {
        cvUploads: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  } catch (error) {
    console.error("Analiz yükleme veritabanı hatası:", error);
    notFound();
  }

  if (!analysis) {
    notFound();
  }

  const latestCvRecord = analysis.cvUploads[0] || null;
  const previousCvRecord = analysis.cvUploads[1] || null;

  const initialAnalysis = {
    id: analysis.id,
    url: analysis.url,
    kaynakSite: analysis.kaynakSite,
    createdAt: analysis.createdAt.toISOString(),
    jobAnalysis: analysis.jobAnalysis as unknown as JobAnalysis,
    companyInfo: (analysis.companyInfo as unknown as CompanyInfo) || null,
    interviewSet: (analysis.interviewSet as unknown as InterviewSet) || null,
    latestCv: latestCvRecord
      ? {
          id: latestCvRecord.id,
          dosyaAdi: latestCvRecord.dosyaAdi,
          cvMetni: latestCvRecord.cvMetni,
          cvMatch: (latestCvRecord.cvMatch as unknown as CvMatch) || null,
        }
      : null,
    previousCv: previousCvRecord
      ? {
          id: previousCvRecord.id,
          dosyaAdi: previousCvRecord.dosyaAdi,
          createdAt: previousCvRecord.createdAt.toISOString(),
          cvMatch: (previousCvRecord.cvMatch as unknown as CvMatch) || null,
        }
      : null,
  };

  return <AnalizView initialAnalysis={initialAnalysis} />;
}
