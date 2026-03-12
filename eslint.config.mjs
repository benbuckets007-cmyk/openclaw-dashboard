import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: [
      "temp-upstream/**",
    ],
  },
];

export default config;
