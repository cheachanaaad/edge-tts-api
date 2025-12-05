import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface TTSRequest {
    text: string
    voice: string
    options?: {
        rate?: string
        pitch?: string
        volume?: string
    }
}

export async function POST(request: NextRequest) {
    try {
        const { text, voice, options }: TTSRequest = await request.json()

        // Validate input
        if (!text || text.length > 10000) {
            return new Response('Invalid text length', { status: 400 })
        }

        if (!voice) {
            return new Response('Voice selection required', { status: 400 })
        }

        // Generate TTS using Edge-TTS
        const audioBuffer = await generateTTS(text, voice, options)

        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'attachment; filename="speech.mp3"',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            }
        })

    } catch (error) {
        console.error('TTS generation failed:', error)
        return new Response('Generation failed', { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const text = searchParams.get('text')
    const voice = searchParams.get('voice') || 'ja-JP-NanamiNeural'
    const lang = searchParams.get('lang')

    // Voice mapping
    const voiceMap: { [key: string]: string } = {
        'ja': 'ja-JP-NanamiNeural',
        'ko': 'ko-KR-SunHiNeural',
        'en': 'en-US-AriaNeural',
        'zh': 'zh-CN-XiaoxiaoNeural',
    }

    const selectedVoice = lang ? (voiceMap[lang] || voice) : voice

    if (!text) {
        return new Response(JSON.stringify({ error: 'text is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        const audioBuffer = await generateTTS(text, selectedVoice)

        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
            }
        })
    } catch (error) {
        console.error('TTS Error:', error)
        return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

async function generateTTS(
    text: string,
    voice: string,
    options: TTSRequest['options'] = {}
): Promise<ArrayBuffer> {
    // Edge-TTS implementation using dynamic import
    const EdgeTTS = await import('edge-tts')

    const tts = new EdgeTTS.default()

    // Configure voice settings
    await tts.setMetadata(voice, EdgeTTS.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

    // Apply SSML if options provided
    let ssmlText = text
    if (options?.rate || options?.pitch || options?.volume) {
        ssmlText = `<speak><prosody${options.rate ? ` rate="${options.rate}"` : ''
            }${options.pitch ? ` pitch="${options.pitch}"` : ''
            }${options.volume ? ` volume="${options.volume}"` : ''
            }>${text}</prosody></speak>`
    }

    const stream = tts.generateSpeech(ssmlText)

    // Convert stream to ArrayBuffer
    const chunks: Uint8Array[] = []
    for await (const chunk of stream) {
        chunks.push(chunk)
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
    }

    return result.buffer
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}
