import { campaigns, designPageContent, destinations, faqs, properties, publicLucyContent, reviews } from "@/content";
import type { CmsAdapter } from "./types";
export const repositoryCms: CmsAdapter = {
  async getProperties() { return properties.filter((property) => property.status === "active"); },
  async getPropertyBySlug(slug) { return properties.find((property) => property.slug === slug && property.status === "active") ?? null; },
  async getDestinations() { return destinations; },
  async getDestinationBySlug(slug) { return destinations.find((destination) => destination.slug === slug) ?? null; },
  async getReviews(propertyId) { return reviews.filter((review) => review.permissionStatus === "approved" && (!propertyId || review.propertyId === propertyId)); },
  async getFAQs(category) { return faqs.filter((faq) => !category || faq.category === category).sort((a, b) => a.sortOrder - b.sortOrder); },
  async getCampaignBySlug(slug) { return campaigns.find((campaign) => campaign.slug === slug && campaign.active) ?? null; },
  async getDesignPage() { return designPageContent; },
  async getPublicLucyContent() { return publicLucyContent; },
};
