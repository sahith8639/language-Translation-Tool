/* ==========================================================================
   MultiLingo AI - Application Orchestrator (Modern Vanilla JavaScript)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Language Code to Name Mapping
    const LANGUAGE_NAMES = {
        'auto': 'Auto Detect',
        'en': 'English',
        'te': 'Telugu',
        'hi': 'Hindi',
        'ta': 'Tamil',
        'kn': 'Kannada',
        'ml': 'Malayalam',
        'bn': 'Bengali',
        'mr': 'Marathi',
        'gu': 'Gujarati',
        'pa': 'Punjabi',
        'ur': 'Urdu',
        'fr': 'French',
        'de': 'German',
        'es': 'Spanish',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh-cn': 'Chinese (Simplified)',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic'
    };

    // DOM Element Declarations
    const srcLangSelect = document.getElementById('src-lang-select');
    const tgtLangSelect = document.getElementById('tgt-lang-select');
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    
    const clearTextBtn = document.getElementById('clear-text-btn');
    const voiceInputBtn = document.getElementById('voice-input-btn');
    const swapLangBtn = document.getElementById('swap-lang-btn');
    
    const copyBtn = document.getElementById('copy-btn');
    const speakBtn = document.getElementById('speak-btn');
    const downloadBtn = document.getElementById('download-btn');
    const translateTriggerBtn = document.getElementById('translate-trigger-btn');
    
    const charCountSpan = document.getElementById('char-count');
    const detectedBadge = document.getElementById('detected-badge');
    const detectedLangName = document.getElementById('detected-lang-name');
    const translateLoader = document.getElementById('translate-loader');
    
    const historyContainer = document.getElementById('history-items-container');
    const emptyHistoryMsg = document.getElementById('empty-history-msg');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    
    const toastContainer = document.getElementById('toast-container');

    // State Variables
    let debounceTimer = null;
    let isTranslating = false;
    let lastTranslatedText = "";
    
    // TTS (Text to Speech) State
    let speechSynth = window.speechSynthesis;
    let audioPlayer = null; // gTTS Audio object fallback
    let isSpeaking = false;

    // Dictation (Speech to Text) State
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isRecording = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
    }

    // ==========================================================================
    // Initialization & Event Listeners
    // ==========================================================================
    
    // Initialize language voices if Speech API is available
    if (speechSynth) {
        // Chrome loads voices asynchronously
        if (speechSynth.onvoiceschanged !== undefined) {
            speechSynth.onvoiceschanged = () => {};
        }
    }

    // Event Bindings
    sourceText.addEventListener('input', handleSourceTextInput);
    translateTriggerBtn.addEventListener('click', handleManualTranslate);
    clearTextBtn.addEventListener('click', handleClearText);
    swapLangBtn.addEventListener('click', handleSwapLanguages);
    
    copyBtn.addEventListener('click', handleCopyText);
    speakBtn.addEventListener('click', handleSpeakText);
    downloadBtn.addEventListener('click', handleDownloadTranslation);
    
    clearHistoryBtn.addEventListener('click', handleClearHistory);
    
    // Keyboard Shortcut: Ctrl + Enter to Translate, Ctrl + S to Swap
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            handleManualTranslate();
        }
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSwapLanguages();
        }
    });

    // Populate voice dictation capability
    if (recognition) {
        voiceInputBtn.addEventListener('click', toggleVoiceDictation);
        setupRecognitionCallbacks();
    } else {
        voiceInputBtn.style.display = 'none'; // Hide if browser doesn't support STT
    }

    // Load Cache/History on load
    renderHistoryHub();

    // ==========================================================================
    // Core Handlers & Logical Pipelines
    // ==========================================================================

    /**
     * Handles keypress/typing in the source textarea, enforcing limit & debouncing auto-translation
     */
    function handleSourceTextInput() {
        const text = sourceText.value;
        const length = text.length;

        // Character Limit Display UI adjustments
        charCountSpan.textContent = length;
        if (length >= 4800) {
            charCountSpan.parentElement.className = 'character-counter error';
        } else if (length >= 4000) {
            charCountSpan.parentElement.className = 'character-counter warning';
        } else {
            charCountSpan.parentElement.className = 'character-counter';
        }

        if (!text.trim()) {
            handleClearText();
            return;
        }

        // Enable translation trigger button
        translateTriggerBtn.disabled = false;

        // Debounce auto-translate (1 second of inactivity triggers translation automatically)
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performTranslation(false);
        }, 1200);
    }

    /**
     * Triggered by the explicit 'Translate Document' UI button click
     */
    function handleManualTranslate() {
        if (isTranslating) return;
        
        const text = sourceText.value.trim();
        if (!text) {
            showToast('Warning', 'Please enter text to translate before running.', 'warning');
            return;
        }
        
        clearTimeout(debounceTimer);
        performTranslation(true);
    }

    /**
     * Dispatches POST /translate request to Flask application
     */
    async function performTranslation(isManual = false) {
        const text = sourceText.value.trim();
        const sourceLang = srcLangSelect.value;
        const targetLang = tgtLangSelect.value;

        if (!text) return;
        if (isTranslating) return;
        
        // Prevent translating exact duplicate text twice unnecessarily
        if (!isManual && text === lastTranslatedText) return;

        isTranslating = true;
        setTranslationUILoading(true);

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    source: sourceLang,
                    target: targetLang
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Server error occurred during translation.');
            }

            // Populate text result
            targetText.value = data.translated_text;
            lastTranslatedText = text;

            // Handle source language detection badge
            if (sourceLang === 'auto' && data.detected_language) {
                const detectedName = LANGUAGE_NAMES[data.detected_language] || data.detected_language;
                detectedLangName.textContent = detectedName;
                detectedBadge.classList.remove('hidden');
            } else {
                detectedBadge.classList.add('hidden');
            }

            // Enable action outputs
            setActionButtonsState(true);

            // Add successful event to History Hub
            saveTranslationToHistory(text, data.translated_text, sourceLang, targetLang, data.detected_language);
            
            if (isManual) {
                showToast('Success', 'Translation compiled successfully!', 'success');
            }

        } catch (error) {
            console.error('Translation error:', error);
            showToast('Translation Failed', error.message || 'Unable to contact neural translation service.', 'error');
            targetText.value = '⚠️ Translation failed. Please check your internet connection or server status.';
            setActionButtonsState(false);
        } finally {
            isTranslating = false;
            setTranslationUILoading(false);
        }
    }

    /**
     * Clears all fields and resets panel states
     */
    function handleClearText() {
        sourceText.value = '';
        targetText.value = '';
        lastTranslatedText = '';
        charCountSpan.textContent = '0';
        charCountSpan.parentElement.className = 'character-counter';
        
        detectedBadge.classList.add('hidden');
        setActionButtonsState(false);
        
        clearTimeout(debounceTimer);
        
        if (isSpeaking) {
            stopSpeaking();
        }
    }

    /**
     * Swaps selected languages and swaps corresponding texts
     */
    function handleSwapLanguages() {
        const currentSrc = srcLangSelect.value;
        const currentTgt = tgtLangSelect.value;
        
        const srcTextVal = sourceText.value.trim();
        const tgtTextVal = targetText.value.trim();

        // If source was 'auto', we swap to standard target language logic.
        // Google Translate standard: Swap 'auto' with whatever target language was.
        // But since target cannot be auto, if we swap, source becomes the target,
        // and target becomes either the detected source language, or English if none was detected yet.
        let newSrc = currentTgt;
        let newTgt = currentSrc;

        if (currentSrc === 'auto') {
            // Find detected language if badge is open, else fallback to 'en'
            const badgeHidden = detectedBadge.classList.contains('hidden');
            let detectedCode = 'en';
            
            if (!badgeHidden) {
                const detectedName = detectedLangName.textContent.toLowerCase();
                // Reverse search language code
                for (const [code, name] of Object.entries(LANGUAGE_NAMES)) {
                    if (name.toLowerCase() === detectedName) {
                        detectedCode = code;
                        break;
                    }
                }
            }
            newTgt = detectedCode;
        }

        // Apply visual rotation and values
        srcLangSelect.value = newSrc;
        tgtLangSelect.value = newTgt;

        if (tgtTextVal && !tgtTextVal.startsWith('⚠️')) {
            sourceText.value = tgtTextVal;
            targetText.value = srcTextVal;
            lastTranslatedText = tgtTextVal;
            handleSourceTextInput(); // triggers character updates and debounces translation
        } else if (srcTextVal) {
            // Just clear target and re-trigger translation
            targetText.value = '';
            performTranslation(true);
        }
        
        showToast('Swapped', `Languages swapped: ${LANGUAGE_NAMES[newSrc]} ⇄ ${LANGUAGE_NAMES[newTgt]}`, 'info');
    }

    /**
     * Copy translated outcome to clipboard
     */
    async function handleCopyText() {
        const textToCopy = targetText.value.trim();
        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast('Copied', 'Translated text successfully copied to clipboard!', 'success');
            
            // Brief visual effect on Copy button
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 1800);
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            showToast('Copy Failed', 'Unable to copy text to clipboard.', 'error');
        }
    }

    /**
     * Download text payload as a .txt file
     */
    function handleDownloadTranslation() {
        const text = targetText.value.trim();
        const srcCode = srcLangSelect.value;
        const tgtCode = tgtLangSelect.value;
        
        if (!text) return;

        const srcName = LANGUAGE_NAMES[srcCode] || 'Source';
        const tgtName = LANGUAGE_NAMES[tgtCode] || 'Target';
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `multilingo_translation_${srcCode}_to_${tgtCode}_${timestamp}.txt`;

        const fileContent = `MultiLingo AI Translation Result
=========================================
Date: ${new Date().toLocaleString()}
Languages: ${srcName} ➜ ${tgtName}
=========================================

ORIGINAL TEXT:
-----------------------------------------
${sourceText.value}

TRANSLATION:
-----------------------------------------
${text}

=========================================
Generated via MultiLingo AI Multi-Language Suite.
`;

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filename);
        } else {
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        showToast('Exported', 'Translation downloaded as TXT file!', 'success');
    }

    // ==========================================================================
    // Text To Speech (TTS) Dual-Engine System
    // ==========================================================================

    /**
     * Manages vocal synthesis, utilizing local WebSpeech API or gTTS backend streaming fallback
     */
    function handleSpeakText() {
        const text = targetText.value.trim();
        const lang = tgtLangSelect.value;

        if (!text) return;

        if (isSpeaking) {
            stopSpeaking();
            return;
        }

        isSpeaking = true;
        speakBtn.classList.add('playing');
        speakBtn.innerHTML = '<i class="fa-solid fa-circle-stop"></i> Stop';

        // Check for WebSpeech browser compatibility
        const browserVoice = getWebSpeechVoice(lang);

        if (browserVoice) {
            // Option A: Client-side Web Speech API
            console.log('Using browser SpeechSynthesis voice:', browserVoice.name);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = browserVoice;
            utterance.lang = browserVoice.lang;
            
            utterance.onend = () => {
                stopSpeaking();
            };
            
            utterance.onerror = (e) => {
                console.error('Speech synthesis error:', e);
                // Fall back to server TTS if client utterance throws an error
                speakUsingServerFallback(text, lang);
            };
            
            speechSynth.speak(utterance);
        } else {
            // Option B: Server-side gTTS MP3 Stream Fallback (Crucial for full Telugu/Hindi/Kannada etc coverage)
            console.log('No local browser voice found for language. Fetching server gTTS fallback...');
            speakUsingServerFallback(text, lang);
        }
    }

    /**
     * Resolves matching voice for target language in browser Synthesis engine
     */
    function getWebSpeechVoice(langCode) {
        if (!speechSynth) return null;
        
        // Get all available system voices
        const voices = speechSynth.getVoices();
        if (voices.length === 0) return null;
        
        // Map codes standardizing variations (e.g. 'zh-cn' -> 'zh')
        let testCode = langCode.split('-')[0].toLowerCase();

        // Exact match check (e.g. matching 'te-IN' or 'hi-IN')
        let matchedVoice = voices.find(voice => 
            voice.lang.toLowerCase().replace('_', '-').startsWith(testCode)
        );

        return matchedVoice;
    }

    /**
     * Leverages Flask backend /tts endpoint to play base64-encoded audio streams
     */
    async function speakUsingServerFallback(text, langCode) {
        try {
            const response = await fetch('/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    lang: langCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Server-side speech synthesis failed.');
            }

            // Play base64 audio stream using standard HTML5 audio element
            audioPlayer = new Audio(data.audio_url);
            
            audioPlayer.onended = () => {
                stopSpeaking();
            };
            
            audioPlayer.onerror = (err) => {
                console.error('Audio playback error:', err);
                showToast('Audio Error', 'Failed to play generated voice stream.', 'error');
                stopSpeaking();
            };

            audioPlayer.play();

        } catch (error) {
            console.error('TTS Fallback failed:', error);
            showToast('Voice Unavailable', 'Text-to-speech is unsupported for this language on your browser.', 'warning');
            stopSpeaking();
        }
    }

    /**
     * Halts all active vocal synthesis streams
     */
    function stopSpeaking() {
        isSpeaking = false;
        speakBtn.classList.remove('playing');
        speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
        
        // Cancel browser synthesis
        if (speechSynth) {
            speechSynth.cancel();
        }

        // Cancel audio element
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer = null;
        }
    }

    // ==========================================================================
    // Voice Dictation (Speech to Text) Functions
    // ==========================================================================

    /**
     * Toggles voice dictation recording state
     */
    function toggleVoiceDictation() {
        if (!recognition) return;

        if (isRecording) {
            recognition.stop();
        } else {
            isRecording = true;
            voiceInputBtn.classList.add('recording');
            voiceInputBtn.setAttribute('title', 'Recording... Click to Stop');
            showToast('Voice Input Active', 'Dictate your message now. Listening...', 'info');
            
            // Set recognition language matching selected source language
            const srcLang = srcLangSelect.value;
            recognition.lang = srcLang === 'auto' ? 'en-US' : srcLang;

            recognition.start();
        }
    }

    /**
     * Binds Web SpeechRecognition callbacks
     */
    function setupRecognitionCallbacks() {
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            
            // Append or insert dictated text
            const currentVal = sourceText.value;
            const space = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            sourceText.value = currentVal + space + transcript;
            
            showToast('Voice Input Received', 'Dictation successfully appended to input.', 'success');
            handleSourceTextInput(); // trigger char limit updates & auto-translate
        };

        recognition.onspeechend = () => {
            recognition.stop();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') {
                showToast('Dictation Error', `Speech recognition error: ${event.error}`, 'error');
            }
            stopVoiceDictationUI();
        };

        recognition.onend = () => {
            stopVoiceDictationUI();
        };
    }

    /**
     * Resets visual voice button indicator
     */
    function stopVoiceDictationUI() {
        isRecording = false;
        voiceInputBtn.classList.remove('recording');
        voiceInputBtn.setAttribute('title', 'Voice Input (Speech to Text)');
    }

    // ==========================================================================
    // Translation History Hub Core (LocalStorage Cached Storage)
    // ==========================================================================

    /**
     * Caches successful translation payloads to localStorage
     */
    function saveTranslationToHistory(srcText, tgtText, srcLang, tgtLang, detectedLang) {
        // Build resolved source code
        const resolvedSrc = srcLang === 'auto' ? detectedLang : srcLang;
        
        // Prevent caching error payloads
        if (tgtText.startsWith('⚠️')) return;

        let history = JSON.parse(localStorage.getItem('multilingo_history')) || [];
        
        // Filter out identical duplicates of recent translation to prevent spam
        history = history.filter(item => !(item.srcText.toLowerCase() === srcText.toLowerCase() && item.tgtLang === tgtLang));

        const newItem = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            srcLang: resolvedSrc,
            tgtLang: tgtLang,
            srcText: srcText,
            tgtText: tgtText
        };

        // Insert at beginning of array
        history.unshift(newItem);

        // Keep maximum of 15 history items
        if (history.length > 15) {
            history.pop();
        }

        localStorage.setItem('multilingo_history', JSON.stringify(history));
        renderHistoryHub();
    }

    /**
     * Renders recent cached translations in the visual history drawer
     */
    function renderHistoryHub() {
        const history = JSON.parse(localStorage.getItem('multilingo_history')) || [];

        if (history.length === 0) {
            emptyHistoryMsg.classList.remove('hidden');
            historyContainer.classList.add('hidden');
            clearHistoryBtn.style.display = 'none';
            return;
        }

        emptyHistoryMsg.classList.add('hidden');
        historyContainer.classList.remove('hidden');
        clearHistoryBtn.style.display = 'flex';

        historyContainer.innerHTML = '';

        history.forEach(item => {
            const srcName = LANGUAGE_NAMES[item.srcLang] || item.srcLang;
            const tgtName = LANGUAGE_NAMES[item.tgtLang] || item.tgtLang;

            const historyCard = document.createElement('div');
            historyCard.className = 'history-item';
            historyCard.setAttribute('data-id', item.id);

            historyCard.innerHTML = `
                <div class="item-content">
                    <div class="item-meta">
                        <span>${srcName}</span>
                        <i class="fa-solid fa-arrow-right-long meta-arrow"></i>
                        <span>${tgtName}</span>
                        <span class="text-muted" style="margin-left: auto; text-transform: none; font-size: 0.65rem;">${item.timestamp}</span>
                    </div>
                    <div class="item-text-group">
                        <div class="item-src-text" title="${escapeHtml(item.srcText)}">${escapeHtml(item.srcText)}</div>
                        <div class="item-tgt-text" title="${escapeHtml(item.tgtText)}">${escapeHtml(item.tgtText)}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-action-btn restore" title="Restore translation" data-id="${item.id}">
                        <i class="fa-solid fa-arrow-rotate-left"></i>
                    </button>
                    <button class="item-action-btn delete" title="Remove record" data-id="${item.id}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            // Bind individual card operations
            historyCard.querySelector('.restore').addEventListener('click', () => restoreHistoryItem(item));
            historyCard.querySelector('.delete').addEventListener('click', () => deleteHistoryItem(item.id));

            historyContainer.appendChild(historyCard);
        });
    }

    /**
     * Loads a history record back into the translator interface
     */
    function restoreHistoryItem(item) {
        srcLangSelect.value = item.srcLang;
        tgtLangSelect.value = item.tgtLang;
        sourceText.value = item.srcText;
        targetText.value = item.tgtText;
        lastTranslatedText = item.srcText;
        
        detectedBadge.classList.add('hidden'); // Clear auto badges since we enforce selected code
        handleSourceTextInput();
        
        // Enforce trigger button status
        setActionButtonsState(true);
        
        // Smooth scroll back to translator workspace
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Restored', 'Translation restored to editor.', 'success');
    }

    /**
     * Erases a singular translation card from cache
     */
    function deleteHistoryItem(id) {
        let history = JSON.parse(localStorage.getItem('multilingo_history')) || [];
        history = history.filter(item => item.id !== id);
        localStorage.setItem('multilingo_history', JSON.stringify(history));
        renderHistoryHub();
        showToast('Item Deleted', 'Translation removed from history.', 'info');
    }

    /**
     * Clears all translation records from localStorage
     */
    function handleClearHistory() {
        if (confirm('Are you sure you want to clear your translation history? This action is permanent.')) {
            localStorage.removeItem('multilingo_history');
            renderHistoryHub();
            showToast('History Cleared', 'All translation history successfully purged.', 'info');
        }
    }

    // ==========================================================================
    // UI Helpers & Component Control
    // ==========================================================================

    /**
     * Displays a customized toast modal overlay
     */
    function showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-circle-exclamation';
        if (type === 'warning') iconClass = 'fa-triangle-exclamation';

        toast.innerHTML = `
            <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close-btn"><i class="fa-solid fa-xmark"></i></button>
        `;

        toastContainer.appendChild(toast);

        // Bind manual dismiss button
        toast.querySelector('.toast-close-btn').addEventListener('click', () => {
            dismissToast(toast);
        });

        // Auto dismiss after 4.5 seconds
        setTimeout(() => {
            dismissToast(toast);
        }, 4500);
    }

    function dismissToast(toast) {
        if (toast.parentElement) {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }
    }

    /**
     * Sets target column loading elements
     */
    function setTranslationUILoading(isLoading) {
        if (isLoading) {
            translateLoader.classList.add('active');
            translateTriggerBtn.disabled = true;
            translateTriggerBtn.innerHTML = '<span class="btn-text">Translating...</span> <div class="spinner-ring" style="width: 18px; height: 18px; border-width: 2px;"></div>';
        } else {
            translateLoader.classList.remove('active');
            translateTriggerBtn.disabled = false;
            translateTriggerBtn.innerHTML = '<span class="btn-text">Translate Document</span> <i class="fa-solid fa-wand-magic-sparkles btn-icon"></i>';
        }
    }

    /**
     * Disables or enables secondary actions
     */
    function setActionButtonsState(enabled) {
        copyBtn.disabled = !enabled;
        speakBtn.disabled = !enabled;
        downloadBtn.disabled = !enabled;
    }

    /**
     * Simple utility to sanitize strings against XSS injection inside visual history cards
     */
    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
