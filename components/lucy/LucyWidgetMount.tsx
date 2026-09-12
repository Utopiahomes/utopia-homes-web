import { LucyWidget } from "@/components/lucy/LucyWidget";
import { cms } from "@/lib/cms";
import { isPublicLucyEnabled } from "@/lib/lucy/server";

export async function LucyWidgetMount() {
  if (!isPublicLucyEnabled()) return null;
  const content = await cms.getPublicLucyContent();
  return <LucyWidget intro={content.intro} suggestions={content.suggestions} />;
}
