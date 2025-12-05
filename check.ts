import { tts, ttsSave } from 'edge-tts';
import * as fs from 'fs';

async function test() {
    try {
        const text = 'こんにちは、今日はいい天気ですね。';
        const voice = 'ja-JP-NanamiNeural';

        // tts 함수로 Buffer 생성
        const audioBuffer = await tts(text, voice);

        console.log('Buffer type:', typeof audioBuffer);
        console.log('Buffer length:', audioBuffer.length);

        fs.writeFileSync('test_output.mp3', audioBuffer);
        console.log('성공! 파일 저장됨');

    } catch (error) {
        console.error('에러:', error);
    }
}

test();
