import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true
  },
  // Only use standalone output when ENV=dev (local/Docker builds)
  ...(process.env.ENV === 'dev' && { output: 'standalone' }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com' // GitHub avatars
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com' // Discord avatars
      }
    ]
  }
}

export default nextConfig
