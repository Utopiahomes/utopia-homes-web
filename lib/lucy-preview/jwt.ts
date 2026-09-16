import { randomUUID } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";

const ISSUER = "stoin:application:utopia-homes-web";
const SUBJECT = "stoin:service:utopia-homes-web-guest-adapter";
const AUDIENCE = "stoin:business:utopia-homes-prime";
const SCOPE = "guest.answer";
const LIFETIME_SECONDS = 280; // < RC2's 300s max; leaves margin under the 30s clock-skew allowance.

export class PreviewGuestAnswerJwtUnavailable extends Error {
  constructor() {
    super("Preview guest.answer JWT signing is unavailable");
  }
}

type PreviewJwtEnvironment = {
  PREVIEW_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM?: string;
  PREVIEW_GUEST_ANSWER_JWT_KID?: string;
};

/**
 * Signs a stoin-business-jwt-v1 token using an ephemeral, locally-generated, PREVIEW-only Ed25519
 * keypair — never a production key. See README/docs for how to generate one; the private key PEM
 * is read from an env var, never committed to source control.
 */
export async function signPreviewGuestAnswerJwt(
  env: PreviewJwtEnvironment = process.env as PreviewJwtEnvironment,
): Promise<string> {
  const rawPrivateKeyPem = env.PREVIEW_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM;
  const kid = env.PREVIEW_GUEST_ANSWER_JWT_KID;
  if (!rawPrivateKeyPem || !kid) throw new PreviewGuestAnswerJwtUnavailable();

  // Env vars commonly carry a PEM's real newlines as the literal two-character sequence `\n`
  // (there's no portable way to put an actual multi-line value in most env-var stores/CI UIs).
  // Only unescape when there's no real newline already, so a value that's already correctly
  // multi-line (e.g. from a local .env file with quoted line breaks) is left untouched.
  const privateKeyPem = rawPrivateKeyPem.includes("\n")
    ? rawPrivateKeyPem
    : rawPrivateKeyPem.replace(/\\n/g, "\n");

  let key: Awaited<ReturnType<typeof importPKCS8>>;
  try {
    key = await importPKCS8(privateKeyPem, "EdDSA");
  } catch {
    throw new PreviewGuestAnswerJwtUnavailable();
  }

  const now = Math.floor(Date.now() / 1000);
  try {
    return await new SignJWT({ scope: SCOPE, jti: randomUUID() })
      .setProtectedHeader({ alg: "EdDSA", kid })
      .setIssuer(ISSUER)
      .setSubject(SUBJECT)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + LIFETIME_SECONDS)
      .sign(key);
  } catch {
    throw new PreviewGuestAnswerJwtUnavailable();
  }
}
