// Core Logic and UI Handling

const historyContainer = document.getElementById("history");
const codeInput = document.getElementById("code-input");
const runBtn = document.getElementById("run-btn");
const keypadContainer = document.getElementById("keypad");
const clearBtn = document.getElementById("clear-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const apiKeyInput = document.getElementById("api-key");

const LLM_API_KEY_STORAGE = "bqn_llm_api_key";

// --- Settings Logic ---
settingsBtn.addEventListener("click", () => {
  const key = localStorage.getItem(LLM_API_KEY_STORAGE) || "";
  apiKeyInput.value = key;
  settingsModal.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

saveSettingsBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem(LLM_API_KEY_STORAGE, key);
    settingsModal.classList.add("hidden");
  } else {
    alert("Please enter an API Key.");
  }
});

// --- History Navigation State ---
let commandHistory = [];
let historyIndex = -1; // -1 means "new/draft" mode (not browsing history)
let tempInput = ""; // Stores the draft input when user starts navigating up

// --- Execution State ---
let executionHistory = []; // Stores successful BQN commands to maintain state

// --- Keypad and Input Handling ---

// Populate Keypad
const COMMON_SYMBOLS = [
  "←",
  "↩",
  "⋄",
  "‿",
  "+",
  "-",
  "×",
  "÷",
  "⋆",
  "√",
  "⌊",
  "⌈",
  "∧",
  "∨",
  "¬",
  "≠",
  "=",
  "<",
  ">",
  "≤",
  "≥",
  "≡",
  "≢",
  "⊣",
  "⊢",
  "⊑",
  "⊒",
  "⊏",
  "⊐",
  "⍋",
  "⍒",
  "↕",
  "⍉",
  "⌽",
  "⍷",
  "∾",
  "≍",
  "↑",
  "↓",
  "⊔",
  "⥊",
  "⍳",
  "⍟",
  "˙",
  "˜",
  "˘",
  "¨",
  "⁼",
  "⌜",
  "´",
  "˝",
  "`",
  "∘",
  "○",
  "⊸",
  "⟜",
  "⌾",
  "⊘",
  "◶",
  "⎉",
  "⚇",
  "⍎",
  "⍕",
  "𝕨",
  "𝕩",
  "𝕗",
  "𝕘",
  "𝕤",
  "𝕎",
  "𝕏",
  "𝔽",
  "𝔾",
  "𝕊",
  "⟨",
  "⟩",
  "[]",
  "{}",
  "∞",
  "¯",
  "•",
  "π",
  "→",
  "↙",
  "↖",
  "«",
  "»",
  "⋈",
  "⇐",
  "∊",
  "⎊",
  "𝕣",
];

const BQN_KEYMAP = {
  "`": "˜",
  1: "˘",
  2: "¨",
  3: "⁼",
  4: "⌜",
  5: "´",
  6: "˝",
  8: "∞",
  9: "¯",
  0: "•",
  "-": "÷",
  "=": "×",
  "~": "¬",
  "!": "⎉",
  "@": "⚇",
  "#": "⍟",
  $: "◶",
  "%": "⊘",
  "^": "⎊",
  "&": "⍎",
  "*": "⍕",
  "(": "⟨",
  ")": "⟩",
  _: "√",
  "+": "⋆",
  q: "⌽",
  w: "𝕨",
  e: "∊",
  r: "↑",
  t: "∧",
  y: "⊔", // Note: 'y' is sometimes gap or unused, 'u' is ⊔ in some maps. Using map from mlochbaum docs.
  u: "⊔",
  i: "⊏",
  o: "⊐",
  p: "π",
  "[": "←",
  "]": "→",
  "\\": "⋄", // The char itself
  a: "⍉",
  s: "𝕤",
  d: "↕",
  f: "𝕗",
  g: "𝕘",
  h: "⊸",
  j: "∘",
  k: "○",
  l: "⟜",
  ";": "⋄",
  "'": "↩",
  z: "⥊",
  x: "𝕩",
  c: "↓",
  v: "∨",
  b: "⌊",
  n: "≡",
  m: "≢",
  ",": "∾",
  ".": "≍",
  "/": "≠",
  Q: "↙",
  W: "𝕎",
  E: "⍷",
  R: "𝕣",
  T: "⍋",
  I: "⊑",
  O: "⊒",
  P: "⍳",
  "{": "⊣",
  "}": "⊢",
  A: "↖",
  S: "𝕊",
  F: "𝔽",
  G: "𝔾",
  H: "«",
  K: "⌾",
  L: "»",
  Z: "⋈",
  X: "𝕏",
  V: "⍒",
  B: "⌈",
  "<": "≤",
  ">": "≥",
  "?": "⇐",
  " ": "‿", // space
};

