/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone-Output: schlankes Docker-Image, nur das Nötigste wird kopiert.
  output: "standalone",
  // Native / Node-Pakete nicht ins Bundle ziehen (argon2 = native Addon).
  serverExternalPackages: ["argon2", "@prisma/client"],
  experimental: {
    // Server Actions / Route Handler dürfen größere Uploads (Audio) annehmen.
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
