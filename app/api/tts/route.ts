import { NextRequest } from 'next/server'
import { tts } from 'edge-tts'

const VOICES: { [key: string]: string } = {
    'ja': 'ja-JP-NanamiNeural',
    'ko': 'ko-KR-SunHiNeural',
    'en': 'en-US-AriaNeural',
    'zh': 'zh-CN-XiaoxiaoNeural',
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const text = searchParams.get('text')
    const lang = searchParams.get('lang') || 'ja'

    if (!text) {
        return new Response(JSON.stringify({ error: 'text is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        const voice = VOICES[lang] || VOICES['ja']
        const audioBuffer = await tts(text, { voice })

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

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}
