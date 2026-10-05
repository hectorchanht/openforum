/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gun subscriptions attach/detach in effects; StrictMode double-invocation
  // in dev would double-subscribe listeners.
  reactStrictMode: false,
}

module.exports = nextConfig
