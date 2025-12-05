const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');

async function test() {
    try {
        const tts = new EdgeTTS({
            voice: 'ja-JP-NanamiNeural',
            lang: 'ja-JP',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        });

        // ttsPromise 사용
        const result = await tts.ttsPromise('こんにちは、今日はいい天気ですね。');
        console.log('결과 타입:', typeof result);
        console.log('결과 길이:', result ? result.length : 'N/A');

        if (result) {
            fs.writeFileSync('test_output.mp3', result);
            console.log('성공! 파일 저장됨');
        }

    } catch (error) {
        console.error('에러:', error);
    }
}

test();
