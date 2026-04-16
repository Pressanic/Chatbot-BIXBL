/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/chat': ['./knowledge-base/**/*.md'],
  },
};

module.exports = nextConfig;
