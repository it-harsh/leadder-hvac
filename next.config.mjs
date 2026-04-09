/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@tiptap/react',
    '@tiptap/core',
    '@tiptap/pm',
    '@tiptap/starter-kit',
    '@tiptap/extension-underline',
  ],
}

export default nextConfig
