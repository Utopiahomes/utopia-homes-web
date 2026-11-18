import type { Metadata } from "next";
import { UtopiaDesignPage } from "@/components/design/UtopiaDesignPage";
import { cms } from "@/lib/cms";
import { pageMetadata } from "@/lib/page-metadata";
import type { DesignAudience } from "@/types/content";

export const metadata: Metadata = pageMetadata({
  title: "Vacation Rental Design and Furnishing",
  description: "Utopia Design, a Utopia Homes company, designs and furnishes vacation rentals and designs personal homes, with a clear path to a preliminary estimate.",
  path: "/design",
  image: { src: "/images/shamrock/gallery/20.webp", alt: "Finished open-plan living and dining room at The Shamrock" },
});

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ audience?: string }> }) {
  const [{ audience }, content] = await Promise.all([searchParams, cms.getDesignPage()]);
  const initialAudience: DesignAudience = audience === "personal" ? "personal" : "rental";
  return <UtopiaDesignPage content={content} initialAudience={initialAudience} explicitAudience={audience === "rental" || audience === "personal"} />;
}
