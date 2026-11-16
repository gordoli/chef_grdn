/** Shared freshness policy for public portfolio data; private reviews never enter this cache. */
export const collectionLoading = {
  freshnessSeconds: 60,
  freshnessMs: 60_000,
  signedPhotoLifetimeSeconds: 3_600,
  signedPhotoRefreshMs: 45 * 60_000,
  backgroundRefreshMs: 50 * 60_000,
} as const;

export const socialImportPolicy = {
  linkTimeoutMs: 12_000,
  maxTikTokRedirects: 4,
  providerTimeoutMs: 20_000,
  browserTimeoutMs: 55_000,
  websiteTimeoutMs: 25_000,
  pollIntervalMs: 5_000,
  maxPollAttempts: 120,
  ticketLifetimeMs: 15 * 60_000,
  quotaWindowMs: 60_000,
  maxStartRequests: 4,
  maxPollRequests: 120,
  maxQuotaEntries: 500,
  maxRequestBytes: 8_192,
  maxProviderBytes: 2_000_000,
  maxReviews: 5,
} as const;
