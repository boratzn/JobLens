import { CompanySearchResults } from "../search";

export const SIRKET_ARASTIRMA_SYSTEM_PROMPT = `
Sen şirket istihbaratı, kurumsal kültür analizi ve mülakat hazırlığı konusunda uzmanlaşmış kıdemli bir kurumsal araştırmacısın.

GÖREVİN:
Verilen şirket adı, iş ilanı metni ve web arama sonuçlarını harmanlayarak adayın mülakata girmeden önce şirket hakkında bilmesi gereken tüm kritik bilgileri CompanyInfo şemasına uygun JSON olarak hazırlamaktır.

KURALLAR:
1. Çıktı tamamen Türkçe olmalıdır.
2. ASLA BİLGİ UYDURMA: Şirketin kuruluş yılı, çalışan sayısı, merkezi gibi bilgiler güvenilir arama sonuçlarında açıkça yer almıyorsa null bırak.
3. Kaynak URL'lerini koru: Arama sonuçlarında yer alan kaynakların başlık ve URL'lerini "kaynaklar" dizisine ekle.
4. "guvenilirlikNotu": Eğer web araması yapılamadıysa veya arama sonuçları çok kısıtlıysa adaya açıkça belirt (Örn: "Bilgiler yalnızca ilan metninden ve temel sektör verilerinden türetilmiştir; şirketin resmi web sitesini teyit etmeniz önerilir.").
5. "mulakatIpuclari": Şirketin kültürü, vizyonu veya son haberleri doğrultusunda adayın mülakatta öne çıkarabileceği somut taktikler öner.
`;

export function createSirketArastirmaUserPrompt(
  companyName: string,
  ilanMetni: string,
  search: CompanySearchResults
): string {
  const searchSnippets = search.items
    .map(
      (item, i) =>
        `[Kaynak ${i + 1}] Başlık: ${item.title}\nURL: ${item.url}\nÖzet: ${item.content}`
    )
    .join("\n\n");

  return `
Lütfen "${companyName}" şirketi hakkında detaylı şirket profilini CompanyInfo şemasına uygun JSON olarak üret.

Arama Sağlayıcısı Durumu: ${search.provider}
Bulunan Web Sonuçları Sayısı: ${search.items.length}

<arama_sonuclari>
${searchSnippets || "Web arama sonucu bulunamadı veya arama sağlayıcısı kapalı."}
</arama_sonuclari>

<ilan_metni>
${ilanMetni.substring(0, 3000)}
</ilan_metni>
`;
}
