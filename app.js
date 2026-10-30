"use strict";

const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const browseButton = document.getElementById("browse-button");
const workspace = document.getElementById("image-workspace");
const originalCanvas = document.getElementById("original-canvas");
const resultCanvas = document.getElementById("result-canvas");
const applyButton = document.getElementById("apply-button");
const downloadButton = document.getElementById("download-button");
const intensityInput = document.getElementById("intensity");
const intensityValue = document.getElementById("intensity-value");
const toast = document.getElementById("toast");
const robustnessPanel = document.getElementById("robustness-panel");

const MAX_PIXELS = 12_000_000;
let originalImage = null;
let originalName = "";
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3600);
}

function drawImagePreview(canvas, placeholder, image) {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  canvas.style.display = "block";
  placeholder.classList.add("hidden");
}

function setCanvasPreview(canvas, placeholder, imageData) {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext("2d").putImageData(imageData, 0, 0);
  canvas.style.display = "block";
  placeholder.classList.add("hidden");
}

function resetResult() {
  resultCanvas.style.display = "none";
  document.getElementById("result-placeholder").classList.remove("hidden");
  document.getElementById("result-badge").textContent = "NOT APPLIED";
  document.getElementById("result-badge").classList.remove("applied");
  downloadButton.disabled = true;
  document.getElementById("simulation-result").classList.add("hidden");
  robustnessPanel.classList.add("hidden");
}

function resetApp() {
  originalImage = null;
  originalName = "";
  fileInput.value = "";
  workspace.classList.add("hidden");
  dropzone.classList.remove("hidden");
  robustnessPanel.classList.add("hidden");
  applyButton.disabled = true;
  resetResult();
}

