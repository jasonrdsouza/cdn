const form = document.getElementById("generator-form");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const subjectInput = document.getElementById("subject");
const statusArea = document.getElementById("status");
const imageContainer = document.getElementById("image-container");
const resultImg = document.getElementById("result");
const downloadLink = document.getElementById("download");
const clearButton = document.getElementById("clear");

(function restoreInputs() {
  const savedKey = localStorage.getItem("picasso_api_key");
  if (savedKey) apiKeyInput.value = savedKey;
  const savedModel = localStorage.getItem("picasso_model_id");
  if (savedModel) modelInput.value = savedModel;
})();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiKey = apiKeyInput.value.trim();
  const modelId = modelInput.value.trim();
  const subject = subjectInput.value.trim();

  if (!apiKey || !modelId || !subject) {
    setStatus("Please provide an API key, model ID, and a subject.");
    return;
  }

  localStorage.setItem("picasso_api_key", apiKey);
  localStorage.setItem("picasso_model_id", modelId);

  setStatus("Generating Picasso line drawing...");
  imageContainer.classList.add("hidden");

  try {
    const prompt = buildPicassoPrompt(subject);
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
    setStatus("Done! Save or tweak your subject to regenerate.");
    imageContainer.classList.remove("hidden");
  } catch (error) {
    setStatus(`Error: ${error.message}`);
  }
});

clearButton.addEventListener("click", () => {
  subjectInput.value = "";
  setStatus("");
  imageContainer.classList.add("hidden");
});

function setStatus(message) {
  statusArea.textContent = message;
}

function buildPicassoPrompt(subject) {
  return `Create a minimalist line drawing in the style of Pablo Picasso.
Style: abstract, a few expressive black lines on a pure white background. The lines should be fluid and capture the fundamental essence of the subject's form with minimal detail. Avoid shading, color, and any background elements. The final image should be a clean, elegant, and instantly recognizable as a Picasso-esque line drawing.
Subject: ${subject}`;
}
