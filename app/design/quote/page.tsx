import type { Metadata } from "next";
import { QuoteStudio } from "@/components/design/QuoteStudio";
import { pageMetadata } from "@/lib/page-metadata";
import type { DesignAudience, DesignServiceId } from "@/types/content";

export const metadata: Metadata = pageMetadata({ title: "Quote Studio | Utopia Design", description: "Build a Utopia Design project profile and receive a preliminary, nonbinding estimate.", path: "/design/quote", image: { src: "/images/shamrock/gallery/20.webp", alt: "Finished open-plan living and dining room at The Shamrock" } });
const serviceIds: DesignServiceId[] = ["rental_readiness_audit", "room_design_plan", "whole_home_design_plan", "renovation_design_plan", "turnkey_furnishing"];

export default async function DesignQuotePage({ searchParams }: { searchParams: Promise<{ audience?: string; goal?: string }> }) {
  const params = await searchParams;
  const audience: DesignAudience = params.audience === "personal" ? "personal" : "rental";
  const audienceServices: Record<DesignAudience, DesignServiceId[]> = {
    rental: ["rental_readiness_audit", "turnkey_furnishing", "renovation_design_plan"],
    personal: ["room_design_plan", "whole_home_design_plan", "renovation_design_plan"],
  };
  const requested = serviceIds.includes(params.goal as DesignServiceId) ? params.goal as DesignServiceId : null;
  const service = requested && audienceServices[audience].includes(requested) ? requested : null;
  return <QuoteStudio initialAudience={audience} initialService={service} />;
}
