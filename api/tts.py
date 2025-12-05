from http.server import BaseHTTPRequestHandler
import edge_tts
import asyncio
from urllib.parse import parse_qs, urlparse
import sys
import traceback

VOICES = {
    'ja': 'ja-JP-NanamiNeural',
    'ko': 'ko-KR-SunHiNeural',
    'en': 'en-US-AriaNeural',
    'zh': 'zh-CN-XiaoxiaoNeural',
}

async def generate_tts(text: str, voice: str) -> bytes:
    print(f"Generating TTS: text='{text}', voice='{voice}'", file=sys.stderr)
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            print(f"Received audio chunk: {len(chunk['data'])} bytes", file=sys.stderr)
    print(f"Total audio size: {len(audio_data)} bytes", file=sys.stderr)
    return audio_data

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        text = params.get('text', [None])[0]
        lang = params.get('lang', ['ja'])[0]
        
        print(f"Request: text='{text}', lang='{lang}'", file=sys.stderr)
        
        if not text:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"error": "text is required"}')
            return
        
        try:
            voice = VOICES.get(lang, VOICES['ja'])
            print(f"Using voice: {voice}", file=sys.stderr)
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            audio_data = loop.run_until_complete(generate_tts(text, voice))
            loop.close()
            
            if not audio_data:
                raise Exception("No audio data generated")
            
            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('Content-Length', str(len(audio_data)))
            self.end_headers()
            self.wfile.write(audio_data)
            print(f"Sent {len(audio_data)} bytes", file=sys.stderr)
        except Exception as e:
            print(f"Error: {str(e)}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(f'{{"error": "{str(e)}"}}'.encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
