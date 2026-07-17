export const config = {
  installCommand: "npm install && npm install --include=dev --prefix client",
  buildCommand: "npm run build",
  outputDirectory: "client/dist",
  functions: {
    "api/index.js": {
      maxDuration: 30,
    },
  },
  rewrites: [
    { source: "/api/:path*", destination: "/api/index" },
    { source: "/health", destination: "/api/index" },
    { source: "/health/db", destination: "/api/index" },
    { source: "/((?!assets/|api/).*)", destination: "/index.html" },
  ],
};
