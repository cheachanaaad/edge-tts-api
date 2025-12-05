/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        runtime: 'edge'
    },
    images: {
        unoptimized: true
    }
}

module.exports = nextConfig
