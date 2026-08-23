"use client";
import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics/events";
export function AnalyticsView({ event }: { event: AnalyticsEvent }) { useEffect(() => { track(event); }, [event]); return null; }
