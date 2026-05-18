# MultiLingo AI - Advanced Language Translation & Vocal Synthesis Suite

MultiLingo AI is a modern, responsive, and feature-rich single-page web application developed for **CodeAlpha Artificial Intelligence Internship - Task 1: Language Translation Tool**. 

Built with a high-fidelity **Glassmorphism UI** aesthetic, the application provides instantaneous language translations powered by a robust Python-Flask backend combined with Google's Neural Translation Engine (`googletrans`). Additionally, the application integrates a **Dual-Engine Speech Synthesis (TTS) System** and client-side **Voice Dictation (STT)** to deliver a premium user experience.

---

## 🌟 Key Features

1. **Neural Machine Translation**: Converts text instantly into 20+ global and regional languages using the advanced Google Translate Neural network.
2. **Auto Language Detection**: Instantly analyzes input texts and highlights the detected language in a sleek holographic badge.
3. **Dual-Engine TTS (Listen Fallback)**: Plays translated text using the client-side `Web Speech API`. If the browser lacks native voice packs for regional languages (e.g., Telugu, Kannada, Hindi), it transparently falls back to our server-side `gTTS` streaming engine, ensuring vocal synthesis works 100% of the time.
4. **Holographic Voice Dictation**: Allows users to dictate texts in their source language using browser-native Speech-to-Text (STT) capabilities.
5. **Interactive UI Utilities**:
   - **One-Tap Clipboard Copy**: Instantly copy translations with live button state feedback.
   - **Instant Exporter**: Download translations as a neatly formatted `.txt` text file.
   - **Language Swap**: Seamlessly swap source and target selections with dynamic 180° element rotation.
6. **Active Character Limit & Counter**: Restricts inputs to 5,000 characters with interactive color alerts as users approach the threshold.
7. **Offline-Capable Translation Cache**: Automatically logs successful translations to `localStorage`, populating a "Recent Translations Hub" where users can restore or remove cached cards.
8. **Toast Alert Notifications**: Sleek sliding notification cards providing warnings, successes, and failure indicators.
9. **Responsive Glassmorphism Styling**: Visually stunning dark mode with moving ambient aura blobs, fully responsive across desktop, tablet, and mobile displays.

---

## 🛠️ Technology Stack

### Backend
- **Core Engine**: Python 3.11+
- **Micro-Framework**: Flask 3.x
- **Translation Core**: `googletrans==4.0.0rc1` (Official Google Translate API Wrapper)
- **Vocal Synthesis**: `gTTS` (Google Text-to-Speech)

### Frontend
- **Structure**: Semantic HTML5
- **Design & Layout**: Modern CSS3 (featuring HSL CSS variables, custom keyframe animations, glass backdrop filters, and CSS Grid layouts)
- **Logic**: Vanilla ES6 JavaScript (modular, AJAX fetch, event-driven, Speech API, and LocalStorage cached records)
- **Icons**: Font Awesome v6.4.0
- **Typography**: Google Fonts (Poppins & Orbitron)

---

## 📁 Project Structure

```text
CodeAlpha_Language_Translation_Tool/
│
├── app.py                      # Flask Application Server (Routing & TTS Endpoints)
├── requirements.txt            # Python Dependency Index
├── README.md                   # Project Documentation
│
├── templates/
│   └── index.html              # Core Layout Single Page Interface
│
├── static/
│   ├── style.css               # Core Stylesheet (Glassmorphism & Responsiveness)
│   └── script.js               # Application Controller (AJAX & Web Speech APIs)
│
└── screenshots/
    └── output.png              # UI Demonstrative Snapshot (Generated during run)
```

---

## 🚀 Installation & Setup Steps

Follow these exact steps to initialize and launch MultiLingo AI on your Windows system:

### Step 1: Clone or Access the Repository
Ensure all files (`app.py`, `requirements.txt`, `/static`, `/templates`) reside in your working directory.

### Step 2: Establish a Python Virtual Environment
Open PowerShell or Command Prompt inside the project workspace directory and execute:
```powershell
# Create the virtual environment named 'venv'
python -m venv venv
```

### Step 3: Activate the Virtual Environment
Activate the environment:
* **PowerShell**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
* **Command Prompt**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```

> [!NOTE]
> If PowerShell blocks execution, bypass standard policies by running: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and retry.

### Step 4: Install Project Dependencies
Use `pip` to install all listed libraries:
```bash
pip install -r requirements.txt
```

### Step 5: Start the Flask Application
Run the Flask server:
```bash
python app.py
```
Upon execution, Flask will launch in developer debug mode at: `http://127.0.0.1:5000`

### Step 6: Access MultiLingo AI
Open your preferred web browser and navigate to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 💡 Usage Guide

1. **Typing & Auto-Translate**: Start typing in the left (Source) textarea. The translator will automatically translate the text 1.2 seconds after you finish typing, or you can click the **Translate Document** button at the center-bottom to run it immediately.
2. **Auto-Detect**: Keep the source selection at "Auto Detect". The app will dynamically display the detected language badge.
3. **Audio Playback**: Click the **Listen** button on the target card to hear your translation read aloud.
4. **Copy & Save**: Click **Copy** to save the translation to your clipboard, or **Download** to export it as a clean `.txt` file.
5. **Restoring History**: Scroll down to the **Recent Translations Hub**. Hover and click the rotate-left icon on any past card to restore it directly back to the active translator workspace.

---

## 🔮 Future Enhancements

- **PDF/Docx Document Uploader**: Parse and translate whole Word or PDF files in-place.
- **Offline Translation Engine**: Integrate a client-side Transformers.js translator (like Xenova/m2m100) to allow translations completely local without server requests.
- **Multiple Pronunciation Voices**: Toggle between male/female voices and adjust talking speeds.

---

## ✍️ Author
Developed by **Sahith Sai Pasupula** as part of the **CodeAlpha Artificial Intelligence Internship** program.
- **Task**: Language Translation Tool
- **Role**: Full Stack AI Engineer

---
*Created in May 2026. MultiLingo AI is licensed under the MIT License.*
