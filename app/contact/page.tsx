import type { Metadata } from "next";
import { LeadForm } from "@/components/forms/LeadForm";
import { PageHero } from "@/components/PageHero";
export const metadata: Metadata = { title: "Contact", description: "Contact Utopia Homes about stays, property management, design, or general questions." };
export default function ContactPage() { return <><PageHero eyebrow="Say hello" title={<>Let’s make something<br /><em>memorable.</em></>} intro="Guest question, standout home, design opportunity, or simply a good idea—we’d like to hear it." tone="dark" /><section className="form-section"><LeadForm kind="contact" title="How can we help?" submitLabel="Send your message" /></section></>; }
