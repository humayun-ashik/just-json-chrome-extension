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
    const outputB = document.getElementById('outputB');

    // State variables for search
    let matches = [];
    let currentMatchIndex = -1;
    // Store original formatted content as an array of lines for line numbers
    let originalFormattedLines = [];

    // --- Utility Functions ---

    // Function to apply/remove dark mode
    function applyTheme(isDarkMode) {
        document.body.classList.toggle('dark-mode', isDarkMode);
        // Update icon based on mode
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';

        // Store preference - using chrome.storage.local for extensions, localStorage for local testing
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ darkMode: isDarkMode });
        } else {
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        }
    }

    // Load theme preference on startup
    // Check for chrome.storage.local first, then fallback to localStorage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('darkMode', (data) => {
            applyTheme(data.darkMode || false); // Default to light mode
        });
    } else {
        const savedTheme = localStorage.getItem('theme');
        applyTheme(savedTheme === 'dark'); // Default to light mode if no saved theme
    }

    // === Drag & Drop on textarea ===
    jsonInput.addEventListener("dragover", (e) => {
        e.preventDefault();
        jsonInput.style.borderColor = "#333";
        console.log('Dragover event detected.');
    });

    jsonInput.addEventListener("dragleave", () => {
        jsonInput.style.borderColor = "#aaa";
        console.log('Dragleave event detected.');
    });

    jsonInput.addEventListener("drop", (e) => {
        e.preventDefault();
        jsonInput.style.borderColor = "#aaa";
        console.log('Drop event detected.');
        const file = e.dataTransfer.files[0];
        if (file) {
            console.log('File dropped:', file.name, file.type);
            if (file.name.endsWith(".json") || file.type === "application/json") {
                readJsonFile(file);
            } else {
                displayMessage('Please drop a valid .json file.', 'error');
                console.warn('Dropped file is not a JSON file:', file.name, file.type);
            }
        } else {
            console.warn('No file found in drop event.');
        }
    });

    // === Upload JSON File ===
    uploadBtn.addEventListener("click", () => {
        console.log('Upload button clicked.');
        jsonFileInput.value = ""; // Reset the input to allow re-uploading the same file
        jsonFileInput.click();
    });

    jsonFileInput.addEventListener("change", () => {
        console.log('File input change event detected.');
        const file = jsonFileInput.files[0];
        if (file) {
            console.log('File selected:', file.name, file.type);
            if (file.name.endsWith(".json") || file.type === "application/json") {
                readJsonFile(file);
            } else {
                displayMessage('Please select a valid .json file.', 'error');
                console.warn('Selected file is not a JSON file:', file.name, file.type);
            }
        } else {
            console.warn('No file selected in input change event.');
        }
    });

    // === Read & Display File ===
    function readJsonFile(file) {
        console.log('Attempting to read file:', file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            console.log('File read successfully. Content length:', event.target.result.length);
            jsonInput.value = event.target.result;
            console.log('Calling formatJson after file read.');
            formatJson(); // Call the unified formatJson function
        };
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            displayMessage('Error reading file.', 'error');
        };
        reader.readAsText(file);
    }

    // --- JSON Formatting & Display (Unified) ---
    function formatJson() {
        const input = jsonInput.value.trim();
        console.log('formatJson called. Input length:', input.length);
        if (!input) {
            console.log('Input is empty, hiding output elements.');
            formattedOutputContainer.style.display = 'none';
            copyBtn.style.display = 'none';
            downloadBtn.style.display = 'none';
            searchBtn.style.display = 'none'; // Hide search icon if no input
            searchContainer.style.display = 'none'; // Hide search bar
            clearSearchHighlights(); // Clear any existing highlights
            return;
        }

        try {
            const obj = JSON.parse(input);
            console.log('JSON parsed successfully.');
            const formattedText = JSON.stringify(obj, null, 2);
            originalFormattedLines = formattedText.split('\n'); // Store as array of lines

            let formattedHTML = "";
            originalFormattedLines.forEach((line) => {
                const safeLine = line.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                formattedHTML += `<div>${safeLine}</div>`;
            });
            formattedOutput.innerHTML = formattedHTML; // Set HTML with divs

            formattedOutputContainer.style.display = 'block';
            copyBtn.style.display = 'inline-block';
            downloadBtn.style.display = 'inline-block';
            searchBtn.style.display = 'inline-block'; // Show search icon after prettifying

            // If search bar was active, re-run search on new content
            if (searchContainer.style.display === 'flex') {
                console.log('Search container was open, re-performing search.');
                performSearch();
            }
        } catch (e) {
            console.error('Invalid JSON:', e);
            formattedOutput.innerHTML = '<div class="diff-removed">❌ Invalid JSON: ' + e.message + '</div>';
            formattedOutputContainer.style.display = 'block';
            copyBtn.style.display = 'none';
            downloadBtn.style.display = 'none';
            searchBtn.style.display = 'none'; // Hide search icon on error
            searchContainer.style.display = 'none'; // Hide search bar
            clearSearchHighlights(); // Clear any existing highlights
        }
    }

    prettifyBtn.addEventListener('click', formatJson); // Use the unified formatJson

    // --- Search Functionality ---

    function clearSearchHighlights() {
        console.log('Clearing search highlights.');
        // Rebuild innerHTML from originalFormattedLines to remove highlights
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
            console.log('No search term or no content to highlight.');
            return;
        }
        console.log('Highlighting matches for term:', searchTerm);
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSearchTerm, 'gi');

        matches = []; // Reset matches for new search

        const lineDivs = formattedOutput.querySelectorAll('div');
        lineDivs.forEach((lineDiv, lineIndex) => {
            const originalLineText = originalFormattedLines[lineIndex]; // Get original text for this line
            let lineHtml = '';
            let lastIndex = 0;
            let match;

            // Search within the original text of this line
            while ((match = regex.exec(originalLineText)) !== null) {
                // Store match details including line index
                matches.push({
                    lineIndex: lineIndex,
                    start: match.index,
                    end: match.index + match[0].length,
                    value: match[0],
                    element: lineDiv // Store reference to the div element
                });

                lineHtml += originalLineText.substring(lastIndex, match.index);
                lineHtml += `<span class="search-highlight">${match[0]}</span>`;
                lastIndex = regex.lastIndex;
            }
            lineDiv.innerHTML = lineHtml || originalLineText.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Fallback if no match
        });
        console.log('Total matches found:', matches.length);
    }

    function performSearch() {
        const searchTerm = searchInput.value.trim();
        console.log('Performing search for:', searchTerm);
        clearSearchHighlights(); // Clear previous highlights first

        if (!searchTerm || !originalFormattedLines.length) {
            searchMatchCount.textContent = '0 of 0';
            currentMatchIndex = -1;
            return;
        }

        highlightMatches(searchTerm); // This now updates the DOM directly

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
        console.log('Scrolling to match index:', index);
        if (matches.length === 0 || index < 0 || index >= matches.length) {
            console.warn('Invalid match index or no matches to scroll to.');
            return;
        }

        // Remove active class from previous highlight
        const prevActive = formattedOutput.querySelector('.active-highlight');
        if (prevActive) {
            prevActive.classList.remove('active-highlight');
        }

        // Get the current match's span element
        const currentMatch = matches[index];
        if (currentMatch && currentMatch.element) {
            // Re-apply highlight to ensure it's a span (in case it was cleared and re-highlighted)
            const lineDiv = currentMatch.element;
            const originalLineText = originalFormattedLines[currentMatch.lineIndex];
            const escapedSearchTerm = searchInput.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedSearchTerm, 'gi');
            
            let lineHtml = '';
            let lastIndex = 0;
            let spanCount = 0; // To find the correct span if multiple on one line

            while ((match = regex.exec(originalLineText)) !== null) {
                lineHtml += originalLineText.substring(lastIndex, match.index);
                lineHtml += `<span class="search-highlight temp-span-${spanCount}">${match[0]}</span>`; // Use temp class
                lastIndex = regex.lastIndex;
                spanCount++;
            }
            lineDiv.innerHTML = lineHtml || originalLineText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            // Find the specific span that corresponds to the currentMatch
            const allSpansInLine = lineDiv.querySelectorAll('.search-highlight');
            let currentSpanIndexInLine = 0;
            for (let i = 0; i < index; i++) {
                if (matches[i].lineIndex === currentMatch.lineIndex) {
                    currentSpanIndexInLine++;
                }
            }
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
                console.warn("Target span for scrolling not found.");
            }
        }
    }


    // --- Event Listeners ---

    copyBtn.addEventListener("click", () => {
        // Use document.execCommand('copy') for better compatibility in Chrome Extensions
        const textarea = document.createElement('textarea');
        // Copy plain text content (without highlights)
        textarea.value = originalFormattedLines.join('\n');
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            displayMessage('Copied!', 'success');
            console.log('Content copied to clipboard.');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            displayMessage('Failed to copy!', 'error');
        } finally {
            document.body.removeChild(textarea);
        }
    });

    downloadBtn.addEventListener("click", () => {
        try {
            // Download plain text content (without highlights)
            const blob = new Blob([originalFormattedLines.join('\n')], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "formatted.json";
            a.click();

            URL.revokeObjectURL(url);
            console.log('JSON file download initiated.');
        } catch (e) {
            console.error('Error during download:', e);
            displayMessage('Nothing to download or invalid JSON.', 'error');
        }
    });

    clearBtn.addEventListener("click", () => {
        console.log('Clear button clicked.');
        jsonInput.value = '';
        formattedOutput.innerHTML = ''; // Clear HTML content
        formattedOutputContainer.style.display = 'none';
        copyBtn.style.display = 'none';
        downloadBtn.style.display = 'none';
        searchBtn.style.display = 'none'; // Hide search icon
        searchContainer.style.display = 'none'; // Hide search bar
        originalFormattedLines = []; // Clear original lines
        clearSearchHighlights(); // Clear any existing highlights

        jsonA.value = '';
        jsonB.value = '';
        compareResult.style.display = 'none';
        outputA.innerHTML = ''; // Clear compare outputs
        outputB.innerHTML = '';
        console.log('All fields and outputs cleared.');
    });

    themeToggle.addEventListener("click", () => {
        console.log('Theme toggle clicked.');
        // Check for chrome.storage.local first, then fallback to localStorage
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
        console.log('Mode changed to:', event.target.value);
        if (event.target.value === "format") {
            jsonFormatMode.style.display = "block";
            jsonCompareMode.style.display = "none";
            // Ensure search elements are hidden/shown based on format mode state
            if (formattedOutputContainer.style.display === 'block') {
                searchBtn.style.display = 'inline-block';
            } else {
                searchBtn.style.display = 'none';
            }
            searchContainer.style.display = 'none'; // Hide search bar when switching away and back
            clearSearchHighlights(); // Clear highlights when switching modes
        } else {
            jsonFormatMode.style.display = "none";
            jsonCompareMode.style.display = "block";
            searchBtn.style.display = 'none'; // Hide search icon in compare mode
            searchContainer.style.display = 'none'; // Hide search bar in compare mode
            clearSearchHighlights(); // Clear highlights when switching modes
        }
    });

    // Search event listeners
    searchBtn.addEventListener('click', () => {
        console.log('Search icon clicked.');
        // Toggle visibility of the search bar
        const isSearchVisible = searchContainer.style.display === 'flex';
        searchContainer.style.display = isSearchVisible ? 'none' : 'flex';
        searchBtn.style.display = isSearchVisible ? 'inline-block' : 'none'; // Toggle search icon visibility
        if (!isSearchVisible) { // If search bar is now visible
            searchInput.focus();
            performSearch(); // Perform search immediately when opened
        } else {
            clearSearchHighlights(); // Clear highlights when search bar is closed
        }
    });

    closeSearchBtn.addEventListener('click', () => {
        console.log('Close search button clicked.');
        searchContainer.style.display = 'none';
        searchBtn.style.display = 'inline-block'; // Show search icon when closing
        clearSearchHighlights();
    });

    searchInput.addEventListener('input', performSearch); // Live search as user types

    nextMatchBtn.addEventListener('click', () => {
        console.log('Next match button clicked.');
        if (matches.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % matches.length;
        scrollToMatch(currentMatchIndex);
    });

    prevMatchBtn.addEventListener('click', () => {
        console.log('Previous match button clicked.');
        if (matches.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
        scrollToMatch(currentMatchIndex);
    });

    // --- JSON Compare Functionality (Existing, slightly adapted) ---

    compareBtn.addEventListener("click", () => {
        console.log('Compare button clicked.');
        const jsonAValue = jsonA.value.trim();
        const jsonBValue = jsonB.value.trim();

        if (!jsonAValue || !jsonBValue) {
            console.warn('One or both JSON inputs for compare are empty.');
            compareResult.style.display = 'none';
            outputA.innerHTML = '<div class="diff-removed">Please paste both JSONs.</div>';
            outputB.innerHTML = ''; // Ensure B is also cleared
            return;
        }

        try {
            const objA = JSON.parse(jsonAValue);
            const objB = JSON.parse(jsonBValue);
            console.log('JSONs parsed for comparison.');

            const diff = getJsonDiff(objA, objB);

            // Ensure compare outputs also use div-per-line structure for line numbers
            outputA.innerHTML = formatDiff(objA, diff.removed, 'removed');
            outputB.innerHTML = formatDiff(objB, diff.added, 'added');

            document.getElementById("compareResult").style.display = "flex"; // Use flex for side-by-side
            console.log('Comparison results displayed.');
        } catch (e) {
            console.error('Error during JSON comparison:', e);
            document.getElementById("compareResult").style.display = "block";
            outputA.innerHTML = `<div class="diff-removed">❌ Invalid JSON A: ${e.message}</div>`;
            outputB.innerHTML = `<div class="diff-removed">❌ Invalid JSON B: ${e.message}</div>`;
        }
    });

    // Simple diffing logic (can be replaced with a more robust library)
    function getJsonDiff(obj1, obj2) {
        const removed = {};
        const added = {};

        // Check for removed/changed in obj1
        for (const key in obj1) {
            if (!obj2.hasOwnProperty(key)) {
                removed[key] = obj1[key];
            } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
                removed[key] = obj1[key];
            }
        }

        // Check for added/changed in obj2
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
            let lineHtml = line.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Start with safe HTML
            let lineClass = '';

            // Check if this line contains any key or value from the diffObj
            let isDiffLine = false;
            for (const key in diffObj) {
                const value = JSON.stringify(diffObj[key]); // Stringified value
                // Check for key or value (both quoted and unquoted for strings)
                if (line.includes(`"${key}"`) || line.includes(value) || line.includes(String(diffObj[key]))) {
                    isDiffLine = true;
                    break;
                }
            }

            if (isDiffLine) {
                lineClass = `diff-${type}`; // Use the class directly from type (e.g., 'diff-removed', 'diff-added')
            }

            htmlOutput += `<div class="${lineClass}">${lineHtml}</div>`;
        });
        return htmlOutput;
    }

    // Custom message box function (replaces alert())
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
        }, 10); // Small delay to trigger transition

        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.addEventListener('transitionend', () => messageBox.remove());
        }, 3000);
    }
});
