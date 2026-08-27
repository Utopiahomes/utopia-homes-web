import type { Metadata } from "next";
import { QuoteStudio } from "@/components/design/QuoteStudio";
import type { DesignAudience, DesignServiceId } from "@/types/content";

export const metadata: Metadata = { title: "Quote Studio | Utopia Design", description: "Build a Utopia Design project profile and receive a preliminary, nonbinding estimate." };
const serviceIds: DesignServiceId[] = ["rental_readiness_audit", "room_design_plan", "whole_home_design_plan", "renovation_design_plan", "turnkey_furnishing"];

export default async function DesignQuotePage({ searchParams }: { searchParams: Promise<{ audience?: string; goal?: string }> }) {
  const params = await searchParams;
  const audience: DesignAudience = params.audience === "personal" ? "personal" : "rental";
  const fallback: DesignServiceId = audience === "personal" ? "room_design_plan" : "rental_readiness_audit";
  const service = serviceIds.includes(params.goal as DesignServiceId) ? params.goal as DesignServiceId : fallback;
  return <QuoteStudio initialAudience={audience} initialService={service} />;
}
