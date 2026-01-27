/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  webpack: (config) => {
    // Prioritize project's node_modules
    const projectNodeModules = path.resolve(__dirname, 'node_modules')
    if (config.resolve) {
      config.resolve.modules = [
        projectNodeModules,
        ...(config.resolve.modules || ['node_modules']).filter(m => 
          typeof m === 'string' && !m.includes('/Volumes/HashSSD/mywork/node_modules')
        )
      ]
    }
    return config
  },
}

module.exports = nextConfig

