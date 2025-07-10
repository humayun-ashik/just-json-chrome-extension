const modeSelector = document.getElementById("modeSelector");
const jsonFormatMode = document.getElementById("jsonFormatMode");
const jsonCompareMode = document.getElementById("jsonCompareMode");

const prettifyBtn = document.getElementById("prettifyBtn");
const jsonInput = document.getElementById("jsonInput");
const formattedOutput = document.getElementById("formattedOutput");

const compareBtn = document.getElementById("compareBtn");
const jsonA = document.getElementById("jsonA");
const jsonB = document.getElementById("jsonB");
const compareOutput = document.getElementById("compareOutput");

const themeToggle = document.getElementById("themeToggle");
const clearBtn = document.getElementById("clearBtn");

const uploadBtn = document.getElementById("uploadBtn");
const jsonFileInput = document.getElementById("jsonFileInput");

// === Drag & Drop on textarea ===
jsonInput.addEventListener("dragover", (e) => {
  e.preventDefault();
  jsonInput.style.borderColor = "#333";
});

jsonInput.addEventListener("dragleave", () => {
  jsonInput.style.borderColor = "#aaa";
});

jsonInput.addEventListener("drop", (e) => {
  e.preventDefault();
  jsonInput.style.borderColor = "#aaa";
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith(".json")) {
    readJsonFile(file);
  } else {
    alert("Please drop a valid .json file.");
  }
});

// === Upload JSON File ===
uploadBtn.addEventListener("click", () => {
  console.log("Upload button clicked");
  jsonFileInput.value = ""; // Reset the input to allow re-uploading the same file
  jsonFileInput.click();
});

jsonFileInput.addEventListener("change", () => {
  const file = jsonFileInput.files[0];
  if (file && file.name.endsWith(".json")) {
    readJsonFile(file);
  } else {
    alert("Please select a valid .json file.");
  }
});

// === Read & Display File ===
function readJsonFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    jsonInput.value = event.target.result;
    prettifyBtn.click(); // Auto-prettify after file is loaded
  };
  reader.readAsText(file);
}

modeSelector.addEventListener("change", () => {
  if (modeSelector.value === "format") {
    jsonFormatMode.style.display = "block";
    jsonCompareMode.style.display = "none";
  } else {
    jsonFormatMode.style.display = "none";
    jsonCompareMode.style.display = "block";
  }
});

// prettifyBtn.addEventListener("click", () => {
//     try {
//       const parsed = JSON.parse(jsonInput.value);
//       const formatted = JSON.stringify(parsed, null, 2).split("\n");

//       const safeHTML = (str) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
//       let formattedHTML = "";

//       for (let line of formatted) {
//         formattedHTML += `<div>${safeHTML(line)}</div>`;
//       }

//       document.getElementById("formattedOutput").innerHTML = formattedHTML;
//       document.getElementById("formattedOutputContainer").style.display = "block";

//     } catch (e) {
//       document.getElementById("formattedOutput").innerHTML = `<div class="diff-removed">❌ Invalid JSON</div>`;
//       document.getElementById("formattedOutputContainer").style.display = "block";
//     }
//   });

//   document.getElementById('prettifyBtn').addEventListener('click', function () {
//     const input = document.getElementById('jsonInput').value;
//     try {
//       const formatted = JSON.stringify(JSON.parse(input), null, 2);
//       document.getElementById('formattedOutput').value = formatted;
//       document.getElementById('formattedOutputContainer').style.display = 'block';
//       document.getElementById('copyBtn').style.display = 'inline-block';
//       document.getElementById('downloadBtn').style.display = 'inline-block';
//     } catch (e) {
//       alert('Invalid JSON');
//     }
//   });

// Unified prettify function
prettifyBtn.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    const formatted = JSON.stringify(parsed, null, 2).split("\n");

    let formattedHTML = "";
    formatted.forEach((line) => {
      const safeLine = line.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      formattedHTML += `<div>${safeLine}</div>`;
    });

    const outputPre = document.getElementById("formattedOutput");
    outputPre.innerHTML = formattedHTML;

    document.getElementById("formattedOutputContainer").style.display = "block";
    document.getElementById("copyBtn").style.display = "inline-block";
    document.getElementById("downloadBtn").style.display = "inline-block";
  } catch (e) {
    const outputPre = document.getElementById("formattedOutput");
    outputPre.innerHTML = '<div class="diff-removed">❌ Invalid JSON</div>';
    document.getElementById("formattedOutputContainer").style.display = "block";
    document.getElementById("copyBtn").style.display = "none";
    document.getElementById("downloadBtn").style.display = "none";
  }
});

copyBtn.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    const formattedText = JSON.stringify(parsed, null, 2);

    navigator.clipboard.writeText(formattedText).then(() => {
      const status = document.getElementById("copyStatus");
      status.style.display = "inline";
      setTimeout(() => (status.style.display = "none"), 1500);
    });
  } catch (e) {
    alert("Invalid JSON. Nothing copied.");
  }
});

downloadBtn.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    const formattedText = JSON.stringify(parsed, null, 2);
    const blob = new Blob([formattedText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    a.click();

    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Invalid JSON. Nothing to download.");
  }
});

compareBtn.addEventListener("click", () => {
  try {
    const objA = JSON.parse(jsonA.value);
    const objB = JSON.parse(jsonB.value);

    const formattedA = JSON.stringify(objA, null, 2).split("\n");
    const formattedB = JSON.stringify(objB, null, 2).split("\n");

    const maxLen = Math.max(formattedA.length, formattedB.length);
    let leftHTML = "",
      rightHTML = "";

    for (let i = 0; i < maxLen; i++) {
      const lineA = formattedA[i] ?? "";
      const lineB = formattedB[i] ?? "";

      const safeHTML = (str) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      if (lineA === lineB) {
        leftHTML += `<div>${safeHTML(lineA)}</div>`;
        rightHTML += `<div>${safeHTML(lineB)}</div>`;
      } else {
        leftHTML += `<div class="diff-changed">${safeHTML(lineA)}</div>`;
        rightHTML += `<div class="diff-changed">${safeHTML(lineB)}</div>`;
      }
    }

    document.getElementById("outputA").innerHTML = leftHTML;
    document.getElementById("outputB").innerHTML = rightHTML;
    document.getElementById("compareResult").style.display = "block";
  } catch (e) {
    document.getElementById("compareResult").style.display = "block";
    document.getElementById(
      "outputA"
    ).innerHTML = `<div class="diff-removed">❌ Invalid JSON A</div>`;
    document.getElementById(
      "outputB"
    ).innerHTML = `<div class="diff-removed">❌ Invalid JSON B</div>`;
  }
});

// Clear button functionality
clearBtn.addEventListener("click", () => {
  jsonInput.value = "";
  formattedOutput.innerHTML = "";
  document.getElementById("formattedOutputContainer").style.display = "none";
  document.getElementById("copyBtn").style.display = "none";
  document.getElementById("downloadBtn").style.display = "none";

  jsonA.value = "";
  jsonB.value = "";
  document.getElementById("compareResult").style.display = "none";
  document.getElementById("outputA").innerHTML = "";
  document.getElementById("outputB").innerHTML = "";
});

document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");

  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
  });
});