const GLYPH_TOOLTIPS = {
  "←": "Define",
  "↩": "Change",
  "⋄": "Separator",
  "‿": "Strand",
  "+": "Conjugate / Add",
  "-": "Negate / Subtract",
  "×": "Sign / Multiply",
  "÷": "Reciprocal / Divide",
  "⋆": "Exponential / Power",
  "√": "Square Root / Root",
  "⌊": "Floor / Minimum",
  "⌈": "Ceiling / Maximum",
  "∧": "Sort Up / And",
  "∨": "Sort Down / Or",
  "¬": "Not / Span",
  "≠": "Length / Not Equals",
  "=": "Rank / Equals",
  "<": "Enclose / Less Than",
  ">": "Merge / Greater Than",
  "≤": "Less Than or Equal to",
  "≥": "Greater Than or Equal to",
  "≡": "Depth / Match",
  "≢": "Shape / Not Match",
  "⊣": "Identity / Left",
  "⊢": "Identity / Right",
  "⊑": "First / Pick",
  "⊒": "Occurrence Count / Progressive Index of",
  "⊏": "First Cell / Select",
  "⊐": "Classify / Index of",
  "⍋": "Grade Up / Bins Up",
  "⍒": "Grade Down / Bins Down",
  "↕": "Range / Windows",
  "⍉": "Transpose / Reorder Axes",
  "⌽": "Reverse / Rotate",
  "⍷": "Deduplicate / Find",
  "∾": "Join / Join to",
  "≍": "Solo / Couple",
  "↑": "Prefixes / Take",
  "↓": "Suffixes / Drop",
  "⊔": "Group Indices / Group",
  "⥊": "Deshape / Reshape",
  "⍳": "Character ⍳",
  "⍟": "Repeat",
  "˙": "Constant",
  "˜": "Self / Swap",
  "˘": "Cells",
  "¨": "Each",
  "⁼": "Undo",
  "⌜": "Table",
  "´": "Fold",
  "˝": "Insert",
  "`": "Scan",
  "∘": "Atop",
  "○": "Over",
  "⊸": "Before / Bind",
  "⟜": "After / Bind",
  "⌾": "Under",
  "⊘": "Valences",
  "◶": "Choose",
  "⎉": "Rank",
  "⚇": "Depth",
  "⍎": "Character ⍎",
  "⍕": "Character ⍕",
  "𝕨": "Left Argument",
  "𝕩": "Right Argument",
  "𝕗": "Left Operand",
  "𝕘": "Right Operand",
  "𝕤": "Current Function",
  "𝕎": "Left Argument (Upper)",
  "𝕏": "Right Argument (Upper)",
  "𝔽": "Left Operand (Upper)",
  "𝔾": "Right Operand (Upper)",
  "𝕊": "Current Function (Upper)",
  "⟨": "List Start",
  "⟩": "List End",
  "[]": "Array",
  "{}": "Block",
  "∞": "Infinity",
  "¯": "High Minus",
  "•": "System",
  π: "Pi",
  "→": "Character →",
  "↙": "Character ↙",
  "↖": "Character ↖",
  "«": "Shift Before",
  "»": "Shift After",
  "⋈": "Enlist / Pair",
  "⇐": "Export",
  "∊": "Mark Firsts / Member of",
  "⎊": "Catch",
  "𝕣": "Modifier Self",
};

COMMON_SYMBOLS.forEach((char) => {
  const btn = document.createElement("div");
  btn.className = "keypad-btn";
  btn.textContent = char;
  btn.title = GLYPH_TOOLTIPS[char] || char;
  btn.addEventListener("click", (e) => {
    // Prevent focus loss if possible, or refocus
    e.preventDefault();
    insertAtCursor(char);
  });
  keypadContainer.appendChild(btn);
});

function insertAtCursor(text) {
  const start = codeInput.selectionStart;
  const end = codeInput.selectionEnd;
  const val = codeInput.value;

  codeInput.value = val.substring(0, start) + text + val.substring(end);
  codeInput.selectionStart = codeInput.selectionEnd = start + text.length;
  codeInput.focus();
}

