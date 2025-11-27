const form = document.getElementById("generator-form");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const notesInput = document.getElementById("notes");
const statusArea = document.getElementById("status");
const imageContainer = document.getElementById("image-container");
const resultImg = document.getElementById("result");
const downloadLink = document.getElementById("download");
const clearButton = document.getElementById("clear");

(function restoreInputs() {
  const savedKey = localStorage.getItem("sketchnote_api_key");
  if (savedKey) apiKeyInput.value = savedKey;
  const savedModel = localStorage.getItem("sketchnote_model_id");
  if (savedModel) modelInput.value = savedModel;
})();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiKey = apiKeyInput.value.trim();
  const modelId = modelInput.value.trim();
  const notes = notesInput.value.trim();

  if (!apiKey || !modelId || !notes) {
    setStatus("Please provide an API key, model ID, and some notes.");
    return;
  }

  localStorage.setItem("sketchnote_api_key", apiKey);
  localStorage.setItem("sketchnote_model_id", modelId);

  setStatus("Generating sketchnote image...");
  imageContainer.classList.add("hidden");

  try {
    const prompt = buildSketchnotePrompt(notes);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelId,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    const image = part?.inlineData;
    if (!image || !image.data) {
      throw new Error(
        "No image returned from model. Check your model ID and API key.",
      );
    }

    const mimeType = image.mimeType || "image/png";
    const dataUrl = `data:${mimeType};base64,${image.data}`;
    resultImg.src = dataUrl;
    downloadLink.href = dataUrl;
    setStatus("Done! Save or tweak your notes to regenerate.");
    imageContainer.classList.remove("hidden");
  } catch (error) {
    setStatus(`Error: ${error.message}`);
  }
});

clearButton.addEventListener("click", () => {
  notesInput.value = "";
  setStatus("");
  imageContainer.classList.add("hidden");
});

function setStatus(message) {
  statusArea.textContent = message;
}

function buildSketchnotePrompt(notes) {
  return `Create a single sketchnote-style illustration that summarizes the following raw notes.
Style: hand-drawn marker lines, bold headers inside banners, white background, thin black outlines, minimal shadowing, clean whitespace. Use a limited palette with one bright accent color and light neutrals. Add simple doodle icons, arrows, connectors, and callout boxes to highlight relationships. Mix typography sizes, sticky-note blocks, and divider lines for hierarchy. Avoid photo-realism—keep it playful and flat, like notebook scribbles.
Content goals: surface the main themes, subpoints, action items, and any contrasts or timelines. Prioritize clarity, visual grouping, and balance so the layout reads as a cohesive sketchnote.
Raw notes: ${notes}`;
}
