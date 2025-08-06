document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const modeSelector = document.getElementById('modeSelector');
    const jsonFormatMode = document.getElementById('jsonFormatMode');
    const jsonCompareMode = document.getElementById('jsonCompareMode');

    const jsonInput = document.getElementById('jsonInput');
    const prettifyBtn = document.getElementById('prettifyBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const jsonFileInput = document.getElementById('jsonFileInput');
    const formattedOutputContainer = document.getElementById('formattedOutputContainer');
    const formattedOutput = document.getElementById('formattedOutput');
    const clearBtn = document.getElementById('clearBtn');
    const themeToggle = document.getElementById('themeToggle');

    // Search elements
    const searchBtn = document.getElementById('searchBtn'); // The magnifying glass icon
    const searchContainer = document.getElementById('searchContainer'); // The search bar div
    const searchInput = document.getElementById('searchInput');
    const searchMatchCount = document.getElementById('searchMatchCount');
    const prevMatchBtn = document.getElementById('prevMatchBtn');
    const nextMatchBtn = document.getElementById('nextMatchBtn');
    const closeSearchBtn = document.getElementById('closeSearchBtn');

    // Compare mode elements
    const jsonA = document.getElementById('jsonA');
    const jsonB = document.getElementById('jsonB');
    const compareBtn = document.getElementById('compareBtn');
    const compareResult = document.getElementById('compareResult');
    const outputA = document.getElementById('outputA');
    const outputB = document.getElementById('outputB'); // Corrected from document('outputB')

    // State variables for search
    let matches = [];
    let currentMatchIndex = -1;
    // Store original formatted content as an array of lines for line numbers
    let originalFormattedLines = [];

    // --- Utility Functions ---

    // Function to apply/remove dark mode
    function applyTheme(isDarkMode) {
        document.body.classList.toggle('dark-mode', isDarkMode);
        // Update icon based on mode: if in dark mode, show sun to suggest light; else show moon to suggest dark.
        themeToggle.textContent = isDarkMode ? '🌞' : '🌕';

        // Store preference using chrome.storage.local via background script
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            console.log("popup.js: Sending saveTheme message to background.");
            chrome.runtime.sendMessage({ action: "saveTheme", data: isDarkMode }, (response) => {
                if (response && !response.success) {
                    console.error("popup.js: Failed to save theme via background:", response.error);
                } else {
                    // console.log("popup.js: Theme save message sent successfully."); // Removed for cleaner console
                }
            });
        } else {
            // Fallback for non-extension environments (e.g., direct HTML open)
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            // console.warn("popup.js: chrome.runtime.sendMessage not available, using localStorage for theme."); // Removed for cleaner console
        }

        // Update Monaco Editor theme if it's initialized
        if (typeof monaco !== 'undefined' && monaco.editor) {
            monaco.editor.setTheme(isDarkMode ? "vs-dark" : "vs-light");
        }
    }

    // --- Initial Load Logic ---
    // Load theme preference on startup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // console.log("popup.js: Sending loadTheme message to background."); // Removed for cleaner console
        chrome.runtime.sendMessage({ action: "loadTheme" }, (response) => {
            if (response && response.success) {
                applyTheme(response.data || false);
                // console.log("popup.js: Theme loaded from background:", response.data); // Removed for cleaner console
            } else {
                console.error("popup.js: Failed to load theme via background:", response ? response.error : "No response");
                // Fallback to localStorage if background script communication fails
                const savedTheme = localStorage.getItem('theme');
                applyTheme(savedTheme === 'dark');
                // console.warn("popup.js: Falling back to localStorage for theme."); // Removed for cleaner console
            }
        });
    } else {
        // Fallback for non-extension environments
        const savedTheme = localStorage.getItem('theme');
        applyTheme(savedTheme === 'dark');
        // console.warn("popup.js: chrome.runtime.sendMessage not available, using localStorage for theme."); // Removed for cleaner console
    }

    // Load saved JSON on startup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        console.log("popup.js: Attempting to load JSON from background on DOMContentLoaded.");
        chrome.runtime.sendMessage({ action: "loadJson" }, (response) => {
            if (response && response.success && response.data) {
                console.log("popup.js: Received JSON data from background. Setting input value and formatting.");
                jsonInput.value = response.data;
                formatJson(); // Format and display the loaded JSON
            } else if (response && !response.success) {
                console.error("popup.js: Failed to load JSON via background:", response.error);
            } else {
                console.log("popup.js: No JSON data found in storage on startup.");
            }
        });
    } else {
        // Fallback for non-extension environments
        const lastJson = localStorage.getItem('lastJsonInput');
        if (lastJson) {
            jsonInput.value = lastJson;
            formatJson(); // Format and display the loaded JSON
            console.warn("popup.js: Using localStorage for JSON (non-extension env).");
        } else {
            console.log("popup.js: No localStorage JSON found (non-extension env).");
        }
    }


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
        if (file) {
            if (file.type === "application/json" || file.name.endsWith(".json")) {
                displayMessage('Processing file. Popup may close.', 'info');
                readJsonFile(file);
            } else {
                displayMessage('Please drop a valid JSON file (.json or application/json type).', 'error');
            }
        } else {
            displayMessage('No file was dropped.', 'error');
        }
    });

    // === Upload JSON File ===
    uploadBtn.addEventListener("click", () => {
        jsonFileInput.value = "";
        displayMessage('Opening file dialog. Popup may close.', 'info');
        jsonFileInput.click();
    });

    jsonFileInput.addEventListener("change", () => {
        const file = jsonFileInput.files[0];
        if (file) {
            if (file.type === "application/json" || file.name.endsWith(".json")) {
                readJsonFile(file);
            } else {
                displayMessage('Please select a valid JSON file (.json or application/json type).', 'error');
            }
        } else {
            displayMessage('No file was selected.', 'error');
        }
    });

    // === Read & Display File ===
    function readJsonFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                jsonInput.value = event.target.result;
                formatJson();
                displayMessage('JSON file processed successfully!', 'success');
            } catch (e) {
                console.error('popup.js: Error processing file content after read:', e);
                displayMessage('Error processing file content: ' + e.message, 'error');
            }
        };
        reader.onerror = (error) => {
            console.error('popup.js: Error reading file:', error);
            displayMessage('Error reading file: ' + error.message, 'error');
        };
        reader.readAsText(file);
    }

    // --- JSON Formatting & Display (Unified) ---
    function formatJson() {
        const input = jsonInput.value.trim();
        if (!input) {
            formattedOutputContainer.style.display = 'none';
            copyBtn.style.display = 'none';
            downloadBtn.style.display = 'none';
            searchBtn.style.display = 'none';
            searchContainer.style.display = 'none';
            clearSearchHighlights();
            // Also clear stored JSON if input is empty
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: "clearJson" }, (response) => {
                    if (response && !response.success) {
                        console.error("popup.js: Failed to clear JSON via background (input empty):", response.error);
                    }
                });
            } else {
                localStorage.removeItem('lastJsonInput');
            }
            return;
        }

        try {
            const obj = JSON.parse(input);
            const formattedText = JSON.stringify(obj, null, 2);
            originalFormattedLines = formattedText.split('\n');

            formattedOutputContainer.style.display = 'block';
            copyBtn.style.display = 'inline-block';
            downloadBtn.style.display = 'inline-block';

            // Monaco Editor dark mode support
            const isDarkMode = document.body.classList.contains('dark-mode');

            // if editor was loaded, update content
            if (typeof monaco !== 'undefined' && monaco.editor) {
                const editor = monaco.editor.getModels()[0];
                if (editor) {
                    editor.setValue(formattedText);
                    editor.updateOptions({ theme: isDarkMode ? "vs-dark" : "vs-light" });
                } else {
                    monaco.editor.create(formattedOutputContainer, {
                        value: formattedText,
                        language: "json",
                        automaticLayout: true,
                        theme: isDarkMode ? "vs-dark" : "vs-light"
                    });
                }
            }

            // Save the valid JSON to storage via background script
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                console.log("popup.js: Sending saveJson message to background (valid input).");
                chrome.runtime.sendMessage({ action: "saveJson", data: input }, (response) => {
                    if (response && !response.success) {
                        console.error("popup.js: Failed to save JSON via background (valid input):", response.error);
                    }
                });
            } else {
                localStorage.setItem('lastJsonInput', input);
            }

        } catch (e) {
            console.error('popup.js: Invalid JSON:', e);
            displayMessage('Invalid JSON: ' + e.message, 'error');
            formattedOutput.innerHTML = '<div class="diff-removed">❌ Invalid JSON: ' + e.message + '</div>';
            
            formattedOutputContainer.style.display = 'block'; // Still try to show error output
            copyBtn.style.display = 'none';
            downloadBtn.style.display = 'none';
            searchBtn.style.display = 'none';
            searchContainer.style.display = 'none';
            clearSearchHighlights();
            // Clear stored JSON if input is invalid
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: "clearJson" }, (response) => {
                    if (response && !response.success) {
                        console.error("popup.js: Failed to clear JSON via background (input invalid):", response.error);
                    }
                });
            } else {
                localStorage.removeItem('lastJsonInput');
            }
        }
    }

    prettifyBtn.addEventListener('click', formatJson);

    // --- Search Functionality ---

    function clearSearchHighlights() {
        let formattedHTML = "";
        originalFormattedLines.forEach((line) => {
            const safeLine = line.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            formattedHTML += `<div>${safeLine}</div>`;
        });
        formattedOutput.innerHTML = formattedHTML;

        matches = [];
        currentMatchIndex = -1;
        searchMatchCount.textContent = '';
    }

    function highlightMatches(searchTerm) {
        if (!searchTerm || !originalFormattedLines.length) {
            return;
        }
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSearchTerm, 'gi');

        matches = [];

        const lineDivs = formattedOutput.querySelectorAll('div');
        lineDivs.forEach((lineDiv, lineIndex) => {
            const originalLineText = originalFormattedLines[lineIndex];
            let lineHtml = '';
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(originalLineText)) !== null) {
                matches.push({
                    lineIndex: lineIndex,
                    start: match.index,
                    end: match.index + match[0].length,
                    value: match[0],
                    element: lineDiv
                });

                lineHtml += originalLineText.substring(lastIndex, match.index);
                lineHtml += `<span class="search-highlight">${match[0]}</span>`;
                lastIndex = regex.lastIndex;
            }
            lineDiv.innerHTML = lineHtml || originalLineText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        });
    }

    function performSearch() {
        const searchTerm = searchInput.value.trim();
        clearSearchHighlights();

        if (!searchTerm || !originalFormattedLines.length) {
            searchMatchCount.textContent = '0 of 0';
            currentMatchIndex = -1;
            return;
        }

        highlightMatches(searchTerm);

        if (matches.length > 0) {
            searchMatchCount.textContent = `1 of ${matches.length}`;
            currentMatchIndex = 0;
            scrollToMatch(currentMatchIndex);
        } else {
            searchMatchCount.textContent = '0 of 0';
            currentMatchIndex = -1;
        }
    }

    function scrollToMatch(index) {
        if (matches.length === 0 || index < 0 || index >= matches.length) {
            return;
        }

        const prevActive = formattedOutput.querySelector('.active-highlight');
        if (prevActive) {
            prevActive.classList.remove('active-highlight');
        }

        const currentMatch = matches[index];
        if (currentMatch && currentMatch.element) {
            const lineDiv = currentMatch.element;
            const originalLineText = originalFormattedLines[currentMatch.lineIndex];
            const escapedSearchTerm = searchInput.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedSearchTerm, 'gi');
            
            let lineHtml = '';
            let lastIndex = 0;
            let spanCount = 0;

            while ((match = regex.exec(originalLineText)) !== null) {
                lineHtml += originalLineText.substring(lastIndex, match.index);
                lineHtml += `<span class="search-highlight temp-span-${spanCount}">${match[0]}</span>`;
                lastIndex = regex.lastIndex;
                spanCount++;
            }
            lineDiv.innerHTML = lineHtml || originalLineText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            const allSpansInLine = lineDiv.querySelectorAll('.search-highlight');
            let targetSpan = null;
            if (allSpansInLine[currentSpanIndexInLine]) {
                targetSpan = allSpansInLine[currentSpanIndexInLine];
            }


            if (targetSpan) {
                targetSpan.classList.add('active-highlight');
                targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
                searchMatchCount.textContent = `${index + 1} of ${matches.length}`;
                currentMatchIndex = index;
            } else {
                // console.warn("Target span for scrolling not found.");
            }
        }
    }


    // --- Event Listeners ---

    copyBtn.addEventListener("click", () => {
        const textarea = document.createElement('textarea');
        textarea.value = originalFormattedLines.join('\n');
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            displayMessage('Copied!', 'success');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            displayMessage('Failed to copy!', 'error');
        } finally {
            document.body.removeChild(textarea);
        }
    });

    downloadBtn.addEventListener("click", () => {
        try {
            const blob = new Blob([originalFormattedLines.join('\n')], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "formatted.json";
            a.click();

            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Error during download:', e);
            displayMessage('Nothing to download or invalid JSON.', 'error');
        }
    });

    clearBtn.addEventListener("click", () => {
        jsonInput.value = '';
        formattedOutput.innerHTML = '';
        formattedOutputContainer.style.display = 'none';
        copyBtn.style.display = 'none';
        downloadBtn.style.display = 'none';
        searchBtn.style.display = 'none';
        searchContainer.style.display = 'none';
        originalFormattedLines = [];
        clearSearchHighlights();

        jsonA.value = '';
        jsonB.value = '';
        compareResult.style.display = 'none';
        outputA.innerHTML = '';
        outputB.innerHTML = '';

        // Clear stored JSON via background script
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "clearJson" }, (response) => {
                if (response && !response.success) {
                    console.error("popup.js: Failed to clear JSON via background (clear button):", response.error);
                }
            });
        } else {
            localStorage.removeItem('lastJsonInput');
        }
    });

    themeToggle.addEventListener("click", () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('darkMode', (data) => {
                applyTheme(!data.darkMode);
            });
        } else {
            const isDark = document.body.classList.contains("dark-mode");
            applyTheme(!isDark);
        }
    });

    modeSelector.addEventListener("change", (event) => {
        if (event.target.value === "format") {
            jsonFormatMode.style.display = "block";
            jsonCompareMode.style.display = "none";
            if (formattedOutputContainer.style.display === 'block') {
                searchBtn.style.display = 'inline-block';
            } else {
                searchBtn.style.display = 'none';
            }
            searchContainer.style.display = 'none';
            clearSearchHighlights();
        } else {
            jsonFormatMode.style.display = "none";
            jsonCompareMode.style.display = "block";
            searchBtn.style.display = 'none';
            searchContainer.style.display = 'none';
            clearSearchHighlights();
        }
    });

    // Search event listeners
    searchBtn.addEventListener('click', () => {
        const isSearchVisible = searchContainer.style.display === 'flex';
        searchContainer.style.display = isSearchVisible ? 'none' : 'flex';
        searchBtn.style.display = isSearchVisible ? 'inline-block' : 'none';
        if (!isSearchVisible) {
            searchInput.focus();
            performSearch();
        } else {
            clearSearchHighlights();
        }
    });

    closeSearchBtn.addEventListener('click', () => {
        searchContainer.style.display = 'none';
        searchBtn.style.display = 'inline-block';
        clearSearchHighlights();
    });

    searchInput.addEventListener('input', performSearch);

    nextMatchBtn.addEventListener('click', () => {
        if (matches.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % matches.length;
        scrollToMatch(currentMatchIndex);
    });

    prevMatchBtn.addEventListener('click', () => {
        if (matches.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
        scrollToMatch(currentMatchIndex);
    });

    // --- JSON Compare Functionality (Existing, slightly adapted) ---

    compareBtn.addEventListener("click", () => {
        const jsonAValue = jsonA.value.trim();
        const jsonBValue = jsonB.value.trim();

        if (!jsonAValue || !jsonBValue) {
            compareResult.style.display = 'none';
            outputA.innerHTML = '<div class="diff-removed">Please paste both JSONs.</div>';
            outputB.innerHTML = '';
            displayMessage('Please paste both JSONs for comparison.', 'error');
            return;
        }

        try {
            const objA = JSON.parse(jsonAValue);
            const objB = JSON.parse(jsonBValue);

            const diff = getJsonDiff(objA, objB);

            outputA.innerHTML = formatDiff(objA, diff.removed, 'removed');
            outputB.innerHTML = formatDiff(objB, diff.added, 'added');

            document.getElementById("compareResult").style.display = "flex";
        } catch (e) {
            console.error('Error during JSON comparison:', e);
            displayMessage('Invalid JSON in A or B: ' + e.message, 'error');
            document.getElementById("compareResult").style.display = "block";
            outputA.innerHTML = `<div class="diff-removed">❌ Invalid JSON A: ${e.message}</div>`;
            outputB.innerHTML = `<div class="diff-removed">❌ Invalid JSON B: ${e.message}</div>`;
        }
    });

    function getJsonDiff(obj1, obj2) {
        const removed = {};
        const added = {};

        for (const key in obj1) {
            if (!obj2.hasOwnProperty(key)) {
                removed[key] = obj1[key];
            } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
                removed[key] = obj1[key];
            }
        }

        for (const key in obj2) {
            if (!obj1.hasOwnProperty(key)) {
                added[key] = obj2[key];
            } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
                added[key] = obj2[key];
            }
        }
        return { removed, added };
    }

    function formatDiff(obj, diffObj, type) {
        const formattedText = JSON.stringify(obj, null, 2);
        const lines = formattedText.split('\n');
        let htmlOutput = '';

        lines.forEach(line => {
            let lineHtml = line.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            let lineClass = '';

            let isDiffLine = false;
            for (const key in diffObj) {
                const value = JSON.stringify(diffObj[key]);
                if (line.includes(`"${key}"`) || line.includes(value) || line.includes(String(diffObj[key]))) {
                    isDiffLine = true;
                    break;
                }
            }

            if (isDiffLine) {
                lineClass = `diff-${type}`;
            }

            htmlOutput += `<div class="${lineClass}">${lineHtml}</div>`;
        });
        return htmlOutput;
    }

    function displayMessage(message, type = 'info') {
        const messageBox = document.createElement('div');
        messageBox.textContent = message;
        messageBox.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        `;
        document.body.appendChild(messageBox);

        setTimeout(() => {
            messageBox.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.addEventListener('transitionend', () => messageBox.remove());
        }, 3000);
    }
});