// Backslash code handling
codeInput.addEventListener("input", (e) => {
  // We only care if the last typed char completed a backslash sequence
  const val = codeInput.value;
  const cursor = codeInput.selectionStart;

  // We look at the 2 chars before cursor.
  if (cursor >= 2) {
    const lastTwo = val.substring(cursor - 2, cursor);
    if (lastTwo[0] === "\\") {
      const key = lastTwo[1];
      if (BQN_KEYMAP[key]) {
        const replacement = BQN_KEYMAP[key];

        // Replace the backslash+key with the replacement
        const newVal =
          val.substring(0, cursor - 2) + replacement + val.substring(cursor);
        codeInput.value = newVal;

        // Update cursor position
        codeInput.selectionStart = codeInput.selectionEnd = cursor - 1;
      }
    }
  }
});

function addToHistory(input, result, type = "std") {
  // type: 'std' (standard result), 'error', 'ai', 'loading'
  const item = document.createElement("div");
  item.className = "history-item";

  const inputDiv = document.createElement("div");
  inputDiv.className = "history-input";
  inputDiv.textContent = input;
  inputDiv.title = "Click to edit/run";

  // Add click listener to recall command
  inputDiv.addEventListener("click", () => {
    codeInput.value = input;
    codeInput.focus();
    // Reset navigation
    historyIndex = -1;
  });

  const resultDiv = document.createElement("div");

  if (type === "error") {
    resultDiv.className = "history-error";
    resultDiv.textContent = result;
  } else if (type === "ai") {
    resultDiv.className = "history-ai-response";
    // Store raw markdown for persistence scraping
    resultDiv.dataset.raw = result;
    renderAIResponse(resultDiv, result);
  } else {
    // std or loading
    resultDiv.className = "history-result";
    resultDiv.textContent = result;
  }

  item.appendChild(inputDiv);
  item.appendChild(resultDiv);

  historyContainer.appendChild(item);
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

// Refactored AI Command Handler with Self-Correction Loop
async function handleAICommand(question) {
  // Add question to history UI immediately as loading/std
  addToHistory("? " + question, "Thinking...", "std", false); // Don't save yet
  const loadingItem = historyContainer.lastElementChild;
  const resultDiv = loadingItem.querySelector(".history-result");

  // Add to nav history
  commandHistory.push("? " + question);
  historyIndex = -1;
  tempInput = "";
  codeInput.value = "";

  // Gather history context
  const context = [];
  document.querySelectorAll(".history-item").forEach((el) => {
    if (el === loadingItem) return;
    const inp = el.querySelector(".history-input").textContent;
    const res =
      el.querySelector(".history-result, .history-error, .history-ai-response")
        ?.textContent || "";
    context.push({ input: inp, result: res });
  });

  let retries = 0;
  const maxRetries = 3;
  let conversationHistory = []; // Stores the back-and-forth for this specific query

  while (retries <= maxRetries) {
    if (retries > 0) {
      resultDiv.textContent = `Thinking... (Retrying ${retries}/${maxRetries})`;
    }

    try {
      const aiText = await callGemini(question, context, conversationHistory);

      // Extract code block
      const codeBlock = extractCodeBlock(aiText);

      if (codeBlock) {
        // Try to execute the code
        try {
          // We need to execute it to see if it works
          // We join with existing execution history to ensure context
          const codeToRun =
            executionHistory.length > 0
              ? executionHistory.join("\n") + "\n" + codeBlock
              : codeBlock;

          let rawResult;
          if (typeof bqn === "function") {
            rawResult = bqn(codeToRun);

            // If successful:
            let fmtResult;
            if (typeof fmt === "function") {
              fmtResult = fmt(rawResult);
            } else {
              fmtResult = String(rawResult);
            }

            // Success! Update UI
            resultDiv.className = "history-ai-response";
            resultDiv.innerHTML = "";

            // Render AI explanation
            renderAIResponse(resultDiv, aiText); // This renders text + code blocks

            // Append the actual result of the execution
            const resultBox = document.createElement("div");
            resultBox.className = "history-result";
            resultBox.style.marginTop = "10px";
            resultBox.style.borderTop = "1px solid #444";
            resultBox.style.paddingTop = "5px";
            resultBox.textContent = fmtResult;
            resultDiv.appendChild(resultBox);

            // Save persistence
            saveHistory();

            // Add the successful code to execution history so future commands know about it
            executionHistory.push(codeBlock);
            return; // Done
          } else {
            throw new Error("BQN engine not loaded.");
          }
        } catch (execErr) {
          // Execution failed
          let errMsg = execErr.toString();
          if (typeof fmtErr === "function") {
            errMsg = fmtErr(execErr);
          }

          // Add to conversation history for retry
          conversationHistory.push({ role: "model", text: aiText });
          conversationHistory.push({
            role: "user",
            text: `The code you provided \n\`\`\`bqn\n${codeBlock}\n\`\`\`\n threw this error:\n${errMsg}\n\nPlease fix it.`,
          });
          retries++;
          continue; // Loop again
        }
      } else {
        // No code block found - just display text
        resultDiv.className = "history-ai-response";
        resultDiv.innerHTML = "";
        renderAIResponse(resultDiv, aiText);
        saveHistory();
        return;
      }
    } catch (e) {
      // API or Network error
      resultDiv.className = "history-error";
      resultDiv.textContent = "AI Error: " + e.message;
      saveHistory();
      return;
    }
  }

  // If we exit loop without returning, we failed after retries
  resultDiv.className = "history-error";
  resultDiv.innerHTML = "";
  const errorMsg = document.createElement("div");
  errorMsg.textContent =
    "Failed after multiple retries. Last error was likely valid.";
  resultDiv.appendChild(errorMsg);

  // Show the last AI response anyway so user can see what happened
  if (conversationHistory.length > 0) {
    const lastResp = conversationHistory[conversationHistory.length - 2]; // The model's last response
    if (lastResp && lastResp.role === "model") {
      const lastContent = document.createElement("div");
      lastContent.style.opacity = "0.7";
      renderAIResponse(lastContent, lastResp.text);
      resultDiv.appendChild(lastContent);
    }
  }
  saveHistory();
}

function extractCodeBlock(text) {
  // Find the last code block in the text
  const matches = [...text.matchAll(/```(?:bqn)?\n([\s\S]*?)```/g)];
  if (matches.length > 0) {
    return matches[matches.length - 1][1].trim();
  }
  return null;
}

async function runBQN() {
  const input = codeInput.value.trim();
  if (!input) return;

  // Check for AI Request
  if (input.startsWith("?")) {
    await handleAICommand(input.substring(1).trim());
    return;
  }

  // Normal BQN Execution
  let result;
  let type = "std";

  // Construct full code context from history + current input
  // We join with newlines (separators)
  const codeToRun =
    executionHistory.length > 0
      ? executionHistory.join("\n") + "\n" + input
      : input;

  try {
    if (typeof bqn === "function") {
      const rawResult = bqn(codeToRun);
      // Use BQN.js provided 'fmt' function for proper formatting of arrays and functions
      if (typeof fmt === "function") {
        result = fmt(rawResult);
      } else {
        result = String(rawResult);
      }

      // On success, add to execution history
      executionHistory.push(input);
    } else {
      result = "Error: BQN engine not loaded.";
      type = "error";
    }
  } catch (e) {
    // Use BQN.js provided 'fmtErr' for proper error messages
    if (typeof fmtErr === "function") {
      result = fmtErr(e);
    } else {
      result = e.toString();
    }
    type = "error";
  }

  addToHistory(input, result, type);

  // Update Navigation History
  commandHistory.push(input);
  historyIndex = -1; // Reset to new
  tempInput = "";

  codeInput.value = "";
}

runBtn.addEventListener("click", runBQN);

codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    runBQN();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (commandHistory.length === 0) return;

    if (historyIndex === -1) {
      // Starting navigation from draft
      tempInput = codeInput.value;
      historyIndex = commandHistory.length - 1;
    } else {
      historyIndex = Math.max(0, historyIndex - 1);
    }
    codeInput.value = commandHistory[historyIndex];
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (commandHistory.length === 0) return;

    if (historyIndex !== -1) {
      historyIndex++;
      if (historyIndex >= commandHistory.length) {
        // Back to draft
        historyIndex = -1;
        codeInput.value = tempInput;
      } else {
        codeInput.value = commandHistory[historyIndex];
      }
    }
  }
});

