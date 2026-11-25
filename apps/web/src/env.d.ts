/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_API_BASE_URL?: string;
  readonly PUBLIC_CONTACT_ENABLED?: "true" | "false";
  readonly PUBLIC_ENVIRONMENT?: "local" | "preview" | "production";
  readonly PUBLIC_CONTACT_EMAIL?: string;
  readonly PUBLIC_EDIT_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
