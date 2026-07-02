module.exports = {
  apps: [
    {
      name: "ffd-dashboard-api",
      script: "server/index.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
