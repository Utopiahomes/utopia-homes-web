// The design pages read ?audience= (and the quote page ?goal=) from the address. In Next.js the server
// did that; the Astro pages are static, so the page renders the default first and these wrappers apply
// the address once the page is running (2026-11-25, Next.js -> Astro). The first render matches the
// static HTML, then the component starts again with the chosen audience.
import { useEffect, useState } from "react";
import { UtopiaDesignPage } from "@/components/design/UtopiaDesignPage";
import { QuoteStudio } from "@/components/design/QuoteStudio";
import type { DesignAudience, DesignPageContent, DesignServiceId } from "@/types/content";

const serviceIds: DesignServiceId[] = ["rental_readiness_audit", "room_design_plan", "whole_home_design_plan", "renovation_design_plan", "turnkey_furnishing"];
const audienceServices: Record<DesignAudience, DesignServiceId[]> = {
  rental: ["rental_readiness_audit", "turnkey_furnishing", "renovation_design_plan"],
  personal: ["room_design_plan", "whole_home_design_plan", "renovation_design_plan"],
};

function useAddress(): URLSearchParams | null {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => setParams(new URLSearchParams(window.location.search)), []);
  return params;
}

export function DesignPageFromAddress({ content }: { content: DesignPageContent }) {
  const params = useAddress();
  const audience = params?.get("audience");
  const explicit = audience === "rental" || audience === "personal";
  if (!params || !explicit) return <UtopiaDesignPage content={content} initialAudience="rental" explicitAudience={false} />;
  return <UtopiaDesignPage key={audience} content={content} initialAudience={audience} explicitAudience />;
}

export function QuoteStudioFromAddress() {
  const params = useAddress();
  const audience: DesignAudience = params?.get("audience") === "personal" ? "personal" : "rental";
  const goal = params?.get("goal");
  const requested = goal && serviceIds.includes(goal as DesignServiceId) ? (goal as DesignServiceId) : null;
  const service = requested && audienceServices[audience].includes(requested) ? requested : null;
  if (!params || (audience === "rental" && !service)) return <QuoteStudio initialAudience="rental" initialService={null} />;
  return <QuoteStudio key={`${audience}-${service}`} initialAudience={audience} initialService={service} />;
}
