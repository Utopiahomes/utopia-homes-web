import { describe, expect, it, vi } from "vitest";
import { track } from "@/lib/analytics/events";
describe("analytics abstraction", () => { it("dispatches a typed browser event", () => { const spy = vi.fn(); window.addEventListener("utopia:analytics", spy); track({ name: "property_view", properties: { propertyId: "p1", slug: "home", destination: "d1" } }); expect(spy).toHaveBeenCalledOnce(); }); });
