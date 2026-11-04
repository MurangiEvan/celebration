(() => {
  const image = document.getElementById("poster-image");
  const pdf = document.getElementById("poster-pdf");
  const placeholder = document.getElementById("poster-placeholder");
  const download = document.getElementById("poster-download");
  const downloadLabel = document.getElementById("download-label");
  const imageCandidates = [
    "poster/birthday programme.png",
    "poster/birthday poster.png",
    ...["jpg", "png", "webp", "jpeg", "avif"].map((extension) => `public/poster/birthday-poster.${extension}`)
  ];
  let qrPng = "";
  let qrSvg = "";

  const setPoster = (url, kind) => {
    placeholder.hidden = true;
    download.href = url;
    download.hidden = false;
    if (kind === "image") {
      image.hidden = false;
      image.src = url;
      download.download = url.split("/").pop();
      downloadLabel.textContent = "Download original";
    } else {
      pdf.hidden = false;
      pdf.src = url;
      download.removeAttribute("download");
      download.target = "_blank";
      download.rel = "noopener";
      downloadLabel.textContent = "Open original PDF";
    }
  };

  const tryImages = (index = 0) => {
    if (index >= imageCandidates.length) {
      tryPdf();
      return;
    }
    const url = imageCandidates[index];
    const probe = new Image();
    probe.onload = () => setPoster(url, "image");
    probe.onerror = () => tryImages(index + 1);
    probe.src = url;
  };

  const tryPdf = async () => {
    const url = "public/poster/birthday-poster.pdf";
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (response.ok) {
        setPoster(url, "pdf");
        return;
      }
    } catch { /* Leave the missing-poster state in place when offline. */ }
  };

  const getQrTarget = () => {
    const value = typeof window.BIRTHDAY_SITE_URL === "string" ? window.BIRTHDAY_SITE_URL.trim() : "";
    if (!value) return { error: "Set the public website URL in site-config.js after deployment to generate the final QR code." };
    try {
      const url = new URL(value);
      const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
      if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
        return { error: "Use the deployed HTTPS website URL in site-config.js." };
      }
      return { value: url.href.replace(/\/$/, ""), local };
    } catch {
      return { error: "The URL in site-config.js is not valid. Enter the complete website address." };
    }
  };

  const qrState = document.getElementById("qr-state");
  const generateButton = document.getElementById("generate-qr");
  const qrResult = document.getElementById("qr-result");
  const updateQrAvailability = () => {
    const target = getQrTarget();
    const libraryReady = typeof window.QRCode !== "undefined";
    if (!libraryReady && !target.error) target.error = "QR generator could not load. Check your internet connection and reload.";
    qrState.querySelector("p").textContent = target.error || (target.local
      ? "Development test QR only. Replace this with your deployed HTTPS URL before printing."
      : "Public website URL is configured. Generate the production QR code when ready.");
    generateButton.disabled = Boolean(target.error) || !libraryReady;
  };

  const loadQrLibrary = async () => {
    try {
      const module = await import("https://esm.sh/qrcode@1.5.4?bundle");
      window.QRCode = module.default || module;
    } catch { /* Leave QR generation disabled when the CDN is unreachable. */ }
    updateQrAvailability();
  };

  generateButton.addEventListener("click", async () => {
    const target = getQrTarget();
    if (target.error || typeof window.QRCode === "undefined") {
      updateQrAvailability();
      return;
    }
    try {
      const options = { errorCorrectionLevel: "H", margin: 4, width: 1200, color: { dark: "#000000", light: "#FFFFFF" } };
      qrPng = await QRCode.toDataURL(target.value, options);
      qrSvg = await QRCode.toString(target.value, { ...options, type: "svg" });
      document.getElementById("qr-image").src = qrPng;
      document.getElementById("qr-url").textContent = target.value;
      qrResult.hidden = false;
      qrState.hidden = false;
      qrState.querySelector("p").textContent = target.local
        ? "Development test QR only. Do not print or share as the final code."
        : "Production QR code";
    } catch {
      qrState.querySelector("p").textContent = "QR generation failed. Check the URL and reload the page.";
    }
  });

  document.getElementById("download-png").addEventListener("click", () => {
    if (!qrPng) return;
    const link = document.createElement("a");
    link.href = qrPng;
    link.download = "birthday-poster-qr.png";
    link.click();
  });
  document.getElementById("download-svg").addEventListener("click", () => {
    if (!qrSvg) return;
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(new Blob([qrSvg], { type: "image/svg+xml" }));
    link.href = objectUrl;
    link.download = "birthday-poster-qr.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  });

  updateQrAvailability();
  loadQrLibrary();
  tryImages();
})();