// --- Persistence ---

const STORAGE_KEY = "bqn_calc_history";

function saveHistory() {
  const items = [];
  document.querySelectorAll(".history-item").forEach((el) => {
    const input = el.querySelector(".history-input").textContent;

    let result = "";
    let type = "std";

    // Check types based on classes
    const resEl = el.querySelector(
      ".history-result, .history-error, .history-ai-response",
    );
    if (resEl) {
      if (resEl.classList.contains("history-error")) {
        type = "error";
        result = resEl.textContent;
      } else if (resEl.classList.contains("history-ai-response")) {
        type = "ai";
        // Prefer raw markdown if available to preserve code blocks
        result = resEl.dataset.raw || resEl.textContent;
      } else {
        result = resEl.textContent;
      }
    }

    items.push({ input, result, type });
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadHistory() {
  commandHistory = []; // Reset navigation history
  executionHistory = []; // Reset execution state
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const items = JSON.parse(data);
      items.forEach((item) => {
        // Compatibility with old format (has isError)
        let type = item.type || (item.isError ? "error" : "std");
        addToHistory(item.input, item.result, type, false);

        // Populate navigation history
        commandHistory.push(item.input);

        // Populate execution history if it was a successful standard command
        if (type === "std") {
          executionHistory.push(item.input);
        }
      });
    } catch (e) {
      console.error("Failed to load history", e);
    }
  } else {
    // Default Welcome Message
    addToHistory(
      "Welcome to BQN!",
      "Type code below or use the keypad. Try '1+1'.",
      "std",
      false,
    );
    // Do not add welcome message to executionHistory or commandHistory
  }
}

// Wrap original addToHistory to include save
const originalAddToHistory = addToHistory;
addToHistory = function (input, result, type, save = true) {
  originalAddToHistory(input, result, type);
  if (save) saveHistory();
};

// Clear history override
clearBtn.addEventListener("click", () => {
  historyContainer.innerHTML = "";
  localStorage.removeItem(STORAGE_KEY);
  commandHistory = [];
  executionHistory = [];
  historyIndex = -1;
  tempInput = "";
});

// --- LLM Logic ---

// Defined Context
const BQN_CONTEXT_PROMPT = `
The user is running a BQN REPL in a web browser environment.
The available glyphs are:
${COMMON_SYMBOLS.join(" ")}

Environment Details:
- Language: BQN (bqn.js)
- Runtime: Browser (Javascript-based)
- File System: Read-only/None (No \`•file\`)
- Standard input/output: Not interactive.
- Available System Namespaces: \`•math\`, \`•monitored\`, etc.
- IMPORTANT: Use \`•math\` for advanced math if needed, but prefer standard primitives.
`;

async function callGemini(prompt, historyContext, conversationHistory = []) {
  const apiKey = localStorage.getItem(LLM_API_KEY_STORAGE);
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please set it in Settings.");
  }

  // Use latest Gemini 3 Flash Preview model
  const modelId = "gemini-3-flash-preview";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const systemPrompt = `You are a helpful BQN programming language tutor.
${BQN_CONTEXT_PROMPT}

Answer questions concisely.
If asked to write code, provide the BQN code in a code block (e.g. \`\`\`bqn ... \`\`\`).
The code you write will be EXECUTED automatically. Ensure it is syntactically correct and complete.
You must fully explain how the code works, breaking it down step-by-step.
If you are correcting an error, analyze the error message provided and fix the code.
`;

  // Construct contents
  // HistoryContext is the app state (previous commands).
  // ConversationHistory is the current retry loop (AI vs User).

  let contents = [];

  // Add System Prompt? Gemini API uses 'system_instruction' or just first 'user' message.
  // 'generateContent' allows 'system_instruction' field in v1beta.

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [],
  };

  // Add App History as Context (User/Model turns)
  // We can summarize it or just add it as a user message block.
  // Let's add it as a preamble in the first user message for simplicity and robust context.
  const historyText = historyContext
    .map((item) => `Input: ${item.input}\nResult: ${item.result}`)
    .join("\n---\n");

  // First message: Context + Current Prompt
  let firstUserText = `User History:\n${historyText}\n\nCurrent Request: ${prompt}`;

  requestBody.contents.push({ role: "user", parts: [{ text: firstUserText }] });

  // Append conversation history (for retries)
  conversationHistory.forEach((msg) => {
    requestBody.contents.push({ role: msg.role, parts: [{ text: msg.text }] });
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response text from Gemini.");
    return text;
  } catch (e) {
    throw e;
  }
}

// Helper to render AI response with clickable code blocks
function renderAIResponse(container, text) {
  if (typeof marked === "undefined") {
    container.textContent = text;
    return;
  }

  // Configure marked options if needed, though defaults are usually fine
  // We can use a custom renderer if we want strict control, but DOM post-processing is easier here
  container.innerHTML = marked.parse(text);

  // Add interactivity to code blocks
  container.querySelectorAll("pre code").forEach((codeEl) => {
    const pre = codeEl.parentElement;
    pre.classList.add("ai-code-block");
    pre.title = "Click to insert code";

    // Store the raw code for the click handler
    const codeText = codeEl.textContent;

    pre.addEventListener("click", () => {
      codeInput.value = codeText.trim();
      codeInput.focus();
      historyIndex = -1; // Reset nav
    });
  });
}

// Initialize
window.addEventListener("load", () => {
  // BQN check is already handled in original file, but we can init history here
  loadHistory();
  codeInput.focus();
});
