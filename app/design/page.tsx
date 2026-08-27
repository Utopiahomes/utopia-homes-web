import type { Metadata } from "next";
import { UtopiaDesignPage } from "@/components/design/UtopiaDesignPage";
import { cms } from "@/lib/cms";
import type { DesignAudience } from "@/types/content";

export const metadata: Metadata = {
  title: "Utopia Design",
  description: "Distinctive vacation-rental and personal-home design, with a structured path from project vision to preliminary estimate.",
};

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ audience?: string }> }) {
  const [{ audience }, content] = await Promise.all([searchParams, cms.getDesignPage()]);
  const initialAudience: DesignAudience = audience === "personal" ? "personal" : "rental";
  return <UtopiaDesignPage content={content} initialAudience={initialAudience} explicitAudience={audience === "rental" || audience === "personal"} />;
}
