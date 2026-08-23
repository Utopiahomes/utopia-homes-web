import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyticsView } from "@/components/AnalyticsView";
import { cms } from "@/lib/cms";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const campaign = await cms.getCampaignBySlug((await params).slug); return campaign ? { title: campaign.seoTitle.replace(" | Utopia Homes", ""), description: campaign.seoDescription } : { title: "Campaign not found" }; }
export default async function CampaignPage({ params }: Props) { const campaign = await cms.getCampaignBySlug((await params).slug); if (!campaign) notFound(); return <article className="campaign-page"><AnalyticsView event={{ name: "campaign_view", properties: { campaignId: campaign.id, slug: campaign.slug, partner: campaign.partner } }} /><Image src={campaign.heroImage.src} alt={campaign.heroImage.alt} fill priority sizes="100vw" /><div className="campaign-overlay" /><div className="campaign-copy"><p className="eyebrow eyebrow-light">{campaign.eyebrow} · {campaign.partner}</p><h1>{campaign.headline}</h1><p>{campaign.description}</p><Link className="button-light-solid" href={campaign.ctaUrl}>{campaign.ctaLabel} <span>↗</span></Link>{campaign.rulesUrl && <a className="campaign-rules" href={campaign.rulesUrl}>Official rules</a>}</div></article>; }
