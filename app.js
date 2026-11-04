(() => {
  const viewport = document.getElementById("poster-viewport");
  const image = document.getElementById("poster-image");
  const pdf = document.getElementById("poster-pdf");
  const placeholder = document.getElementById("poster-placeholder");
  const zoomLabel = document.getElementById("zoom-level");
  const status = document.getElementById("poster-status");
  const download = document.getElementById("poster-download");
  const downloadLabel = document.getElementById("download-label");
  const pointers = new Map();
  const imageCandidates = [
    "poster/birthday programme.png",
    "poster/birthday poster.png",
    ...["jpg", "png", "webp", "jpeg", "avif"].map((extension) => `public/poster/birthday-poster.${extension}`)
  ];
  const minZoom = 0.08;
  const maxZoom = 6;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let dragStart = null;
  let pinchStart = null;
  let qrPng = "";
  let qrSvg = "";

  const setZoom = (value) => {
    zoom = Math.min(maxZoom, Math.max(minZoom, value));
    viewport.style.setProperty("--zoom", zoom);
    viewport.style.setProperty("--pan-x", `${panX}px`);
    viewport.style.setProperty("--pan-y", `${panY}px`);
    zoomLabel.value = `${Math.round(zoom * 100)}%`;
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    viewport.classList.toggle("is-draggable", zoom > 0.25 && !pdf.hidden);
  };

  const fitImage = () => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    const availableWidth = Math.max(100, viewport.clientWidth - 36);
    const availableHeight = Math.max(100, viewport.clientHeight - 36);
    zoom = Math.min(availableWidth / image.naturalWidth, availableHeight / image.naturalHeight, 1);
    panX = 0;
    panY = 0;
    setZoom(zoom);
    zoomLabel.value = "Fit";
    zoomLabel.textContent = "Fit";
  };

  const setPoster = (url, kind) => {
    placeholder.hidden = true;
    download.href = url;
    download.hidden = false;
    if (kind === "image") {
      image.hidden = false;
      image.onload = fitImage;
      image.src = url;
      status.textContent = "Original image poster";
      download.download = url.split("/").pop();
      downloadLabel.textContent = "Download original";
      document.getElementById("zoom-in").disabled = false;
      document.getElementById("zoom-out").disabled = false;
      document.getElementById("fit-poster").disabled = false;
      document.getElementById("reset-zoom").disabled = false;
    } else {
      pdf.hidden = false;
      pdf.src = url;
      status.textContent = "Original PDF poster";
      download.removeAttribute("download");
      download.target = "_blank";
      download.rel = "noopener";
      downloadLabel.textContent = "Open original PDF";
      ["zoom-in", "zoom-out", "fit-poster", "reset-zoom"].forEach((id) => {
        document.getElementById(id).disabled = true;
      });
      zoomLabel.textContent = "PDF";
      viewport.classList.remove("is-draggable");
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
    status.textContent = "Add the original poster to begin";
  };

  document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoom * 1.25));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoom / 1.25));
  document.getElementById("fit-poster").addEventListener("click", fitImage);
  document.getElementById("reset-zoom").addEventListener("click", () => {
    panX = 0;
    panY = 0;
    setZoom(1);
  });
  document.getElementById("fullscreen").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await viewport.requestFullscreen();
    } catch { status.textContent = "Fullscreen is unavailable in this browser"; }
  });

  viewport.addEventListener("wheel", (event) => {
    if (image.hidden) return;
    event.preventDefault();
    setZoom(zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12));
  }, { passive: false });

  viewport.addEventListener("keydown", (event) => {
    if (image.hidden) return;
    if (event.key === "+" || event.key === "=") setZoom(zoom * 1.2);
    else if (event.key === "-") setZoom(zoom / 1.2);
    else if (event.key === "0") fitImage();
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (image.hidden || event.target !== image) return;
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      dragStart = { x: event.clientX - panX, y: event.clientY - panY };
      viewport.classList.add("is-dragging");
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinchStart = { distance: Math.hypot(first.x - second.x, first.y - second.y), zoom };
      dragStart = null;
    }
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1 && pinchStart) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      setZoom(pinchStart.zoom * distance / pinchStart.distance);
    } else if (dragStart) {
      panX = event.clientX - dragStart.x;
      panY = event.clientY - dragStart.y;
      setZoom(zoom);
    }
  });

  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 1) {
      const [point] = pointers.values();
      dragStart = { x: point.x - panX, y: point.y - panY };
    } else {
      dragStart = null;
      viewport.classList.remove("is-dragging");
    }
  };
  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);

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
  window.addEventListener("resize", () => {
    if (!image.hidden && zoomLabel.textContent === "Fit") fitImage();
  });
  tryImages();
})();