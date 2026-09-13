import {
  publicLucyUpstreamAnswerSchema,
  type PublicLucyHistoryTurn,
  type PublicLucyPageContext,
  type PublicLucyReference,
} from "@/lib/lucy/contracts";

// The public API may spend up to 15 seconds waiting on the isolated model service.
// Leave a small handoff margin so this same-origin adapter does not abort first.
const DEFAULT_TIMEOUT_MS = 18_000;

type LucyEnvironment = {
  LUCY_PUBLIC_ENABLED?: string;
  LUCY_PUBLIC_API_URL?: string;
  LUCY_PUBLIC_API_TOKEN?: string;
  LUCY_PUBLIC_SITE_HOSTNAME?: string;
  LUCY_PUBLIC_SNAPSHOT_DIGEST?: string;
  LUCY_PUBLIC_ROLLBACK_SNAPSHOT_DIGEST?: string;
};

type PublicLucyConfiguration = {
  endpoint: URL;
  token: string;
  siteHostname: string;
  snapshotDigests: ReadonlySet<string>;
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
  const rollbackSnapshotDigest = env.LUCY_PUBLIC_ROLLBACK_SNAPSHOT_DIGEST?.trim();
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
  if (rollbackSnapshotDigest && !/^[a-f0-9]{64}$/.test(rollbackSnapshotDigest)) {
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

  return {
    endpoint,
    token,
    siteHostname,
    snapshotDigests: new Set([snapshotDigest, ...(rollbackSnapshotDigest ? [rollbackSnapshotDigest] : [])]),
  };
}

function approvedReference(reference: PublicLucyReference, siteHostname: string) {
  try {
    const url = new URL(reference.href, `https://${siteHostname}`);
    return (
      url.protocol === "https:" &&
      url.hostname === siteHostname &&
      (url.port === "" || url.port === "443") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

export async function askPublicLucy(
  question: string,
  sessionId: string,
  options: {
    env?: LucyEnvironment;
    fetcher?: typeof fetch;
    timeoutMs?: number;
    pageContext?: PublicLucyPageContext;
    history?: PublicLucyHistoryTurn[];
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
      body: JSON.stringify({
        question,
        ...(options.pageContext ? { page_context: options.pageContext } : {}),
        ...(options.history?.length ? { history: options.history } : {}),
      }),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 404) {
      return {
        outcome: "fallback" as const,
        answer:
          "I don’t have enough approved information to answer that yet. You can explore the site or contact Utopia Homes for help.",
        sources: [],
        links: [{ id: "contact", label: "Contact Utopia Homes", href: "/contact" }],
      };
    }
    if (!response.ok) throw new PublicLucyUnavailable();

    const result = publicLucyUpstreamAnswerSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (
      !result.success ||
      !configuration.snapshotDigests.has(result.data.snapshot_digest)
    ) {
      throw new PublicLucyUnavailable();
    }
    if (!("contract" in result.data)) {
      return {
        outcome: "answered" as const,
        answer: result.data.answer,
        sources: [
          { id: "legacy-source", label: "Learn more", href: result.data.source },
        ].filter((reference) => approvedReference(reference, configuration.siteHostname)),
        links: [],
      };
    }
    const references = [...result.data.sources, ...result.data.links];
    if (!references.every((reference) => approvedReference(reference, configuration.siteHostname))) {
      throw new PublicLucyUnavailable();
    }
    return {
      outcome: result.data.outcome,
      answer: result.data.answer,
      clarification: result.data.clarification,
      sources: result.data.sources,
      links: result.data.links,
    };
  } catch {
    throw new PublicLucyUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}
