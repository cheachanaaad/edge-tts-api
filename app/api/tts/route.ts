import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

const VOICES: { [key: string]: string } = {
    'ja': 'ja-JP-NanamiNeural',
    'ko': 'ko-KR-SunHiNeural',
    'en': 'en-US-AriaNeural',
    'zh': 'zh-CN-XiaoxiaoNeural',
};

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildSSML(text: string, voice: string): string {
    const lang = voice.split('-').slice(0, 2).join('-');
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}">${escapeXml(text)}</voice></speak>`;
}

async function synthesize(text: string, voice: string): Promise<Uint8Array> {
    const connectionId = generateUUID().replace(/-/g, '');
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}`;

    const response = await fetch(url.replace('wss://', 'https://'), {
        headers: {
            'Upgrade': 'websocket',
        },
    });

    const ws = (response as any).webSocket;
    if (!ws) {
        throw new Error('WebSocket upgrade failed');
    }

    ws.accept();

    const audioChunks: Uint8Array[] = [];

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Timeout'));
        }, 30000);

        ws.addEventListener('message', (event: MessageEvent) => {
            if (typeof event.data === 'string') {
                if (event.data.includes('Path:turn.end')) {
                    clearTimeout(timeout);
                    ws.close();
                }
            } else if (event.data instanceof ArrayBuffer) {
                const view = new DataView(event.data);
                if (event.data.byteLength > 2) {
                    const headerLength = view.getInt16(0);
                    if (headerLength + 2 < event.data.byteLength) {
                        const audioData = new Uint8Array(event.data, headerLength + 2);
                        audioChunks.push(audioData);
                    }
                }
            }
        });

        ws.addEventListener('close', () => {
            clearTimeout(timeout);
            if (audioChunks.length > 0) {
                let totalLength = 0;
                for (const chunk of audioChunks) {
                    totalLength += chunk.length;
                }
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of audioChunks) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                resolve(combined);
            } else {
                reject(new Error('No audio data received'));
            }
        });

        ws.addEventListener('error', (err: Event) => {
            clearTimeout(timeout);
            reject(new Error('WebSocket error'));
        });

        // Send config
        const speechConfig = {
            context: {
                synthesis: {
                    audio: {
                        metadataoptions: {
                            sentenceBoundaryEnabled: 'false',
                            wordBoundaryEnabled: 'false'
                        },
                        outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                    }
                }
            }
        };

        ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(speechConfig)}`);

        // Send SSML
        const ssml = buildSSML(text, voice);
        const timestamp = new Date().toISOString();
        ws.send(`X-RequestId:${connectionId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}\r\nPath:ssml\r\n\r\n${ssml}`);
    });
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text');
    const lang = searchParams.get('lang') || 'ja';

    if (!text) {
        return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    try {
        const voice = VOICES[lang] || VOICES['ja'];
        const audioData = await synthesize(text, voice);

        return new NextResponse(audioData, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error: unknown) {
        console.error('TTS Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
