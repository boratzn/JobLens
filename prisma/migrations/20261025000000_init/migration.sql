-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "url" TEXT,
    "urlHash" TEXT,
    "kaynakSite" TEXT NOT NULL,
    "hamMetin" TEXT NOT NULL,
    "jobAnalysis" JSONB NOT NULL,
    "companyInfo" JSONB,
    "interviewSet" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvUpload" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "dosyaAdi" TEXT NOT NULL,
    "cvMetni" TEXT NOT NULL,
    "cvMatch" JSONB,
    "silinmeTarihi" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CvUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Analysis_anonymousId_createdAt_idx" ON "Analysis"("anonymousId", "createdAt");

-- CreateIndex
CREATE INDEX "Analysis_urlHash_createdAt_idx" ON "Analysis"("urlHash", "createdAt");

-- CreateIndex
CREATE INDEX "CvUpload_silinmeTarihi_idx" ON "CvUpload"("silinmeTarihi");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "CvUpload" ADD CONSTRAINT "CvUpload_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase RLS (Bölüm 5.3)
ALTER TABLE "Analysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CvUpload" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
