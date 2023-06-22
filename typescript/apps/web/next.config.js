/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    return config;
  },
  transpilePackages: ["@gloo/database", "@gloo/client-internal"],
  experimental: {
    serverActions: true,
  },
  redirects: async () => [
    {
      source: "/",
      destination: "/dashboard/",
      permanent: false,
    },
  ],
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
};
