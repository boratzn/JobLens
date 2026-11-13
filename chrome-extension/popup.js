document.addEventListener("DOMContentLoaded", async () => {
  const serverUrlInput = document.getElementById("serverUrl");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const statusEl = document.getElementById("status");

  chrome.storage.local.get(["serverUrl"], (res) => {
    if (res.serverUrl) {
      serverUrlInput.value = res.serverUrl;
    }
  });

  serverUrlInput.addEventListener("change", () => {
    chrome.storage.local.set({ serverUrl: serverUrlInput.value.trim() });
  });

  analyzeBtn.addEventListener("click", async () => {
    const baseUrl = serverUrlInput.value.trim().replace(/\/+$/, "");
    chrome.storage.local.set({ serverUrl: baseUrl });

    analyzeBtn.disabled = true;
    statusEl.className = "status";
    statusEl.textContent = "Sayfadaki ilan metni okunuyor...";

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        throw new Error("Aktif sekme bulunamadı.");
      }

      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection()?.toString()?.trim();
          const bodyText = document.body?.innerText || "";
          return {
            title: document.title,
            url: window.location.href,
            text: selection && selection.length > 100 ? selection : bodyText.slice(0, 14000),
          };
        },
      });

      const pageData = injectionResults?.[0]?.result;
      if (!pageData || !pageData.text || pageData.text.length < 50) {
        throw new Error("Bu sayfada yeterli uzunlukta ilan metni bulunamadı.");
      }

      statusEl.textContent = "Yapay zekâ ilanı analiz ediyor (10-15 sn)...";

      const response = await fetch(`${baseUrl}/api/ilan/metin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metin: `İlan Başlığı: ${pageData.title}\nKaynak Link: ${pageData.url}\n\n${pageData.text}`,
          kaynakUrl: pageData.url,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.id) {
        throw new Error(data.error || "Analiz sırasında hata oluştu.");
      }

      statusEl.textContent = "Analiz tamamlandı! Sonuç sayfası açılıyor...";
      chrome.tabs.create({ url: `${baseUrl}/analiz/${data.id}` });
    } catch (err) {
      statusEl.className = "status error";
      statusEl.textContent = err.message || "Beklenmeyen bir hata oluştu.";
    } finally {
      analyzeBtn.disabled = false;
    }
  });
});