function loadFile(file) {
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showToast("Choose a JPEG, PNG, or WEBP image.");
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) {
      showToast("This image is over 12 megapixels. Please choose a smaller image.");
      return;
    }

    originalImage = image;
    originalName = file.name.replace(/\.[^.]+$/, "") || "veil-image";
    document.getElementById("file-name").textContent = file.name;
    document.getElementById("image-meta").textContent =
      `${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} px · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    drawImagePreview(originalCanvas, document.getElementById("original-placeholder"), image);

    dropzone.classList.add("hidden");
    workspace.classList.remove("hidden");
    robustnessPanel.classList.add("hidden");
    applyButton.disabled = false;
    resetResult();
    showToast("Image loaded locally. Your original file remains unchanged.");
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    showToast("This image could not be opened. Try another file.");
  };
  image.src = objectUrl;
}

function hashSeed(index, seed) {
  let value = (index + seed) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

async function applyVariation() {
  if (!originalImage) return;
  const amount = Number(intensityInput.value);
  const amplitude = amount * 0.42;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const seed = Math.floor(Math.random() * 1_000_000);
  const batchSize = 500_000;
  const removeButton = document.getElementById("remove-image");
  const modeInputs = document.querySelectorAll('input[name="mode"]');

  applyButton.disabled = true;
  applyButton.setAttribute("aria-busy", "true");
  applyButton.textContent = "Applying variation…";
  intensityInput.disabled = true;
  removeButton.disabled = true;
  modeInputs.forEach((input) => { input.disabled = true; });

  try {
    const imageContext = originalCanvas.getContext("2d");
    const imageData = imageContext.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const pixels = imageData.data;
    const width = imageData.width;
    const pixelCount = width * imageData.height;

    for (let start = 0; start < pixelCount; start += batchSize) {
      const end = Math.min(start + batchSize, pixelCount);
      for (let pixelIndex = start; pixelIndex < end; pixelIndex++) {
        const i = pixelIndex * 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        const random = hashSeed(pixelIndex, seed) * 2 - 1;
        let red;
        let green;
        let blue;

        if (mode === "wave") {
          const wave = Math.sin(x * 0.045 + Math.sin(y * 0.02) + seed) * 0.55 + random * 0.45;
          red = wave;
          green = Math.sin(y * 0.04 + seed * 0.3) * 0.35 + random * 0.65;
          blue = -wave * 0.5 + random * 0.5;
        } else if (mode === "drift") {
          red = random;
          green = hashSeed(pixelIndex, seed + 271) * 2 - 1;
          blue = hashSeed(pixelIndex, seed + 547) * 2 - 1;
        } else {
          red = random;
          green = random * 0.8;
          blue = random * 0.65;
        }

        pixels[i] = Math.max(0, Math.min(255, pixels[i] + Math.round(red * amplitude)));
        pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + Math.round(green * amplitude)));
        pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + Math.round(blue * amplitude)));
      }
      if (end < pixelCount) await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    setCanvasPreview(resultCanvas, document.getElementById("result-placeholder"), imageData);
    const badge = document.getElementById("result-badge");
    badge.textContent = "VARIATION APPLIED";
    badge.classList.add("applied");
    downloadButton.disabled = false;
    robustnessPanel.classList.remove("hidden");
    document.getElementById("simulation-result").classList.add("hidden");
    showToast("Experimental pixel variation applied. This is not verified AI protection.");
  } catch (error) {
    if (error instanceof DOMException) {
      showToast("The browser could not process this image. Try a smaller file.");
    } else {
      throw error;
    }
  } finally {
    applyButton.disabled = false;
    applyButton.removeAttribute("aria-busy");
    applyButton.innerHTML = '<span class="button-sparkle">✳</span> Apply variation <span class="button-arrow">→</span>';
    intensityInput.disabled = false;
    removeButton.disabled = false;
    modeInputs.forEach((input) => { input.disabled = false; });
  }
}

function downloadResult() {
  if (!resultCanvas.width || !resultCanvas.height) return;
  resultCanvas.toBlob((blob) => {
    if (!blob) {
      showToast("Could not export this image. Please try again.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${originalName}-veil.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("PNG downloaded. Keep your original somewhere safe.");
  }, "image/png");
}

function runSimulation() {
  if (!originalImage || !resultCanvas.width) return;
  const scale = Math.min(0.78, 1600 / Math.max(resultCanvas.width, resultCanvas.height));
  const width = Math.max(1, Math.round(resultCanvas.width * scale));
  const height = Math.max(1, Math.round(resultCanvas.height * scale));
  const simulationCanvas = document.createElement("canvas");
  simulationCanvas.width = width;
  simulationCanvas.height = height;
  const simulationContext = simulationCanvas.getContext("2d", { willReadFrequently: true });
  simulationContext.drawImage(resultCanvas, 0, 0, width, height);

  const encoded = simulationCanvas.toDataURL("image/jpeg", 0.72);
  const simulationImage = new Image();
  simulationImage.onload = () => {
    simulationContext.clearRect(0, 0, width, height);
    simulationContext.drawImage(simulationImage, 0, 0);
    const simulated = simulationContext.getImageData(0, 0, width, height).data;
    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const sourceContext = source.getContext("2d", { willReadFrequently: true });
    sourceContext.drawImage(originalImage, 0, 0, width, height);
    const baseline = sourceContext.getImageData(0, 0, width, height).data;
    let squaredDifference = 0;
    const pixelCount = width * height * 3;
    for (let i = 0; i < simulated.length; i += 4) {
      squaredDifference += (simulated[i] - baseline[i]) ** 2;
      squaredDifference += (simulated[i + 1] - baseline[i + 1]) ** 2;
      squaredDifference += (simulated[i + 2] - baseline[i + 2]) ** 2;
    }
    const rmse = Math.sqrt(squaredDifference / pixelCount);
    document.getElementById("difference-value").textContent = `${rmse.toFixed(2)} / 255`;
    document.getElementById("simulation-result").classList.remove("hidden");
  };
  simulationImage.onerror = () => showToast("The share simulation could not be completed.");
  simulationImage.src = encoded;
}

browseButton.addEventListener("click", (event) => {
  event.stopPropagation();
  fileInput.click();
});
dropzone.addEventListener("click", (event) => {
  if (event.target !== browseButton) fileInput.click();
});
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => loadFile(fileInput.files[0]));
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("drag-over");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("drag-over");
  loadFile(event.dataTransfer.files[0]);
});
document.getElementById("remove-image").addEventListener("click", resetApp);
intensityInput.addEventListener("input", () => {
  const value = Number(intensityInput.value);
  intensityValue.textContent = `${value} / 10`;
  const percentage = ((value - 1) / 9) * 100;
  intensityInput.style.background = `linear-gradient(to right,#719077 0%,#719077 ${percentage}%,#e6e9e3 ${percentage}%,#e6e9e3 100%)`;
  resetResult();
});
document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", () => {
    document.querySelectorAll(".mode-option").forEach((option) => option.classList.remove("selected"));
    input.closest(".mode-option").classList.add("selected");
    resetResult();
  });
});
applyButton.addEventListener("click", applyVariation);
downloadButton.addEventListener("click", downloadResult);
document.getElementById("simulate-button").addEventListener("click", runSimulation);
