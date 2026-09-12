import { publicLucyUpstreamAnswerSchema } from "@/lib/lucy/contracts";

const DEFAULT_TIMEOUT_MS = 10_000;

type LucyEnvironment = {
  LUCY_PUBLIC_ENABLED?: string;
  LUCY_PUBLIC_API_URL?: string;
  LUCY_PUBLIC_API_TOKEN?: string;
  LUCY_PUBLIC_SITE_HOSTNAME?: string;
  LUCY_PUBLIC_SNAPSHOT_DIGEST?: string;
};

type PublicLucyConfiguration = {
  endpoint: URL;
  token: string;
  siteHostname: string;
  snapshotDigest: string;
};

export class PublicLucyUnavailable extends Error {
  constructor() {
    super("Public Lucy is unavailable");
  }
}

export function isPublicLucyEnabled(env: LucyEnvironment = process.env as LucyEnvironment) {
  return env.LUCY_PUBLIC_ENABLED === "true";
}

export function resolvePublicLucyConfiguration(
  env: LucyEnvironment = process.env as LucyEnvironment,
): PublicLucyConfiguration {
  if (!isPublicLucyEnabled(env)) throw new PublicLucyUnavailable();

  const endpointValue = env.LUCY_PUBLIC_API_URL?.trim();
  const token = env.LUCY_PUBLIC_API_TOKEN?.trim();
  const siteHostname = env.LUCY_PUBLIC_SITE_HOSTNAME?.trim().toLowerCase();
  const snapshotDigest = env.LUCY_PUBLIC_SNAPSHOT_DIGEST?.trim();
  if (
    !endpointValue ||
    !token ||
    token.length < 32 ||
    !siteHostname ||
    !snapshotDigest ||
    !/^[a-f0-9]{64}$/.test(snapshotDigest)
  ) {
    throw new PublicLucyUnavailable();
  }

  let endpoint: URL;
  try {
    endpoint = new URL(endpointValue);
  } catch {
    throw new PublicLucyUnavailable();
  }

  const loopback = endpoint.hostname === "127.0.0.1" || endpoint.hostname === "localhost";
  if (
    (endpoint.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && loopback)) ||
    endpoint.username ||
    endpoint.password ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      siteHostname,
    )
  ) {
    throw new PublicLucyUnavailable();
  }

  return { endpoint, token, siteHostname, snapshotDigest };
}

export async function askPublicLucy(
  question: string,
  sessionId: string,
  options: {
    env?: LucyEnvironment;
    fetcher?: typeof fetch;
    timeoutMs?: number;
  } = {},
) {
  const configuration = resolvePublicLucyConfiguration(options.env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await (options.fetcher ?? fetch)(configuration.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${configuration.token}`,
        "Content-Type": "application/json",
        Origin: `https://${configuration.siteHostname}`,
        "X-Lucy-Public-Host": configuration.siteHostname,
        "X-Lucy-Public-Session": sessionId,
      },
      body: JSON.stringify({ question }),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new PublicLucyUnavailable();

    const result = publicLucyUpstreamAnswerSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!result.success || result.data.snapshot_digest !== configuration.snapshotDigest) {
      throw new PublicLucyUnavailable();
    }
    return { answer: result.data.answer };
  } catch {
    throw new PublicLucyUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}
