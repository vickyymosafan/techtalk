/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [], // Tambahkan domain untuk gambar eksternal jika ada
  },
}

module.exports = nextConfig 