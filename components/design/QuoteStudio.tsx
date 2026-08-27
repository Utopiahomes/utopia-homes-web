"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DesignAudience, DesignServiceId } from "@/types/content";
import type {
  AppliancePackage,
  DesignComplexity,
  DesignGrade,
  DesignLevel,
  DesignOption,
  PreliminaryQuote,
  QuoteInput,
  RenovationSeverity,
  RoomType,
  WalkthroughType,
} from "@/lib/design/types";
import { track } from "@/lib/analytics/events";
import { qualifyDesignQuote } from "@/lib/design/qualification";

const serviceNames: Record<DesignServiceId, Record<DesignAudience, string>> = {
  rental_readiness_audit: {
    rental: "Improve an Existing Rental",
    personal: "Improve an Existing Rental",
  },
  room_design_plan: {
    rental: "Transform a Room",
    personal: "Transform a Room",
  },
  whole_home_design_plan: {
    rental: "Design My Whole Home",
    personal: "Design My Whole Home",
  },
  renovation_design_plan: {
    rental: "Plan a Rental Renovation",
    personal: "Plan a Renovation or New Home",
  },
  turnkey_furnishing: {
    rental: "Furnish an Empty Rental",
    personal: "Furnish an Empty Home",
  },
};
const audienceServices: Record<DesignAudience, DesignServiceId[]> = {
  rental: [
    "rental_readiness_audit",
    "turnkey_furnishing",
    "renovation_design_plan",
  ],
  personal: [
    "room_design_plan",
    "whole_home_design_plan",
    "renovation_design_plan",
  ],
};
const phases = ["Goal", "Property", "Vision", "Estimate"],
  stepPhase = [0, 1, 1, 1, 2, 2, 3, 3],
  stepDetails = [
    "Starting point",
    "Home",
    "Details",
    "Scope",
    "Inspiration",
    "Options",
    "Estimate",
    "Acknowledge",
  ];
const serviceOptions: Record<DesignServiceId, DesignOption[]> = {
  rental_readiness_audit: [],
  turnkey_furnishing: ["rush"],
  room_design_plan: [
    "additional_direction",
    "visualization",
    "additional_revision",
  ],
  whole_home_design_plan: [
    "additional_direction",
    "visualization",
    "additional_revision",
  ],
  renovation_design_plan: ["visualization", "onsite_walkthrough", "rush"],
};
const optionLabels: Partial<Record<DesignOption, string>> = {
  visualization: "3D visualization",
  additional_direction: "Additional design direction",
  onsite_walkthrough: "On-site walkthrough",
  rush: "Rush timing",
  additional_revision: "Additional revision round",
};
const roomLabels: Array<[RoomType, string]> = [
  ["bedroom", "Bedrooms"],
  ["living_room", "Living rooms"],
  ["dining_room", "Dining rooms"],
  ["home_office", "Home offices"],
  ["kitchen", "Kitchens"],
  ["full_bathroom", "Full bathrooms"],
  ["half_bathroom", "Half bathrooms"],
  ["open_concept", "Open-concept areas"],
  ["specialty_room", "Game / specialty rooms"],
  ["outdoor_room", "Outdoor rooms"],
];
const specialtyChoices = [
  "Game room",
  "Theater",
  "Bunk room",
  "Pool area",
  "Outdoor entertaining",
  "Home gym",
  "Specialty kitchen",
  "Other",
];
const complexities: Array<[DesignComplexity, string, string]> = [
  [
    "standard",
    "Standard",
    "Conventional rooms and readily available furnishings",
  ],
  [
    "elevated",
    "Elevated",
    "More individualized selections or challenging spaces",
  ],
  [
    "custom",
    "Custom",
    "Bespoke elements, unusual architecture, or highly specialized requirements",
  ],
];
interface QuoteResponse {
  ok: boolean;
  message?: string;
  quote?: PreliminaryQuote;
  reopenToken?: string;
  schedulerUrl?: string | null;
  calendarEligible?: boolean;
  calendarEligibilityReason?: string;
}

