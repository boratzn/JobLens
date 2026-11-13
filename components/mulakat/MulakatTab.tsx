import React, { useState, useEffect } from "react";
import {
  InterviewSet,
  Soru,
  SenaryoSoru,
  PracticeFeedback,
  StarStory,
} from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PlusCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  BookOpen,
  Star,
  Edit3,
  Save,
  CornerDownRight,
  Lightbulb,
  Mic,
  MicOff,
  Volume2,
  Banknote,
} from "lucide-react";

interface MulakatTabProps {
  analysisId: string;
  interviewSet: InterviewSet | null;
  hasCv: boolean;
  cvMetni: string | null;
  isLoading: boolean;
  onGenerateSet: () => void;
  onGenerateMore: (kategori: string) => Promise<void>;
  isGeneratingMore: boolean;
  onStoryBankUpdated?: (stories: StarStory[]) => void;
  onSwitchToCvTab?: () => void;
}

export function MulakatTab({
  analysisId,
  interviewSet,
  hasCv,
  cvMetni,
  isLoading,
  onGenerateSet,
  onGenerateMore,
  isGeneratingMore,
  onStoryBankUpdated,
  onSwitchToCvTab,
}: MulakatTabProps) {
  const [activeCategory, setActiveCategory] = useState<
    | "teknik"
    | "davranissal"
    | "senaryolu"
    | "sirketeOzel"
    | "adayinSoracaklari"
    | "hikayeBankasi"
    | "maasPazarlik"
    | "sesliProva"
  >("teknik");

  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  // Pratik Modu & Takip (Follow-up) Soruları State'leri
  const [practiceQuestion, setPracticeQuestion] = useState<{
    id: string;
    soru: string;
    ornekCevap: string;
  } | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [practiceHistory, setPracticeHistory] = useState<
    { soru: string; cevap: string; puan?: number }[]
  >([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState<PracticeFeedback | null>(null);

  // Sesli Mülakat Provası (Web Speech API) State'leri (#11)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<"main" | "followup">("main");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(true);
  const [voiceStepIndex, setVoiceStepIndex] = useState<number>(0);
  const recognitionRef = React.useRef<any>(null);

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechError("Tarayıcınız sesli okuma (Web Speech API) özelliğini desteklemiyor.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = speechRate;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoiceRecognition = (target: "main" | "followup") => {
    setSpeechError(null);
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        "Tarayıcınız ses tanıma (Web Speech API) özelliğini desteklemiyor. Chrome veya Edge kullanmayı deneyin."
      );
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsRecording(false);
      return;
    }

    stopSpeaking();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setRecordingTarget(target);
    setIsRecording(true);

    recognition.onresult = (event: any) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          chunk += event.results[i][0].transcript + " ";
        }
      }
      const cleanChunk = chunk.trim();
      if (cleanChunk) {
        if (target === "main") {
          setPracticeAnswer((prev) =>
            prev ? `${prev} ${cleanChunk}` : cleanChunk
          );
        } else {
          setFollowUpAnswer((prev) =>
            prev ? `${prev} ${cleanChunk}` : cleanChunk
          );
        }
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setSpeechError("Ses algılanamadı veya mikrofon izni verilmedi. Lütfen tarayıcı adres çubuğundan mikrofon iznini kontrol edin.");
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // STAR Hikâye Bankası State'leri
  const [stories, setStories] = useState<StarStory[]>(
    interviewSet?.hikayeBankasi || []
  );
  const [isGeneratingStories, setIsGeneratingStories] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<StarStory | null>(null);
  const [isSavingStory, setIsSavingStory] = useState(false);

  useEffect(() => {
    if (interviewSet?.hikayeBankasi) {
      setStories(interviewSet.hikayeBankasi);
    }
  }, [interviewSet?.hikayeBankasi]);

  const toggleAnswer = (key: string) => {
    setExpandedAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartPractice = (
    id: string,
    soru: string,
    ornekCevap: string,
    prefillStory?: StarStory
  ) => {
    setPracticeQuestion({ id, soru, ornekCevap });
    if (prefillStory) {
      setPracticeAnswer(
        `[Durum]: ${prefillStory.durum}\n[Görev]: ${prefillStory.gorev}\n[Eylem]: ${prefillStory.eylem}\n[Sonuç]: ${prefillStory.sonuc}`
      );
    } else {
      setPracticeAnswer("");
    }
    setFollowUpAnswer("");
    setPracticeHistory([]);
    setPracticeFeedback(null);
  };

  const handleEvaluatePractice = async () => {
    if (!practiceQuestion || practiceAnswer.trim().length < 10) return;
    setIsEvaluating(true);
    try {
      const res = await fetch("/api/mulakat/degerlendir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soru: practiceQuestion.soru,
          ornekCevap: practiceQuestion.ornekCevap,
          kullaniciCevabi: practiceAnswer,
          gecmisDiyalog: practiceHistory,
        }),
      });
      const data = await res.json();
      if (data.feedback) {
        setPracticeFeedback(data.feedback);
        if (activeCategory === "sesliProva" && autoSpeakEnabled) {
          speakText(
            `Değerlendirme tamamlandı. Puanınız 10 üzerinden ${data.feedback.puan}. Takip sorum şu: ${data.feedback.takipSorusu}`
          );
        }
      }
    } catch (err) {
      console.error("Pratik değerlendirme hatası:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleEvaluateFollowUp = async () => {
    if (
      !practiceQuestion ||
      !practiceFeedback?.takipSorusu ||
      followUpAnswer.trim().length < 10
    ) {
      return;
    }
    setIsEvaluating(true);
    try {
      const currentTurnQuestion =
        practiceHistory.length === 0
          ? practiceQuestion.soru
          : practiceFeedback.takipSorusu;
      const currentTurnAnswer =
        practiceHistory.length === 0 ? practiceAnswer : followUpAnswer;

      const updatedHistory = [
        ...practiceHistory,
        {
          soru: currentTurnQuestion,
          cevap: currentTurnAnswer,
          puan: practiceFeedback.puan,
        },
      ];

      const res = await fetch("/api/mulakat/degerlendir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soru: practiceFeedback.takipSorusu,
          ornekCevap: practiceQuestion.ornekCevap,
          kullaniciCevabi: followUpAnswer,
          gecmisDiyalog: updatedHistory,
        }),
      });
      const data = await res.json();
      if (data.feedback) {
        setPracticeHistory(updatedHistory);
        setPracticeFeedback(data.feedback);
        setFollowUpAnswer("");
        if (activeCategory === "sesliProva" && autoSpeakEnabled) {
          speakText(
            `Takip cevabınız için puanınız 10 üzerinden ${data.feedback.puan}. Yeni takip sorum: ${data.feedback.takipSorusu}`
          );
        }
      }
    } catch (err) {
      console.error("Takip sorusu değerlendirme hatası:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // STAR Hikâye Bankası Üretimi
  const handleGenerateStoryBank = async () => {
    setIsGeneratingStories(true);
    setStoryError(null);
    try {
      const res = await fetch("/api/mulakat/hikaye-bankasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          cvMetni: cvMetni || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "STAR Hikâye Bankası oluşturulurken hata oluştu."
        );
      }
      setStories(data.hikayeBankasi || []);
      onStoryBankUpdated?.(data.hikayeBankasi || []);
    } catch (err: any) {
      setStoryError(err.message);
    } finally {
      setIsGeneratingStories(false);
    }
  };

  const handleSaveEditedStory = async () => {
    if (!editDraft) return;
    setIsSavingStory(true);
    try {
      const updatedList = stories.map((st) =>
        st.id === editDraft.id ? editDraft : st
      );
      const res = await fetch("/api/mulakat/hikaye-bankasi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          hikayeBankasi: updatedList,
        }),
      });
      const data = await res.json();
      if (res.ok && data.hikayeBankasi) {
        setStories(data.hikayeBankasi);
        onStoryBankUpdated?.(data.hikayeBankasi);
        setEditingStoryId(null);
        setEditDraft(null);
      }
    } catch (err) {
      console.error("Hikâye kaydetme hatası:", err);
    } finally {
      setIsSavingStory(false);
    }
  };

  // Davranışsal soru için en uygun STAR hikâyesini bulma
  const findMatchingStoryForQuestion = (
    soruObj: Soru,
    idx: number
  ): StarStory | null => {
    if (!stories || stories.length === 0) return null;
    const qLower = soruObj.soru.toLowerCase();
    const skillLower = (soruObj.ilgiliNitelik || "").toLowerCase();

    // 1. Doğrudan eslesenSorular içinde soru metni geçiyor mu?
    const directMatch = stories.find((st) =>
      st.eslesenSorular?.some(
        (es) =>
          qLower.includes(es.toLowerCase().substring(0, 20)) ||
          es.toLowerCase().includes(qLower.substring(0, 20))
      )
    );
    if (directMatch) return directMatch;

    // 2. Yetkinlik eşleşmesi var mı?
    if (skillLower) {
      const skillMatch = stories.find((st) =>
        st.yetkinlikler?.some(
          (y) =>
            y.toLowerCase().includes(skillLower) ||
            skillLower.includes(y.toLowerCase())
        )
      );
      if (skillMatch) return skillMatch;
    }

    // 3. Fallback: sırayla dağıt
    return stories[idx % stories.length] || null;
  };

  if (isLoading) {
    return <MulakatLoadingState />;
  }

  if (!interviewSet || (!interviewSet.teknik?.length && !interviewSet.davranissal?.length)) {
    return (
      <Card className="text-center py-16 px-6 bg-slate-900/40 border-white/[0.08]">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
          <HelpCircle className="h-7 w-7" />
        </div>
        <CardTitle className="text-xl font-bold mb-2 text-white">Mülakat Hazırlık Soruları</CardTitle>
        <p className="text-slate-400 max-w-md mx-auto text-sm mb-6 leading-relaxed">
          Teknik sorular, STAR formatında davranışsal sorular, kriz vaka senaryoları ve işverene sorulacak akıllıca soruları üretin.
        </p>
        <Button onClick={onGenerateSet} size="lg" variant="gradient">
          <Sparkles className="h-4 w-4 mr-2" />
          Mülakat Sorularını Üret
        </Button>
      </Card>
    );
  }

  const allVoiceQuestions = [
    ...(interviewSet.teknik || []).map((q, i) => ({
      id: `v-teknik-${i}`,
      kategoriLabel: "Teknik",
      soru: q.soru,
      ornekCevap: q.ornekCevap,
      ipucu: q.nedenSorulur,
    })),
    ...(interviewSet.davranissal || []).map((q, i) => ({
      id: `v-davranissal-${i}`,
      kategoriLabel: "Davranışsal (STAR)",
      soru: q.soru,
      ornekCevap: q.ornekCevap,
      ipucu: q.nedenSorulur,
    })),
    ...(interviewSet.senaryolu || []).map((q, i) => ({
      id: `v-senaryolu-${i}`,
      kategoriLabel: "Vaka / Kriz",
      soru: `${q.senaryo} — ${q.soru}`,
      ornekCevap: q.ornekCevap,
      ipucu: q.nedenSorulur,
    })),
    ...(interviewSet.sirketeOzel || []).map((q, i) => ({
      id: `v-sirket-${i}`,
      kategoriLabel: "Şirkete Özel",
      soru: q.soru,
      ornekCevap: q.ornekCevap,
      ipucu: q.nedenSorulur,
    })),
  ];

  const startVoiceStudioQuestion = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(idx, allVoiceQuestions.length - 1));
    setVoiceStepIndex(safeIdx);
    const q = allVoiceQuestions[safeIdx];
    if (q) {
      setPracticeQuestion({
        id: q.id,
        soru: q.soru,
        ornekCevap: q.ornekCevap,
      });
      setPracticeAnswer("");
      setFollowUpAnswer("");
      setPracticeHistory([]);
      setPracticeFeedback(null);
      if (autoSpeakEnabled) {
        speakText(q.soru);
      }
    }
  };

  // Sesli Mülakat Provası özelliği şimdilik gizlendi (İleride açmak için true yapılabilir)
  const SHOW_VOICE_INTERVIEW = false;

  const categories = [
    ...(SHOW_VOICE_INTERVIEW
      ? ([
          {
            id: "sesliProva" as const,
            label: "🎙️ Sesli Mülakat Provası",
            count: allVoiceQuestions.length,
          },
        ] as const)
      : []),
    { id: "teknik" as const, label: "Teknik Sorular", count: interviewSet.teknik?.length || 0 },
    { id: "davranissal" as const, label: "Davranışsal (STAR)", count: interviewSet.davranissal?.length || 0 },
    { id: "hikayeBankasi" as const, label: "⭐ STAR Hikâye Bankası", count: stories.length },
    { id: "senaryolu" as const, label: "Senaryolu / Vaka", count: interviewSet.senaryolu?.length || 0 },
    { id: "sirketeOzel" as const, label: "Şirkete Özel", count: interviewSet.sirketeOzel?.length || 0 },
    { id: "adayinSoracaklari" as const, label: "İşverene Sorulacaklar", count: interviewSet.adayinSoracaklari?.length || 0 },
    {
      id: "maasPazarlik" as const,
      label: "💰 Maaş & Pazarlık",
      count: interviewSet.maasPazarlik?.beklentiSorusuCevaplari?.length || 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Kategori Alt Sekmeleri */}
      <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-white/[0.08] backdrop-blur-md">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeCategory === cat.id
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {cat.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeCategory === cat.id
                  ? "bg-white/20 text-white"
                  : "bg-white/[0.08] text-slate-400"
              }`}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Pratik Modu & Takip (Follow-up) Soruları Paneli */}
      {practiceQuestion && (
        <Card className="border-blue-500/30 bg-gradient-to-br from-slate-900/90 to-blue-950/40 shadow-2xl animate-in fade-in">
          <CardHeader className="pb-3 border-b border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base text-blue-300 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                Mülakat Pratik & Takip Sorusu Simülasyonu
              </CardTitle>
              <div className="flex items-center gap-2">
                {SHOW_VOICE_INTERVIEW && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => speakText(practiceQuestion.soru)}
                    className="text-xs h-8"
                  >
                    <Volume2 className="h-3.5 w-3.5 mr-1 text-blue-400" />
                    Soruyu Sesli Dinle
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPracticeQuestion(null)}
                >
                  Kapat
                </Button>
              </div>
            </div>
            <p className="text-sm font-semibold text-white mt-2 leading-relaxed">
              Ana Soru: "{practiceQuestion.soru}"
            </p>
            {SHOW_VOICE_INTERVIEW && speechError && (
              <p className="text-xs text-amber-300 mt-1">{speechError}</p>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Önceki Diyalog Turları */}
            {practiceHistory.length > 0 && (
              <div className="space-y-2.5 pb-2 border-b border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Önceki Mülakat Turları ({practiceHistory.length})
                </span>
                {practiceHistory.map((turn, tIdx) => (
                  <div
                    key={tIdx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-blue-300">
                      <span>
                        Tur {tIdx + 1}: {turn.soru}
                      </span>
                      {turn.puan && (
                        <Badge variant="outline" className="text-[10px]">
                          Puan: {turn.puan}/10
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-300 whitespace-pre-line">
                      {turn.cevap}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* İlk Cevap Kutusu (Henüz takip turuna geçilmediyse) */}
            {practiceHistory.length === 0 && (
              <>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Cevabınızı buraya yazın:
                    </label>
                    {SHOW_VOICE_INTERVIEW && (
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          isRecording && recordingTarget === "main"
                            ? "destructive"
                            : "secondary"
                        }
                        onClick={() => toggleVoiceRecognition("main")}
                        className="h-7 px-2.5 text-xs"
                      >
                        {isRecording && recordingTarget === "main" ? (
                          <>
                            <MicOff className="h-3.5 w-3.5 mr-1 animate-pulse" />
                            Dinleniyor... (Durdur)
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                            Sözlü Cevap Ver (Mikrofon)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={practiceAnswer}
                    onChange={(e) => setPracticeAnswer(e.target.value)}
                    placeholder="Örnek: Bu durumla önceki projemde karşılaştığımda öncelikle..."
                    rows={4}
                    className="bg-slate-950/80 border-white/10"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleEvaluatePractice}
                    disabled={isEvaluating || practiceAnswer.trim().length < 10}
                    isLoading={isEvaluating}
                    variant="gradient"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Cevabımı Puanla & Takip Sorusu Al
                  </Button>
                </div>
              </>
            )}

            {/* Değerlendirme Sonucu + Mülakatçının Takip (Follow-up) Sorusu */}
            {practiceFeedback && (
              <div className="mt-4 p-5 rounded-2xl bg-slate-950/80 border border-white/[0.08] space-y-5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">
                    Yapay Zekâ Koç Puanı {practiceHistory.length > 0 ? `(Tur ${practiceHistory.length + 1})` : ""}:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-black text-blue-400">
                      {practiceFeedback.puan}
                    </span>
                    <span className="text-xs text-slate-500">/ 10</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                    <div className="font-bold flex items-center gap-1.5 mb-1.5 text-emerald-300">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Güçlü Yönleriniz
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {practiceFeedback.olumluYonler.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    <div className="font-bold flex items-center gap-1.5 mb-1.5 text-amber-300">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Geliştirilmesi Gerekenler
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {practiceFeedback.gelistirilmesiGerekenler.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 text-xs">
                  <span className="font-bold text-slate-200 block mb-1">
                    Örnek İyileştirilmiş Yanıt Şablonu:
                  </span>
                  <p className="text-slate-300 leading-relaxed font-normal">
                    {practiceFeedback.ornekIyilestirme}
                  </p>
                </div>

                {/* Takip (Follow-up) Sorusu Kartı */}
                {practiceFeedback.takipSorusu && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <CornerDownRight className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300 block">
                            🎙️ Mülakatçının Derinleştirici Takip Sorusu (Follow-up)
                          </span>
                          <p className="text-sm font-bold text-white leading-snug">
                            "{practiceFeedback.takipSorusu}"
                          </p>
                          {practiceFeedback.takipIpucu && (
                            <p className="text-xs text-indigo-200/80 flex items-center gap-1.5 pt-1">
                              <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                              <span>
                                <strong>İpucu:</strong> {practiceFeedback.takipIpucu}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {SHOW_VOICE_INTERVIEW && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => speakText(practiceFeedback.takipSorusu)}
                            className="h-7 px-2 text-xs text-indigo-300"
                          >
                            <Volume2 className="h-3.5 w-3.5 mr-1" />
                            Dinle
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              isRecording && recordingTarget === "followup"
                                ? "destructive"
                                : "secondary"
                            }
                            onClick={() => toggleVoiceRecognition("followup")}
                            className="h-7 px-2 text-xs"
                          >
                            {isRecording && recordingTarget === "followup" ? (
                              <>
                                <MicOff className="h-3.5 w-3.5 mr-1 animate-pulse" />
                                Durdur
                              </>
                            ) : (
                              <>
                                <Mic className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                                Sesli Yanıtla
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 space-y-2.5">
                      <Textarea
                        value={followUpAnswer}
                        onChange={(e) => setFollowUpAnswer(e.target.value)}
                        placeholder="Mülakatçının takip sorusuna cevabınızı buraya yazın..."
                        rows={3}
                        className="bg-slate-950/90 border-indigo-500/30 text-xs sm:text-sm"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="gradient"
                          onClick={handleEvaluateFollowUp}
                          disabled={
                            isEvaluating || followUpAnswer.trim().length < 10
                          }
                          isLoading={isEvaluating}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Takip Sorusunu Yanıtla & Puanı Güncelle
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Canlı Sesli Mülakat Provası Stüdyosu (#11) */}
      {activeCategory === "sesliProva" ? (
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-slate-900/95 via-indigo-950/50 to-slate-900/95 border-indigo-500/30 space-y-5 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg transition-all ${
                    isSpeaking
                      ? "bg-emerald-600 animate-pulse shadow-emerald-500/30"
                      : isRecording
                      ? "bg-red-600 animate-pulse shadow-red-500/30"
                      : "bg-gradient-to-tr from-indigo-600 to-blue-600 shadow-indigo-500/20"
                  }`}
                >
                  {isRecording ? (
                    <Mic className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    🎙️ Canlı Sesli Mülakat Provası Stüdyosu
                    <Badge variant="success" className="text-[10px]">
                      Ücretsiz Tarayıcı Ses Motoru (TTS & STT)
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Ekstra hiçbir kurulum veya ücretli API gerekmez. Yapay zekâ mülakatçınız soruyu sesli okur, siz mikrofonla sözlü cevap verirsiniz; cevabınız puanlanır ve takip sorusu sesli olarak sorulur.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSpeakEnabled}
                    onChange={(e) => setAutoSpeakEnabled(e.target.checked)}
                    className="rounded border-white/20 bg-slate-800 text-indigo-600 h-3.5 w-3.5"
                  />
                  <span>Otomatik Sesli Oku</span>
                </label>

                <select
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-300 text-xs"
                >
                  <option value={0.9}>Hız: 0.9x (Yavaş)</option>
                  <option value={1.0}>Hız: 1.0x (Normal)</option>
                  <option value={1.15}>Hız: 1.15x (Canlı)</option>
                </select>
              </div>
            </div>

            {allVoiceQuestions.length > 0 && (
              <div className="space-y-4">
                {/* Soru Seçici Şerit */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-300">
                    Soru {voiceStepIndex + 1} / {allVoiceQuestions.length} —{" "}
                    <span className="text-white">
                      {allVoiceQuestions[voiceStepIndex]?.kategoriLabel}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={voiceStepIndex === 0}
                      onClick={() =>
                        startVoiceStudioQuestion(voiceStepIndex - 1)
                      }
                      className="h-8 px-3 text-xs"
                    >
                      ← Önceki Soru
                    </Button>
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() =>
                        startVoiceStudioQuestion(
                          (voiceStepIndex + 1) % allVoiceQuestions.length
                        )
                      }
                      className="h-8 px-3 text-xs"
                    >
                      Sonraki Soruya Geç →
                    </Button>
                  </div>
                </div>

                {/* Aktif Sesli Soru Kartı */}
                <div className="p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-base sm:text-lg font-bold text-white leading-snug">
                      "{allVoiceQuestions[voiceStepIndex]?.soru}"
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          speakText(
                            allVoiceQuestions[voiceStepIndex]?.soru || ""
                          )
                        }
                        className="text-xs h-9"
                      >
                        <Volume2 className="h-4 w-4 mr-1.5 text-blue-400" />
                        Soruyu Sesli Oku
                      </Button>
                      {isSpeaking && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={stopSpeaking}
                          className="text-xs h-9 text-amber-300"
                        >
                          Sustur
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    <strong>Mülakatçının Beklentisi:</strong>{" "}
                    {allVoiceQuestions[voiceStepIndex]?.ipucu}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      size="lg"
                      variant={
                        isRecording && recordingTarget === "main"
                          ? "destructive"
                          : "gradient"
                      }
                      onClick={() => {
                        const q = allVoiceQuestions[voiceStepIndex];
                        if (q && practiceQuestion?.id !== q.id) {
                          setPracticeQuestion({
                            id: q.id,
                            soru: q.soru,
                            ornekCevap: q.ornekCevap,
                          });
                          setPracticeFeedback(null);
                          setPracticeHistory([]);
                        }
                        toggleVoiceRecognition("main");
                      }}
                      className="text-xs sm:text-sm font-bold rounded-xl"
                    >
                      {isRecording && recordingTarget === "main" ? (
                        <>
                          <MicOff className="h-4 w-4 mr-2 animate-pulse" />
                          Kaydı Bitir (Konuşmanız Yazıya Aktarılıyor...)
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Mikrofonu Aç ve Sözlü Cevapla
                        </>
                      )}
                    </Button>

                    {!practiceQuestion && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startVoiceStudioQuestion(voiceStepIndex)}
                        className="text-xs"
                      >
                        Bu Soruyu Pratik Paneline Yükle
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : activeCategory === "maasPazarlik" ? (
        <div className="space-y-5">
          {!interviewSet.maasPazarlik ? (
            <Card className="p-10 text-center bg-slate-900/50 border-white/[0.08] space-y-4">
              <Banknote className="h-10 w-10 text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">
                  Pozisyona Özel Maaş & Pazarlık Stratejisi
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  "Maaş beklentiniz nedir?" sorusuna erken aşamada, teklif aşamasında ve yan hak pazarlığında nasıl yaklaşmanız gerektiğini oluşturun.
                </p>
              </div>
              <Button
                variant="gradient"
                onClick={() => onGenerateMore("maasPazarlik")}
                isLoading={isGeneratingMore}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Maaş & Pazarlık Rehberini Oluştur
              </Button>
            </Card>
          ) : (
            <div className="space-y-5">
              <Card className="p-6 bg-gradient-to-br from-slate-900/90 to-emerald-950/30 border-emerald-500/25 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-base">
                  <Banknote className="h-5 w-5" />
                  Pozisyon ve Kıdeme Göre Genel Pazarlık Stratejisi
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {interviewSet.maasPazarlik.stratejiOzeti}
                </p>
              </Card>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">
                  "Maaş Beklentiniz Nedir?" Sorusuna Senaryolu Yanıt Şablonları
                </h4>
                <div className="grid grid-cols-1 gap-3.5">
                  {interviewSet.maasPazarlik.beklentiSorusuCevaplari.map(
                    (item, idx) => (
                      <Card
                        key={idx}
                        className="p-5 bg-slate-900/60 border-white/[0.08] space-y-2"
                      >
                        <Badge variant="outline" className="text-xs text-blue-300">
                          Senaryo #{idx + 1}: {item.senaryo}
                        </Badge>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-white/[0.06]">
                          "{item.ornekCevap}"
                        </p>
                      </Card>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <Card className="p-5 bg-slate-900/60 border-emerald-500/20 space-y-2">
                  <strong className="text-emerald-300 block font-bold">
                    💡 Pazarlık Taktikleri
                  </strong>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                    {interviewSet.maasPazarlik.pazarlikTaktikleri.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5 bg-slate-900/60 border-blue-500/20 space-y-2">
                  <strong className="text-blue-300 block font-bold">
                    🎁 Yan Hak Müzakere Kalemleri
                  </strong>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                    {interviewSet.maasPazarlik.yanHakMuzakeresi.map((y, i) => (
                      <li key={i}>{y}</li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5 bg-slate-900/60 border-red-500/20 space-y-2">
                  <strong className="text-red-300 block font-bold">
                    ⚠️ Kaçınılması Gereken Hatalar
                  </strong>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                    {interviewSet.maasPazarlik.kacinilacakHatalar.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          )}
        </div>
      ) : activeCategory === "hikayeBankasi" ? (
        <div className="space-y-5">
          <Card className="p-6 bg-gradient-to-br from-slate-900/90 to-indigo-950/30 border-indigo-500/25">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Kişisel STAR Hikâye Bankası (Story Bank)
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Hazır ezber cevaplar yerine kendi CV'nizdeki gerçek iş ve proje deneyimlerinden çıkarılan 5–8 adet yapılandırılmış STAR (Durum, Görev, Eylem, Sonuç) hikâyesi. Her davranışsal soruya hangi kişisel hikâyenizle cevap verebileceğiniz otomatik eşleştirilir.
                </p>
              </div>

              <div className="shrink-0">
                {hasCv ? (
                  <Button
                    onClick={handleGenerateStoryBank}
                    isLoading={isGeneratingStories}
                    disabled={isGeneratingStories}
                    variant="gradient"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {stories.length > 0
                      ? "Hikâye Bankasını Yeniden Oluştur"
                      : "CV'mden STAR Hikâyeleri Çıkar"}
                  </Button>
                ) : (
                  <Button
                    onClick={onSwitchToCvTab}
                    variant="secondary"
                    className="border border-amber-500/40 text-amber-300"
                  >
                    Önce CV Sekmesinden CV Yükleyin
                  </Button>
                )}
              </div>
            </div>

            {storyError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{storyError}</span>
              </div>
            )}
          </Card>

          {stories.length === 0 ? (
            <Card className="p-10 text-center bg-slate-900/40 border-white/[0.08]">
              <BookOpen className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">
                Henüz STAR Hikâyesi Çıkarılmadı
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {hasCv
                  ? "Yukarıdaki 'CV'mden STAR Hikâyeleri Çıkar' butonuna tıklayarak deneyimlerinizi davranışsal mülakatlara hazır hale getirin."
                  : "CV'nizdeki deneyimlerden kişisel hikâye bankası oluşturmak için önce CV Uyumluluk sekmesinden CV'nizi yükleyin."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {stories.map((st, idx) => {
                const isEditing = editingStoryId === st.id && editDraft;
                return (
                  <Card
                    key={st.id || idx}
                    className="p-5 sm:p-6 bg-slate-900/70 border-white/10 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-[10px]">
                            Hikâye #{idx + 1}
                          </Badge>
                          <span className="text-xs font-semibold text-blue-400">
                            {st.sirketVeyaProje}
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-bold text-white mt-1">
                          {st.baslik}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingStoryId(null);
                                setEditDraft(null);
                              }}
                              className="text-xs"
                            >
                              İptal
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={handleSaveEditedStory}
                              isLoading={isSavingStory}
                              className="text-xs"
                            >
                              <Save className="h-3.5 w-3.5 mr-1" />
                              Kaydet
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingStoryId(st.id);
                              setEditDraft({ ...st });
                            }}
                            className="text-xs"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" />
                            Düzenle
                          </Button>
                        )}
                      </div>
                    </div>

                    {isEditing && editDraft ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="font-bold text-slate-300 block mb-1">
                            Başlık
                          </label>
                          <Input
                            value={editDraft.baslik}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, baslik: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-300 block mb-1">
                            Şirket / Proje
                          </label>
                          <Input
                            value={editDraft.sirketVeyaProje}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                sirketVeyaProje: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="font-bold text-blue-300 block mb-1">
                            S — Durum (Situation)
                          </label>
                          <Textarea
                            rows={2}
                            value={editDraft.durum}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, durum: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="font-bold text-indigo-300 block mb-1">
                            T — Görev (Task)
                          </label>
                          <Textarea
                            rows={2}
                            value={editDraft.gorev}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, gorev: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="font-bold text-amber-300 block mb-1">
                            A — Eylem (Action)
                          </label>
                          <Textarea
                            rows={3}
                            value={editDraft.eylem}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, eylem: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="font-bold text-emerald-300 block mb-1">
                            R — Sonuç (Result & Metrikler)
                          </label>
                          <Textarea
                            rows={3}
                            value={editDraft.sonuc}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, sonuc: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                          <strong className="text-blue-400 block mb-1">
                            S — Durum (Situation):
                          </strong>
                          <p className="text-slate-300 leading-relaxed">{st.durum}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                          <strong className="text-indigo-400 block mb-1">
                            T — Görev (Task):
                          </strong>
                          <p className="text-slate-300 leading-relaxed">{st.gorev}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                          <strong className="text-amber-400 block mb-1">
                            A — Eylem (Action):
                          </strong>
                          <p className="text-slate-300 leading-relaxed">{st.eylem}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <strong className="text-emerald-300 block mb-1">
                            R — Sonuç (Result):
                          </strong>
                          <p className="text-emerald-100 leading-relaxed">{st.sonuc}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-semibold mr-1">
                          Kanıtlanan Yetkinlikler:
                        </span>
                        {st.yetkinlikler?.map((y, yIdx) => (
                          <Badge key={yIdx} variant="outline" className="text-[10px]">
                            {y}
                          </Badge>
                        ))}
                      </div>

                      {st.eslesenSorular?.length > 0 && (
                        <div className="text-[11px] text-indigo-300">
                          <strong>Kullanılabileceği Sorular:</strong>{" "}
                          {st.eslesenSorular.slice(0, 2).join(" • ")}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Soru Listesi */
        <div className="space-y-4">
          {activeCategory === "davranissal" && stories.length === 0 && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-indigo-200">
                <strong className="text-white block mb-0.5">
                  ⭐ Kişisel STAR Hikâye Eşleştirmesi
                </strong>
                CV'nizdeki deneyimlerden 5–8 adet STAR hikâyesi çıkararak her davranışsal soruya kendi gerçek projelerinizle nasıl yanıt vereceğinizi eşleştirebilirsiniz.
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveCategory("hikayeBankasi")}
                className="shrink-0 text-xs border border-indigo-500/40 text-indigo-300"
              >
                <Star className="h-3.5 w-3.5 mr-1 text-amber-400" />
                STAR Hikâye Bankasını Aç
              </Button>
            </div>
          )}

          {activeCategory === "adayinSoracaklari" ? (
            interviewSet.adayinSoracaklari?.map((item, idx) => (
              <Card key={idx} className="p-5 bg-slate-900/60 border-white/[0.08]">
                <div className="flex items-start gap-3">
                  <span className="h-8 w-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-bold text-base text-white leading-snug">
                      "{item.soru}"
                    </h4>
                    <div className="p-3.5 rounded-xl bg-slate-950/60 text-xs text-slate-300 border border-white/[0.06] leading-relaxed">
                      <strong className="text-indigo-300 block mb-0.5">
                        Neden Güçlü Bir İzlenim Bırakır:
                      </strong>
                      {item.nedenIyi}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            ((interviewSet[activeCategory] as (Soru | SenaryoSoru)[]) || []).map(
              (soru, idx) => {
                const questionKey = `${activeCategory}-${idx}`;
                const isExpanded = !!expandedAnswers[questionKey];
                const senaryo = (soru as SenaryoSoru).senaryo;
                const matchedStory =
                  activeCategory === "davranissal"
                    ? findMatchingStoryForQuestion(soru, idx)
                    : null;

                return (
                  <Card
                    key={idx}
                    className="bg-slate-900/60 border-white/[0.08] hover:border-white/15 transition-all"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="h-8 w-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center font-bold text-xs text-blue-300 shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-base text-white leading-snug">
                              {soru.soru}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge
                                variant={
                                  soru.zorluk === "zor"
                                    ? "destructive"
                                    : soru.zorluk === "orta"
                                    ? "warning"
                                    : "success"
                                }
                                className="text-[11px] capitalize"
                              >
                                {soru.zorluk}
                              </Badge>
                              {soru.ilgiliNitelik && (
                                <Badge variant="outline" className="text-[11px]">
                                  {soru.ilgiliNitelik}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleStartPractice(
                              questionKey,
                              soru.soru,
                              soru.ornekCevap
                            )
                          }
                          className="shrink-0 text-xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1 text-blue-400" />
                          Pratik Yap
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      {/* Kişisel STAR Hikâyesi Eşleşme Kutusu */}
                      {matchedStory && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-amber-300 flex items-center gap-1.5">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              Bu Soruda Kendi Hikâyeni Kullan: "{matchedStory.baslik}" ({matchedStory.sirketVeyaProje})
                            </span>
                            <p className="text-slate-300 line-clamp-2">
                              <strong>Eylem & Sonuç:</strong> {matchedStory.eylem} → {matchedStory.sonuc}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStartPractice(
                                questionKey,
                                soru.soru,
                                soru.ornekCevap,
                                matchedStory
                              )
                            }
                            className="shrink-0 text-[11px] border-amber-500/40 text-amber-200 hover:bg-amber-500/20"
                          >
                            Bu Hikâyeyle Pratik Yap
                          </Button>
                        </div>
                      )}

                      {senaryo && (
                        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
                          <strong className="block mb-1 font-bold text-purple-300">
                            Vaka Senaryosu:
                          </strong>
                          {senaryo}
                        </div>
                      )}

                      <p className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">
                          Mülakatçının Amacı:
                        </span>{" "}
                        {soru.nedenSorulur}
                      </p>

                      <div className="pt-1">
                        <button
                          onClick={() => toggleAnswer(questionKey)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              Örnek Cevabı Gizle
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              İdeal Örnek Cevabı İncele (STAR Formatı)
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] space-y-3 text-xs leading-relaxed animate-in fade-in">
                            <div>
                              <strong className="block text-slate-200 font-bold mb-1">
                                Örnek İdeal Cevap:
                              </strong>
                              <div className="text-slate-300 whitespace-pre-line font-normal">
                                {soru.ornekCevap}
                              </div>
                            </div>

                            {soru.cevapIpuclari?.length > 0 && (
                              <div className="pt-2 border-t border-white/[0.06]">
                                <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Cevap Verirken Dikkat Edilecekler:
                                </span>
                                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                                  {soru.cevapIpuclari.map((ipucu, i) => (
                                    <li key={i}>{ipucu}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {soru.kacinilacaklar?.length > 0 && (
                              <div className="pt-2 border-t border-white/[0.06]">
                                <span className="font-bold text-red-400 flex items-center gap-1 mb-1">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Kaçınılması Gereken Hatalar:
                                </span>
                                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                                  {soru.kacinilacaklar.map((hata, i) => (
                                    <li key={i}>{hata}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            )
          )}

          {/* Daha Fazla Soru Üret */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => onGenerateMore(activeCategory)}
              isLoading={isGeneratingMore}
              disabled={isGeneratingMore}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Bu Kategoride Daha Fazla Soru Üret
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MulakatLoadingState() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { title: "İlan nitelikleri ve teknik gereksinimler taranıyor", done: seconds >= 3, active: seconds < 3 },
    { title: "Kıdem seviyesine uygun teknik sorular kurgulanıyor", done: seconds >= 6, active: seconds >= 3 && seconds < 6 },
    { title: "STAR formatında örnek cevaplar ve senaryolar yazılıyor", done: seconds >= 10, active: seconds >= 6 && seconds < 10 },
    { title: "Mülakat ipuçları ve tuzak soru analizleri derleniyor", done: seconds >= 14, active: seconds >= 10 },
  ];

  const progressPercent = Math.min(15 + seconds * 7, 95);

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border border-indigo-500/20 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-10 shadow-2xl shadow-indigo-500/10 text-center">
        {/* Glow arka plan efekti */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          {/* İkon & Dönen AI Halkası */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 animate-spin opacity-25 blur-sm"
              style={{ animationDuration: "6s" }}
            />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/30 via-indigo-600/30 to-purple-600/30 border border-white/20 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Yapay Zekâ Mülakat Setinizi Hazırlıyor...
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              İlanın aradığı nitelikler, teknik yığın ve kıdem seviyesine göre özelleştirilmiş teknik, STAR davranışsal ve senaryolu sorular oluşturuluyor.
            </p>
          </div>

          {/* İlerleme Çubuğu */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Hazırlık Sürüyor ({seconds} sn)
              </span>
              <span className="text-slate-400 font-mono">%{progressPercent}</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Adım Adım İlerleme Listesi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2">
            {steps.map((st, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs transition-all ${
                  st.done
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : st.active
                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-200 shadow-sm"
                    : "bg-slate-900/40 border-white/5 text-slate-500"
                }`}
              >
                {st.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : st.active ? (
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className="truncate">{st.title}</span>
              </div>
            ))}
          </div>

          {/* Bilgilendirme Notu */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-blue-300">Neden birkaç saniye sürüyor?</p>
              <p className="text-slate-400 leading-relaxed">
                Yapay zekâ sadece yüzeysel bir soru listesi çıkarmıyor; her soru için <strong>örnek ideal yanıtları (STAR adımları)</strong>, <strong>değerlendirme kriterlerini</strong> ve <strong>mülakat tuzaklarını</strong> formüle ediyor. Bu işlem genellikle 8–15 saniye sürer.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Arka Planda Bekleyen Kart İskeletleri */}
      <div className="space-y-4 opacity-30 pointer-events-none">
        <div className="h-32 bg-slate-900/60 border border-white/5 rounded-2xl animate-pulse" />
        <div className="h-32 bg-slate-900/60 border border-white/5 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

