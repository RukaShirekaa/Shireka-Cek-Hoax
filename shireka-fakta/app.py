import os
import json
import io
import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify
from PIL import Image
from google import genai
from dotenv import load_dotenv

# 1. Setup konfigurasi
load_dotenv()
API_KEY = os.getenv("API_KEY")
app = Flask(__name__)

# Lazily-initialized Gemini client — created on first use so the app can
# start even when API_KEY is not set in the environment.
_client = None

def get_client():
    global _client
    if _client is not None:
        return _client
    key = os.getenv("API_KEY")
    if not key:
        raise ValueError(
            "API_KEY environment variable is not set. "
            "Please configure it before using the analyze endpoints."
        )
    _client = genai.Client(api_key=key)
    return _client

# 2. Prompt Dasar (Sudah dioptimalkan untuk output JSON)
BASE_PROMPT_RULE = """
Anda adalah validator fakta profesional. 
Tugas Anda: Analisis teks yang diberikan. Gunakan alat Google Search untuk memverifikasi.
Berikan jawaban HANYA dalam format JSON murni tanpa kalimat pembuka/penutup. 
Gunakan struktur berikut:
{
  "status": "Fakta / Hoax / Misleading / Satire",
  "confidence": "85%",
  "claims_found": ["Klaim 1", "Klaim 2"],
  "misleading_elements": ["Unsur manipulatif"],
  "related_topics": ["Topik 1"],
  "conclusion": "Penjelasan edukatif dan objektif."
  "explanation": "Penjelasan detail di sini"
}
"""

@app.route('/')
def index():
    return render_template('index.html')

# RUTE ANALISIS TEKS
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Teks kosong"}), 400
            
        prompt = f"{BASE_PROMPT_RULE}\n\nTeks: {data['text']}"
        
        response = get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                tools=[{"google_search": {}}],
            )
        )
        
        # Bersihkan format JSON dari markdown (```json)
        raw_text = response.text.replace('```json', '').replace('```', '').strip()
        return jsonify(json.loads(raw_text))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# RUTE ANALISIS GAMBAR
@app.route('/analyze-image', methods=['POST'])
def analyze_image():
    try:
        file = request.files['image']
        image = Image.open(io.BytesIO(file.read()))
        
        # Menggunakan model yang mendukung gambar
        response = get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=[BASE_PROMPT_RULE, image]
        )
        return jsonify(json.loads(response.text.replace('```json', '').replace('```', '').strip()))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)