export function QuoteStudio({
  initialAudience,
  initialService,
}: {
  initialAudience: DesignAudience;
  initialService: DesignServiceId | null;
}) {
  const [step, setStep] = useState(0),
    [audience, setAudience] = useState(initialAudience),
    [selectedService, setSelectedService] = useState<DesignServiceId | null>(
      initialService,
    );
  const [propertyMethod, setPropertyMethod] = useState<
      "address" | "listing" | "future"
    >("address"),
    [address, setAddress] = useState(""),
    [listingUrl, setListingUrl] = useState(""),
    [propertyType, setPropertyType] = useState("Not sure yet");
  const [livingArea, setLivingArea] = useState(0),
    [bedrooms, setBedrooms] = useState(0),
    [bathrooms, setBathrooms] = useState(0),
    [guestCapacity, setGuestCapacity] = useState(0);
  const [roomCount, setRoomCount] = useState(0),
    [roomQuantities, setRoomQuantities] = useState<
      Partial<Record<RoomType, number>>
    >({}),
    [affectedArea, setAffectedArea] = useState(0),
    [declaredBudget, setDeclaredBudget] = useState(0);
  const [kitchens, setKitchens] = useState(0),
    [fullBathrooms, setFullBathrooms] = useState(0),
    [halfBathrooms, setHalfBathrooms] = useState(0),
    [structuralConcepts, setStructuralConcepts] = useState(0),
    [specialtySelections, setSpecialtySelections] = useState<string[]>([]);
  const [outdoorArea, setOutdoorArea] = useState(0),
    [outdoorZones, setOutdoorZones] = useState(0),
    [structureCount, setStructureCount] = useState(1),
    [complexity, setComplexity] = useState<DesignComplexity>("standard");
  const [designLevel, setDesignLevel] = useState<DesignLevel>("elegant"),
    [renovationSeverity, setRenovationSeverity] =
      useState<RenovationSeverity>("moderate"),
    [threeDRooms, setThreeDRooms] = useState(1),
    [walkthrough, setWalkthrough] = useState<WalkthroughType>("local");
  const [merchandise, setMerchandise] = useState(0),
    [appliancePackage, setAppliancePackage] =
      useState<AppliancePackage>("none"),
    [inspiration, setInspiration] = useState(""),
    [grade, setGrade] = useState<DesignGrade>("elegant"),
    [selectedOptions, setSelectedOptions] = useState<DesignOption[]>([]);
  const [furnishingStatus, setFurnishingStatus] =
      useState<QuoteInput["scope"]["furnishingStatus"]>("unknown"),
    [projectStage, setProjectStage] =
      useState<QuoteInput["scope"]["projectStage"]>("unknown"),
    [kitchenScopeConfirmed, setKitchenScopeConfirmed] = useState(false),
    [bathroomScopeConfirmed, setBathroomScopeConfirmed] = useState(false);
  const [quote, setQuote] = useState<PreliminaryQuote | null>(null),
    [reopenToken, setReopenToken] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [acknowledged, setAcknowledged] = useState(false),
    [modelImprovementConsent, setModelImprovementConsent] = useState(false),
    [complete, setComplete] = useState(false),
    [schedulerUrl, setSchedulerUrl] = useState<string | null>(null),
    [calendarEligible, setCalendarEligible] = useState(false);
  const availableServices = audienceServices[audience],
    serviceId = selectedService ?? availableServices[0],
    futureProperty = propertyMethod === "future",
    phase = stepPhase[step];

  const input = useMemo<QuoteInput>(
    () => ({
      audience,
      serviceId,
      property: {
        address: propertyMethod === "address" ? address : "",
        listingUrl: propertyMethod === "listing" ? listingUrl : "",
        propertyType,
        livingArea,
        bedrooms,
        bathrooms,
        guestCapacity,
      },
      scope: {
        roomCount,
        roomQuantities,
        affectedArea,
        declaredConstructionBudget: declaredBudget,
        kitchenIncluded: kitchens > 0,
        kitchens,
        fullBathrooms,
        halfBathrooms,
        structuralChanges: structuralConcepts > 0,
        structuralChangeConcepts: structuralConcepts,
        specialtySpaces: specialtySelections.length,
        specialtySpaceSelections: specialtySelections,
        outdoorIncluded: outdoorArea > 0 || outdoorZones > 0,
        outdoorAffectedArea: outdoorArea,
        outdoorFurnishingZones: outdoorZones,
        structureCount,
        complexity,
        designLevel,
        renovationSeverity,
        threeDRooms: selectedOptions.includes("visualization")
          ? Math.max(1, threeDRooms)
          : 0,
        walkthrough: selectedOptions.includes("onsite_walkthrough")
          ? walkthrough
          : "none",
        merchandiseToProcure: merchandise,
        appliancePackage,
        completeMedia: false,
        furnishingStatus,
        projectStage,
        kitchenScopeConfirmed,
        bathroomScopeConfirmed,
      },
      grade,
      options: selectedOptions,
      informationCount: [
        address || listingUrl,
        propertyType !== "Not sure yet",
        livingArea,
        bedrooms,
        bathrooms,
        guestCapacity,
        roomCount,
        affectedArea,
        inspiration,
        complexity,
        grade,
      ].filter(Boolean).length,
      projectDescription: inspiration,
      retentionNoticeVersion: "2026-08-27.v2",
    }),
    [
      address,
      affectedArea,
      appliancePackage,
      audience,
      bathroomScopeConfirmed,
      bathrooms,
      bedrooms,
      complexity,
      declaredBudget,
      designLevel,
      fullBathrooms,
      furnishingStatus,
      grade,
      guestCapacity,
      halfBathrooms,
      inspiration,
      kitchenScopeConfirmed,
      kitchens,
      listingUrl,
      livingArea,
      merchandise,
      outdoorArea,
      outdoorZones,
      projectStage,
      propertyMethod,
      propertyType,
      renovationSeverity,
      roomCount,
      roomQuantities,
      selectedOptions,
      serviceId,
      specialtySelections,
      structuralConcepts,
      structureCount,
      threeDRooms,
      walkthrough,
    ],
  );
  const qualification = useMemo(() => qualifyDesignQuote(input), [input]);

  function updateAudience(next: DesignAudience) {
    if (next === audience) return;
    setAudience(next);
    setSelectedService(null);
    setSelectedOptions([]);
    setMessage("Please choose the starting outcome that fits this project.");
  }
  function chooseService(id: DesignServiceId) {
    setSelectedService(id);
    setSelectedOptions([]);
    if (id === "turnkey_furnishing") setGrade("rental");
    setMessage("");
  }
  function choosePropertyMethod(method: typeof propertyMethod) {
    setPropertyMethod(method);
    if (method === "future") {
      setAddress("");
      setListingUrl("");
      setPropertyType("Not sure yet");
      setLivingArea(0);
      setBedrooms(0);
      setBathrooms(0);
      setGuestCapacity(0);
    }
  }
  function toggleOption(id: DesignOption) {
    setSelectedOptions((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  }
  function toggleSpecialty(label: string) {
    setSpecialtySelections((items) =>
      items.includes(label)
        ? items.filter((item) => item !== label)
        : [...items, label],
    );
  }
  function next() {
    setMessage("");
    if (step === 0 && !selectedService)
      return setMessage("Choose the outcome that best describes your project.");
    if (step === 1 && propertyMethod === "address" && address.trim().length < 5)
      return setMessage(
        "Enter the property address, or choose another property option.",
      );
    if (
      step === 1 &&
      propertyMethod === "listing" &&
      !listingUrl.startsWith("http")
    )
      return setMessage("Enter the complete listing URL, including https://.");
    track({
      name: "quote_step_completed",
      properties: { audience, serviceId, quoteStep: step + 1 },
    });
    setStep((value) => Math.min(7, value + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function previous() {
    setMessage("");
    setStep((value) => Math.max(0, value - 1));
  }
  async function generateQuote() {
    if (!selectedService) {
      setStep(0);
      return setMessage("Choose the outcome that best describes your project.");
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/design/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as QuoteResponse;
      if (!response.ok || !result.quote || !result.reopenToken)
        return setMessage(
          result.message || "We couldn’t generate the estimate.",
        );
      setQuote(result.quote);
      setReopenToken(result.reopenToken);
      setStep(6);
      track({
        name: "quote_generated",
        properties: { audience, serviceId, quoteId: result.quote.id },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMessage("We couldn’t reach the estimate service. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function submitAcknowledgment(event: React.FormEvent) {
    event.preventDefault();
    if (!quote || !acknowledged) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/design/quotes/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          reopenToken,
          name,
          email,
          phone,
          acknowledged,
          modelImprovementConsent,
          website: "",
        }),
      });
      const result = (await response.json()) as QuoteResponse;
      if (!response.ok)
        return setMessage(
          result.message || "We couldn’t save your acknowledgment.",
        );
      setComplete(true);
      setSchedulerUrl(result.schedulerUrl || null);
      setCalendarEligible(Boolean(result.calendarEligible));
      track({
        name: "quote_acknowledged",
        properties: { audience, serviceId, quoteId: quote.id },
      });
    } catch {
      setMessage(
        "We couldn’t reach the acknowledgment service. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="quote-studio-page">
      <header className="quote-studio-header">
        <Link href={`/design?audience=${audience}`}>
          ← Back to Utopia Design
        </Link>
        <div>
          <strong>Quote Studio</strong>
          <span>Personalized project estimate</span>
        </div>
      </header>
      <nav className="quote-progress" aria-label="Quote Studio progress">
        <ol>
          {phases.map((label, index) => (
            <li
              key={label}
              aria-current={phase === index ? "step" : undefined}
              data-complete={index < phase}
            >
              <span>{index + 1}</span>
              <b>{label}</b>
            </li>
          ))}
        </ol>
      </nav>
      <div className="quote-studio-shell">
        <p className="quote-step-label">
          {phases[phase]} · {stepDetails[step]}
        </p>
        {step === 0 && (
          <section aria-labelledby="quote-goal">
            <h1 id="quote-goal">What should this home become?</h1>
            <p>
              Choose the option that best describes your project. You can change
              it later.
            </p>
            <fieldset>
              <legend>Space type</legend>
              <div className="quote-choice-row">
                <Choice
                  checked={audience === "rental"}
                  onChange={() => updateAudience("rental")}
                >
                  A vacation rental
                </Choice>
                <Choice
                  checked={audience === "personal"}
                  onChange={() => updateAudience("personal")}
                >
                  A home I live in
                </Choice>
              </div>
            </fieldset>
            <fieldset>
              <legend>Starting outcome</legend>
              <div className="quote-card-choices">
                {availableServices.map((id) => (
                  <Choice
                    key={id}
                    checked={selectedService === id}
                    onChange={() => chooseService(id)}
                  >
                    <span>{serviceNames[id][audience]}</span>
                  </Choice>
                ))}
              </div>
            </fieldset>
          </section>
        )}
        {step === 1 && (
          <section aria-labelledby="quote-property">
            <h1 id="quote-property">Tell us which home we’re working with.</h1>
            <div className="quote-card-choices quote-methods">
              {(["address", "listing", "future"] as const).map((method) => (
                <Choice
                  key={method}
                  checked={propertyMethod === method}
                  onChange={() => choosePropertyMethod(method)}
                >
                  <span>
                    {method === "address"
                      ? "Enter the property address"
                      : method === "listing"
                        ? "Enter a vacation-rental listing link"
                        : "I don’t have a property yet"}
                  </span>
                </Choice>
              ))}
            </div>
            {propertyMethod === "address" && (
              <Field label="Property address">
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  autoComplete="street-address"
                  required
                />
              </Field>
            )}
            {propertyMethod === "listing" && (
              <Field label="Vacation-rental listing URL">
                <input
                  type="url"
                  value={listingUrl}
                  onChange={(event) => setListingUrl(event.target.value)}
                  required
                />
              </Field>
            )}
            {futureProperty && (
              <p>
                Estimates are fine. You can update these details when the
                property or plans are available.
              </p>
            )}
          </section>
        )}
        {step === 2 && (
          <section aria-labelledby="quote-facts">
            <h1 id="quote-facts">
              {futureProperty
                ? "Tell us about the home you’re planning."
                : "Confirm the property facts."}
            </h1>
            <p>
              {futureProperty
                ? "Estimates are fine. You can update these details when the property or plans are available. Leave a number blank when you’re not sure."
                : "Please confirm or update these property details. Estimates are welcome if you are still planning the home."}
            </p>
            <div className="quote-field-grid">
              <Field label="Property type">
                <select
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value)}
                >
                  <option>Not sure yet</option>
                  <option>Single-family home</option>
                  <option>Condominium</option>
                  <option>Townhome</option>
                  <option>Multi-family property</option>
                </select>
              </Field>
              <NumberField
                label="Living area (sq. ft.)"
                value={livingArea}
                setValue={setLivingArea}
              />
              <NumberField
                label="Bedrooms"
                value={bedrooms}
                setValue={setBedrooms}
              />
              <NumberField
                label="Bathrooms"
                value={bathrooms}
                setValue={setBathrooms}
                step="0.5"
              />
              {audience === "rental" && (
                <NumberField
                  label="Intended guest capacity"
                  value={guestCapacity}
                  setValue={setGuestCapacity}
                />
              )}
            </div>
          </section>
        )}
        {step === 3 && (
          <section aria-labelledby="quote-scope">
            <h1 id="quote-scope">Tell us about the project scope.</h1>
            <fieldset>
              <legend>Project complexity</legend>
              <div className="quote-complexity-list">
                {complexities.map(([id, label, description]) => (
                  <Choice
                    key={id}
                    checked={complexity === id}
                    onChange={() => setComplexity(id)}
                  >
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                  </Choice>
                ))}
              </div>
            </fieldset>
            <div className="quote-field-grid">
              {serviceId === "room_design_plan" && (
                <>
                  {roomLabels.map(([id, label]) => (
                    <NumberField
                      key={id}
                      label={label}
                      value={roomQuantities[id] ?? 0}
                      setValue={(value) => {
                        const next = { ...roomQuantities, [id]: value };
                        setRoomQuantities(next);
                        setRoomCount(
                          Object.values(next).reduce(
                            (sum, quantity) => sum + (quantity ?? 0),
                            0,
                          ),
                        );
                      }}
                    />
                  ))}
                  <NumberField
                    label="Approximate room area (sq. ft.)"
                    value={affectedArea}
                    setValue={setAffectedArea}
                  />
                </>
              )}
              {serviceId === "whole_home_design_plan" && (
                <>
                  <NumberField
                    label="Living area to design (sq. ft.)"
                    value={livingArea}
                    setValue={setLivingArea}
                  />
                  <NumberField
                    label="Number of structures"
                    value={structureCount}
                    setValue={setStructureCount}
                  />
                </>
              )}
              {serviceId === "renovation_design_plan" && (
                <>
                  <NumberField
                    label="Affected area (sq. ft.)"
                    value={affectedArea}
                    setValue={setAffectedArea}
                  />
                  <NumberField
                    label="Planning construction budget"
                    value={declaredBudget}
                    setValue={setDeclaredBudget}
                  />
                  <Field label="Renovation scope">
                    <select
                      value={renovationSeverity}
                      onChange={(event) =>
                        setRenovationSeverity(
                          event.target.value as RenovationSeverity,
                        )
                      }
                    >
                      <option value="cosmetic">Cosmetic</option>
                      <option value="moderate">Moderate</option>
                      <option value="major">Major</option>
                    </select>
                  </Field>
                  <NumberField
                    label="Kitchens"
                    value={kitchens}
                    setValue={setKitchens}
                  />
                  <NumberField
                    label="Full bathrooms"
                    value={fullBathrooms}
                    setValue={setFullBathrooms}
                  />
                  <NumberField
                    label="Half bathrooms"
                    value={halfBathrooms}
                    setValue={setHalfBathrooms}
                  />
                  <NumberField
                    label="Structural concepts"
                    value={structuralConcepts}
                    setValue={setStructuralConcepts}
                  />
                  <NumberField
                    label="Outdoor area (sq. ft.)"
                    value={outdoorArea}
                    setValue={setOutdoorArea}
                  />
                  <label className="quote-ack-check">
                    <input
                      type="checkbox"
                      checked={kitchenScopeConfirmed}
                      onChange={(event) =>
                        setKitchenScopeConfirmed(event.target.checked)
                      }
                    />{" "}
                    I confirmed the kitchen scope, including if no kitchen work
                    is planned.
                  </label>
                  <label className="quote-ack-check">
                    <input
                      type="checkbox"
                      checked={bathroomScopeConfirmed}
                      onChange={(event) =>
                        setBathroomScopeConfirmed(event.target.checked)
                      }
                    />{" "}
                    I confirmed the bathroom scope, including if no bathroom
                    work is planned.
                  </label>
                  {audience === "personal" && (
                    <Field label="Current project stage">
                      <select
                        value={projectStage}
                        onChange={(event) =>
                          setProjectStage(
                            event.target
                              .value as QuoteInput["scope"]["projectStage"],
                          )
                        }
                      >
                        <option value="unknown">Choose a stage</option>
                        <option value="planning">Early planning</option>
                        <option value="property_selected">
                          Property selected
                        </option>
                        <option value="construction_documents">
                          Construction documents
                        </option>
                        <option value="construction_underway">
                          Construction underway
                        </option>
                      </select>
                    </Field>
                  )}
                </>
              )}
              {serviceId === "turnkey_furnishing" && (
                <>
                  <Field label="Current furnishing status">
                    <select
                      value={furnishingStatus}
                      onChange={(event) =>
                        setFurnishingStatus(
                          event.target
                            .value as QuoteInput["scope"]["furnishingStatus"],
                        )
                      }
                    >
                      <option value="unknown">Choose a status</option>
                      <option value="empty">Empty</option>
                      <option value="partially_furnished">
                        Partially furnished
                      </option>
                      <option value="replacement">
                        Replacing existing furnishings
                      </option>
                    </select>
                  </Field>
                  <NumberField
                    label="Living area to furnish (sq. ft.)"
                    value={livingArea}
                    setValue={setLivingArea}
                  />
                  <NumberField
                    label="Outdoor furnishing zones"
                    value={outdoorZones}
                    setValue={setOutdoorZones}
                  />
                  <NumberField
                    label="Existing merchandise to procure ($)"
                    value={merchandise}
                    setValue={setMerchandise}
                  />
                  <Field label="Appliance package">
                    <select
                      value={appliancePackage}
                      onChange={(event) =>
                        setAppliancePackage(
                          event.target.value as AppliancePackage,
                        )
                      }
                    >
                      <option value="none">No appliance package</option>
                      <option value="basic">Basic</option>
                      <option value="enhanced">Enhanced</option>
                      <option value="premium">Premium</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
            <fieldset>
              <legend>Specialty spaces</legend>
              <div className="quote-check-list">
                {specialtyChoices.map((label) => (
                  <label key={label}>
                    <input
                      type="checkbox"
                      checked={specialtySelections.includes(label)}
                      onChange={() => toggleSpecialty(label)}
                    />{" "}
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
        )}
        {step === 4 && (
          <section aria-labelledby="quote-vision">
            <h1 id="quote-vision">Show us what you’re imagining.</h1>
            <Field label="Style, priorities, and inspiration">
              <textarea
                rows={7}
                value={inspiration}
                onChange={(event) => setInspiration(event.target.value)}
                placeholder="Tell us how the home should feel, what must work better, and any references you love."
              />
            </Field>
            <fieldset disabled className="quote-upload-disabled">
              <legend>Photographs and floor plans</legend>
              <input
                type="file"
                multiple
                aria-label="Photographs and floor plans"
              />
              <p>Photo and floor-plan uploads are coming soon.</p>
            </fieldset>
          </section>
        )}
        {step === 5 && (
          <section aria-labelledby="quote-options">
            <h1 id="quote-options">
              {serviceId === "turnkey_furnishing"
                ? "Select the design level and options."
                : "Customize your project."}
            </h1>
            {serviceId === "turnkey_furnishing" && (
              <fieldset>
                <legend>Design level</legend>
                <div className="quote-card-choices">
                  {(["rental", "elegant", "utopian"] as DesignGrade[]).map(
                    (level) => (
                      <Choice
                        key={level}
                        checked={grade === level}
                        onChange={() => setGrade(level)}
                      >
                        <span>
                          {level === "rental"
                            ? "Rental"
                            : level === "elegant"
                              ? "Elegant"
                              : "Utopian"}
                        </span>
                      </Choice>
                    ),
                  )}
                </div>
              </fieldset>
            )}
            {serviceId === "whole_home_design_plan" && (
              <Field label="Whole-home design direction">
                <select
                  value={designLevel}
                  onChange={(event) =>
                    setDesignLevel(event.target.value as DesignLevel)
                  }
                >
                  <option value="rental_focused">
                    Practical and streamlined
                  </option>
                  <option value="elegant">Layered and individualized</option>
                  <option value="utopian">
                    Distinctive and highly considered
                  </option>
                </select>
              </Field>
            )}
            {serviceOptions[serviceId].length ? (
              <fieldset>
                <legend>Optional additions</legend>
                <div className="quote-check-list">
                  {serviceOptions[serviceId].map((id) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={selectedOptions.includes(id)}
                        onChange={() => toggleOption(id)}
                      />{" "}
                      {optionLabels[id]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p>
                The Rental Readiness Audit is already structured as a focused
                digital review, so there are no unnecessary add-ons.
              </p>
            )}
            {selectedOptions.includes("visualization") && (
              <NumberField
                label="Rooms to visualize in 3D"
                value={threeDRooms}
                setValue={setThreeDRooms}
              />
            )}
            {selectedOptions.includes("onsite_walkthrough") && (
              <Field label="Site visit">
                <select
                  value={walkthrough}
                  onChange={(event) =>
                    setWalkthrough(event.target.value as WalkthroughType)
                  }
                >
                  <option value="local">Local on-site walkthrough</option>
                  <option value="regional">Regional on-site walkthrough</option>
                </select>
              </Field>
            )}
            <p className="quote-retention-notice">
              We use your information to prepare and maintain your preliminary
              estimate. Unconverted quote information is retained for up to 12
              months. See our <Link href="/privacy">Privacy Policy</Link> for
              details.
            </p>
            <div className="quote-completeness" aria-live="polite">
              {qualification.missingRequirements.length ? (
                <>
                  <strong>This will be an early planning estimate.</strong>
                  <p>To qualify it for consultation scheduling, complete:</p>
                  <ul>
                    {qualification.missingRequirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <strong>
                  Your project has the inputs needed for a qualified preliminary
                  estimate.
                </strong>
              )}
            </div>
          </section>
        )}
        {step === 6 && quote && (
          <section aria-labelledby="quote-reveal">
            <p className="eyebrow">
              {quote.classification === "planning_estimate"
                ? "Early planning estimate"
                : "Qualified preliminary estimate"}
            </p>
            <h1 id="quote-reveal">Your Utopia Design estimate</h1>
            <div className="quote-total">
              <span>{quote.quoteNumber}</span>
              <strong>{money(quote.total)}</strong>
              <small>Personalized estimated total</small>
            </div>
            <dl className="quote-lines">
              {quote.lineItems.map((line) => (
                <div key={line.code}>
                  <dt>{line.label}</dt>
                  <dd>{money(line.amount)}</dd>
                </div>
              ))}
            </dl>
            {quote.classification === "planning_estimate" && (
              <div className="quote-completeness">
                <strong>
                  This estimate is based on limited information. Add the missing
                  scope details to receive a qualified preliminary estimate and
                  unlock your complimentary consultation.
                </strong>
                <p>
                  Complete the details below before consultation scheduling can
                  become available:
                </p>
                <ul>
                  {quote.missingRequirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="quote-columns">
              <div>
                <h2>Assumptions</h2>
                <ul>
                  {quote.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>Exclusions</h2>
                <ul>
                  {quote.exclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="quote-completeness">
              Information completeness:{" "}
              <strong>{quote.completenessScore}%</strong> · Expires{" "}
              {new Date(quote.expiresAt).toLocaleDateString()}
            </p>
            <p className="quote-disclaimer">
              This preliminary estimate is based on the information you provided
              and is intended for budgeting purposes only. It is not a binding
              quote. Final pricing will be confirmed after Utopia Design reviews
              the property, project scope, product availability, delivery
              requirements, and schedule.
            </p>
          </section>
        )}
        {step === 7 && quote && !complete && (
          <section aria-labelledby="quote-acknowledge">
            <h1 id="quote-acknowledge">
              Review and acknowledge your estimate.
            </h1>
            <p>
              {quote.classification === "qualified_preliminary_estimate"
                ? "The complimentary consultation becomes available after you acknowledge this preliminary, nonbinding estimate."
                : "You may save and send this early planning estimate now. Complete its missing scope details before consultation scheduling can become available."}
            </p>
            <form onSubmit={submitAcknowledgment}>
              <div className="quote-field-grid">
                <Field label="Your name">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </Field>
                <Field label="Phone (optional)">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                  />
                </Field>
              </div>
              <label className="quote-ack-check">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  required
                />{" "}
                I acknowledge that this is a preliminary, nonbinding estimate
                and that final pricing follows Utopia Design’s review.
              </label>
              <label className="quote-ack-check">
                <input
                  type="checkbox"
                  checked={modelImprovementConsent}
                  onChange={(event) =>
                    setModelImprovementConsent(event.target.checked)
                  }
                />{" "}
                Help us improve Utopia Design. I agree that Utopia may use
                de-identified information from my project to improve its
                services, estimating methods, and design systems. My name,
                contact information, and precise property address will not be
                included. Photographs, floor plans, listing images, and
                free-form descriptions are excluded from de-identified learning
                data unless you provide separate permission.
              </label>
              <button
                type="submit"
                className="button button-primary"
                disabled={busy || !acknowledged}
              >
                {busy ? "Saving…" : "Acknowledge My Estimate"}
              </button>
            </form>
          </section>
        )}
        {complete && (
          <section className="quote-success" aria-labelledby="quote-complete">
            <p className="eyebrow">Estimate acknowledged</p>
            <h1 id="quote-complete">Your design conversation can begin.</h1>
            <p>
              We emailed your estimate and shared your project profile with
              Utopia Design. Meghan’s team will follow up about the next step.
            </p>
            {schedulerUrl ? (
              <a className="button button-primary" href={schedulerUrl}>
                Schedule the complimentary consultation
              </a>
            ) : calendarEligible ? (
              <>
                <button
                  type="button"
                  className="button quote-calendar-disabled"
                  disabled
                >
                  Calendar scheduling · Coming soon
                </button>
                <p className="quote-calendar-note">
                  We’ll contact you directly while calendar scheduling is being
                  prepared.
                </p>
              </>
            ) : (
              <div className="quote-calendar-note">
                <p>
                  Consultation scheduling is not available for an early planning
                  estimate.
                </p>
                <div className="quote-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      setComplete(false);
                      setStep(1);
                    }}
                  >
                    Complete My Estimate
                  </button>
                  <Link className="button" href="/contact?inquiryType=design">
                    Contact the Design Team
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}
        <p className="quote-message" role="alert">
          {message}
        </p>
        {!complete && (
          <div className="quote-actions">
            {step > 0 && (
              <button type="button" className="button" onClick={previous}>
                Back
              </button>
            )}
            {step < 5 && (
              <button
                type="button"
                className="button button-primary"
                onClick={next}
              >
                Continue
              </button>
            )}
            {step === 5 && (
              <button
                type="button"
                className="button button-primary"
                onClick={generateQuote}
                disabled={busy}
              >
                {busy ? "Calculating…" : "Generate My Estimate"}
              </button>
            )}
            {step === 6 && (
              <button
                type="button"
                className="button button-primary"
                onClick={next}
              >
                Review and Acknowledge
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Choice({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <input type="radio" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="quote-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function NumberField({
  label,
  value,
  setValue,
  step = "1",
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        step={step}
        value={value || ""}
        placeholder="I’m not sure"
        onChange={(event) =>
          setValue(event.target.value === "" ? 0 : Number(event.target.value))
        }
      />
    </Field>
  );
}
function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
