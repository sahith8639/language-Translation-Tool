import logging
import io
import base64
from flask import Flask, render_template, request, jsonify, send_file
from googletrans import Translator, LANGUAGES
from gtts import gTTS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize Google Translate Translator
translator = Translator()

@app.route("/")
def index():
    """Renders the main translation single-page interface."""
    return render_template("index.html")

@app.route("/translate", methods=["POST"])
def translate_text():
    """
    POST Endpoint: /translate
    Expects JSON:
    {
        "text": "Text to translate",
        "source": "auto" or language code (e.g. "en"),
        "target": "Language code (e.g. "te")"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request. JSON body is required."}), 400

        text = data.get("text", "").strip()
        source = data.get("source", "auto").strip().lower()
        target = data.get("target", "").strip().lower()

        # Input Validation
        if not text:
            return jsonify({"error": "Text to translate cannot be empty."}), 400
        
        if len(text) > 5000:
            return jsonify({"error": "Text exceeds the 5000 character limit."}), 400

        if not target:
            return jsonify({"error": "Target language is required."}), 400

        # Validate target language code
        valid_langs = set(LANGUAGES.keys())
        if target not in valid_langs:
            return jsonify({"error": f"Unsupported target language: '{target}'"}), 400

        if source != "auto" and source not in valid_langs:
            return jsonify({"error": f"Unsupported source language: '{source}'"}), 400

        logger.info(f"Translating text (len={len(text)}) from '{source}' to '{target}'")

        # Perform translation
        # Re-instantiate Translator to prevent connection caching issues
        local_translator = Translator()
        
        # If source is 'auto', googletrans handles it automatically
        src_param = 'auto' if source == 'auto' else source
        
        result = local_translator.translate(text, src=src_param, dest=target)
        
        if not result or not result.text:
            return jsonify({"error": "Translation failed. Empty result returned from service."}), 500

        detected_lang = result.src if hasattr(result, 'src') else source
        
        logger.info(f"Translation successful! Detected src: {detected_lang}")

        return jsonify({
            "translated_text": result.text,
            "detected_language": detected_lang
        })

    except Exception as e:
        logger.error(f"Error occurred during translation: {str(e)}", exc_info=True)
        return jsonify({
            "error": "An error occurred during translation. Please try again later.",
            "details": str(e)
        }), 500

@app.route("/tts", methods=["POST"])
def text_to_speech():
    """
    POST Endpoint: /tts
    Expects JSON:
    {
        "text": "Text to read aloud",
        "lang": "Language code (e.g. 'te')"
    }
    Generates an MP3 using gTTS and returns a Base64-encoded audio URI.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request. JSON body is required."}), 400

        text = data.get("text", "").strip()
        lang = data.get("lang", "en").strip().lower()

        if not text:
            return jsonify({"error": "Text cannot be empty."}), 400

        # Validate language code for gTTS (sometimes multi-part e.g. zh-cn -> zh)
        # gtts expects 'zh-cn' as 'zh-CN' or sometimes standard codes.
        # Let's clean standard language codes.
        gtts_lang = lang
        if lang == 'zh-cn':
            gtts_lang = 'zh-CN'
        elif lang == 'zh-tw':
            gtts_lang = 'zh-TW'

        logger.info(f"Generating TTS for text (len={len(text)}) in language: {gtts_lang}")

        # Generate speech
        tts = gTTS(text=text, lang=gtts_lang, slow=False)
        
        # Write to memory buffer
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)

        # Convert to base64 so it can be sent as JSON and played in the browser instantly
        audio_base64 = base64.b64encode(fp.read()).decode('utf-8')
        audio_url = f"data:audio/mp3;base64,{audio_base64}"

        return jsonify({
            "audio_url": audio_url
        })

    except Exception as e:
        logger.error(f"Error occurred during TTS generation: {str(e)}", exc_info=True)
        # Web Speech API fallback is always available on the frontend, so we can return errors gracefully
        return jsonify({
            "error": "Failed to generate TTS audio stream.",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    # Run the application in debug mode on local interface
    app.run(host="127.0.0.1", port=5000, debug=True)
