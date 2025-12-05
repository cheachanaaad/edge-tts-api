/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true
    },
    transpilePackages: ['edge-tts']
}

module.exports = nextConfig
