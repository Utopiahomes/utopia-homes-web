const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL): URL {
  const candidate = value?.trim();

  if (!candidate) {
    return new URL(LOCAL_SITE_URL);
  }

  try {
    return new URL(candidate);
  } catch {
    return new URL(LOCAL_SITE_URL);
  }
}
