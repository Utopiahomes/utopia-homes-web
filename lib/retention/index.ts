import { createRetentionService } from "./service";
import {
  createSupabaseRetentionStore,
  inactivePurgeAdapters,
} from "./supabase";

let resolved: ReturnType<typeof createRetentionService> | undefined;

export function resolveRetentionService(env: NodeJS.ProcessEnv = process.env) {
  if (resolved) return resolved;
  const store = createSupabaseRetentionStore({
    url: env.SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  });
  resolved = createRetentionService({
    store,
    adapters: inactivePurgeAdapters(),
    env,
  });
  return resolved;
}
