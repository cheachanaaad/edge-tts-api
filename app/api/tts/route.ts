import { NextRequest, NextResponse } from 'next/server';
import { tts } from 'edge-tts';

const VOICES: { [key: string]: string } = {
    'ja': 'ja-JP-NanamiNeural',
    'ko': 'ko-KR-SunHiNeural',
    'en': 'en-US-AriaNeural',
    'zh': 'zh-CN-XiaoxiaoNeural',
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text');
    const lang = searchParams.get('lang') || 'ja';

    if (!text) {
        return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    try {
        const voice = VOICES[lang] || VOICES['ja'];
        const audioBuffer = await tts(text, { voice });

        // Buffer를 Uint8Array로 변환
        const uint8Array = new Uint8Array(audioBuffer);

        return new NextResponse(uint8Array, {
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
