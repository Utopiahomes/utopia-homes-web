# Utopia Design Subpage and Quote Studio

## Detailed implementation specification for Lyra

**Status:** Build-ready design specification  
**Prepared for:** Utopia Homes / Utopia Design  
**Primary owner:** Ray DeLuca  
**Design lead and public face:** Meghan DeLuca  
**Target route:** `/design` on the Utopia Homes website  
**Document version:** 1.0 — August 27, 2026

---

## 1. Executive direction

Build one Utopia Design subpage with two audience-specific sales journeys:

1. **A vacation rental**
2. **A home I live in**

Both journeys use the same brand, page components, underlying service catalog, property record, Quote Studio, pricing rules, lead database, email workflow, and consultation scheduler. The audience selection changes the sales psychology, page order, copy, imagery, calls to action, and customer-facing names.

The page must sell the desired transformation before discussing price. Pricing is not the hero message. The preliminary estimate is the earned payoff at the end of a visual, structured project-intake experience.

The customer must receive and affirmatively acknowledge a preliminary, nonbinding estimate before the complimentary 30-minute consultation becomes available.

### Core experience principle

> Rental and personal-home customers share one platform, but they should not receive the same sales pitch.

### Primary conversion

The main conversion is not “contact us.” It is:

> **Build a Utopia Design project profile and receive a preliminary estimate.**

### Brand hierarchy

- **Parent brand:** Utopia Homes
- **Service brand:** Utopia Design
- **Public design lead:** Meghan DeLuca
- **Technology:** Helpful and mostly invisible. It accelerates intake, planning, and preparation but is not the emotional face of the service.

---

## 2. Business goals

The page must:

1. Establish Utopia Design as a credible extension of Utopia Homes.
2. Speak persuasively to both vacation-rental owners and personal homeowners.
3. Use real project work to establish taste and operating credibility.
4. Help visitors select an outcome without needing to understand industry terminology.
5. Generate an exact preliminary, nonbinding estimate online.
6. Prevent unqualified or price-resistant leads from reaching Meghan’s calendar.
7. Create a complete, structured lead record before the consultation.
8. Preserve one maintainable quoting application rather than separate calculators.
9. Give SI systems enough structured data and visual material to prepare the project before human review.

### Non-goals for V1

- Do not build five separate quote applications.
- Do not make price the primary brand promise.
- Do not offer an unrestricted free-consultation booking link.
- Do not scrape Airbnb or other third-party listing sites in violation of their terms.
- Do not imply that an automated estimate is a binding proposal.
- Do not market Meghan as an “AI designer.”
- Do not require every external data integration before launch.

---

## 3. Audience selection and state

### Required selector

Place this directly beneath the main navigation and above the hero:

> **What kind of space are you designing?**

- **A vacation rental**
- **A home I live in**

### Behavior

- Default to **Vacation Rental** when a visitor arrives from a Utopia Homes property, owner-services page, rental-management campaign, or tagged rental advertisement.
- Default to **Personal Home** when a visitor arrives from a residential-design campaign or appropriately tagged link.
- If no source is known, default to **Vacation Rental** for V1 because Utopia Homes is the parent brand.
- Preserve the visitor’s manual choice for the session.
- Reflect the choice in the URL when practical: `?audience=rental` or `?audience=personal`.
- Persist the selected audience into the Quote Studio, quote record, analytics events, and emails.
- Changing the audience updates the page without a hard reload.
- The chosen state must remain obvious and keyboard accessible.

### The selector changes

- Hero copy and imagery
- Benefit statements
- Primary calls to action
- Customer goal cards
- Case-study content
- Section order
- Customer-facing service labels
- Quote Studio question wording
- Confirmation and email wording

### The selector does not change

- Parent navigation and brand identity
- Core components
- Quote Studio application
- Pricing-rule engine
- Customer/property/quote records
- Authentication or reopening mechanism
- Acknowledgment requirement
- Internal service taxonomy
- Email and lead workflows

---

## 4. Audience-specific page order

The components are shared, but their order changes.

### Vacation-rental journey

1. Navigation and audience selector
2. Rental hero
3. Rental value strip
4. Rental outcome choices
5. Rental case study
6. Quote Studio introduction
7. Meghan and the human-design story
8. Final call to action
9. Footer

Rental customers generally need proof that Utopia understands operating properties before they need the designer biography.

### Personal-home journey

1. Navigation and audience selector
2. Personal-home hero
3. Personal value strip
4. Meghan and her design philosophy
5. Residential case study or portfolio story
6. Personal outcome choices
7. Quote Studio introduction
8. Final call to action
9. Footer

Personal-home customers generally need emotional trust in the designer before they engage with a structured intake process.

---

## 5. Navigation

### Recommended desktop navigation

- Utopia Design logo/wordmark
- Our Work
- Services
- How It Works
- Meet Meghan
- Primary button: **Start My Project**

Display “Design by Utopia Homes” or “A Utopia Homes Company” beneath or adjacent to the Utopia Design wordmark.

### Mobile navigation

- Brand at left
- Menu control at right
- Keep the audience selector visible beneath the header
- The primary CTA may remain visible if it fits without crowding

### Anchor behavior

- “Our Work” scrolls to the current audience’s case study or portfolio section.
- “Services” scrolls to the outcome chooser.
- “How It Works” scrolls to the Quote Studio introduction.
- “Meet Meghan” scrolls to Meghan’s section.
- “Start My Project” preserves the current audience and begins the Quote Studio.

---

## 6. Hero specifications

### Rental hero

**Eyebrow**

> Design for memorable stays

**Headline**

> Spaces guests remember. Homes that earn their keep.

**Supporting copy**

> We create distinctive rental interiors that photograph beautifully, stand up to real guests, and make the entire property feel worth choosing.

**Primary CTA**

> Improve My Rental

**Secondary CTA**

> See Our Work

**Image direction**

Use a strong, real Utopia Homes interior—preferably a memorable room with both visual personality and obvious guest utility. Avoid generic stock interiors.

### Personal-home hero

**Eyebrow**

> Design for the life you live

**Headline**

> A home that feels unmistakably yours.

**Supporting copy**

> We shape beautiful, comfortable rooms around your routines, your taste, and the way you want your home to feel every day.

**Primary CTA**

> Design My Home

**Secondary CTA**

> See Our Work

**Image direction**

Use a warm, lived-in residential or second-home project. It should feel personal rather than staged, preferably with small signs of real use.

### Hero requirements

- One clear headline; do not place pricing in the hero.
- Use real photography as soon as assets are available.
- Support responsive image crops with meaningful focal points.
- Use descriptive alt text based on the actual room and design result.
- Avoid autoplay video in V1.

---

## 7. Audience value strip

Display three short benefit statements immediately beneath the hero.

### Rental

1. **Photographs beautifully**  
   Creates the instant visual confidence that earns the click.
2. **Works for real guests**  
   Durable choices, intuitive spaces, and fewer operational headaches.
3. **Feels worth booking**  
   Memorable details that support reviews, repeat stays, and rate.

Do not promise a specific revenue increase without supporting evidence.

### Personal home

1. **Personal to you**  
   A point of view drawn from your taste, routines, and story.
2. **Beautiful in real life**  
   Comfort and function matter as much as the photograph.
3. **Cohesive over time**  
   A plan that helps every room belong to the same home.

---

## 8. Outcome chooser

The public page presents customer goals, not internal service names. Display three primary choices for each audience.

### Rental outcome cards

#### Improve an Existing Rental

> Identify the design and guest-experience changes with the greatest potential.

Primary internal route: `rental_readiness_audit`

#### Furnish an Empty Rental

> Move from empty rooms to a complete, distinctive, guest-ready property.

Primary internal route: `turnkey_furnishing`

#### Plan a Rental Renovation

> Make design decisions before construction begins and costs lock in.

Primary internal route: `renovation_design_plan`

### Personal-home outcome cards

#### Transform a Room

> Give one important space a complete identity, layout, and design direction.

Primary internal route: `room_design_plan`

#### Design My Whole Home

> Bring every room together around one personal design language.

Primary internal route: `whole_home_design_plan`

#### Plan a Renovation or New Home

> See the finished direction before construction decisions lock in.

Primary internal route: `renovation_design_plan`

### “Help me choose” route

Under the outcome cards, display:

> **Not sure where your project fits?** Answer three quick questions and we’ll recommend the right starting point.

The questions should be:

1. Is the property furnished, partially furnished, or empty?
2. Are you changing one room, several rooms, the whole property, or the building itself?
3. Do you want a plan to execute yourself, help purchasing, or a turnkey result?

The recommendation enters the same Quote Studio with the suggested internal service preselected. The visitor can change it.

---

## 9. Canonical service catalog

Keep a stable internal taxonomy even when customer-facing labels differ.

| Internal service ID | Rental-facing label | Personal-facing label | Primary pricing basis |
|---|---|---|---|
| `rental_readiness_audit` | Improve My Rental | Not shown as a primary personal path | Bedrooms, bathrooms, guest capacity, amenities, photos, property complexity |
| `room_design_plan` | Design a Rental Room | Transform a Room | Room types, number of rooms, size, complexity, revisions, optional visualization |
| `whole_home_design_plan` | Design the Whole Rental | Design My Whole Home | Living area, room count, complexity, revisions, optional visualization |
| `renovation_design_plan` | Plan a Rental Renovation | Plan a Renovation or New Home | Affected area, kitchens, bathrooms, structural scope, outdoor scope, complexity |
| `turnkey_furnishing` | Guest-Ready Home Setup | Full-Service Furnishing | Living area, furnishing grade, property condition, installation, logistics, options |

The sixth public offering is the **Complimentary 30-Minute Design Consultation**, which is gated behind estimate acknowledgment. It is not displayed as an equal outcome card.

### Turnkey furnishing grades

Use the following preliminary headline budgets unless later financial modeling changes them:

| Grade | Working headline estimate |
|---|---:|
| Rental Grade | $35 per living sq. ft. |
| Elegant Grade | $45 per living sq. ft. |
| Utopian Grade | $55 per living sq. ft. |

Internally separate merchandise allowance, design/procurement fee, delivery, installation, travel, and contingency even if the customer initially sees one headline estimate.

---

## 10. Case-study module

Each audience needs at least one believable transformation story between the sales pitch and Quote Studio.

### Rental case-study template

**Eyebrow**

> A real-world transformation

**Headline**

> From empty rooms to a guest-ready destination.

**Story structure**

1. The property and intended guest
2. The design or operational problem
3. Meghan’s core design decisions
4. How durability and guest use affected selections
5. The finished result
6. Honest operational results when available

Suggested facts:

- Property type
- Approximate size
- Guest capacity
- Scope
- Design grade
- Completion period

### Personal case-study template

**Eyebrow**

> A home brought together

**Headline**

> From disconnected rooms to one personal design language.

**Story structure**

1. How the homeowner wanted the space to feel
2. Existing pieces or constraints
3. Routines the design needed to support
4. Meghan’s unifying choices
5. The finished, lived-in result

### Visual behavior

- Prefer a before/after slider when equivalent photographs exist.
- Otherwise use a small editorial sequence: before, plan/mood board, after.
- Never use a fake “before” image.
- Label conceptual renderings as renderings.
- Use real project facts and avoid unsupported claims.

---

## 11. Meghan section

Meghan is the human face of Utopia Design. Use an environmental portrait—Meghan in a property, reviewing materials, styling a room, or walking a project—rather than a generic corporate headshot.

### Heading

> Technology prepares the canvas. Meghan makes it yours.

### Working first-person statement

> “A beautiful space should feel considered without feeling untouchable.”

This is placeholder copy until Meghan approves or replaces it.

### Supporting copy

> The Quote Studio organizes the property details, preferences, and inspiration. Meghan brings the judgment and design eye that turn those facts into a place with character.

### Three principles

- Comfort with character
- Beauty that works
- Every room belongs

### Placement

- Rental mode: after the case study and Quote Studio introduction.
- Personal mode: immediately after the hero/value strip and before the case study.

### Technology positioning

The site may explain that the platform organizes intake and accelerates preparation. Do not lead with “AI,” “automation,” or an artificial designer persona. The customer is buying Meghan’s judgment supported by a better system.

---

## 12. Quote Studio entry

### Section heading

> Your project takes shape before the call.

### Supporting copy

> Tell us about the property, confirm what we find, and show us the spaces. Once the scope is clear, you’ll receive an exact preliminary estimate to review before scheduling with Meghan.

### Simplified journey preview

1. **Goal** — What should change?
2. **Property** — Confirm the home
3. **Vision** — Rooms, photographs, and style
4. **Estimate** — Review and acknowledge

### Audience-specific CTA

- Rental: **Evaluate My Rental**
- Personal: **Build My Home Profile**

### Required gating copy

> The complimentary consultation becomes available after the preliminary estimate is reviewed and acknowledged.

---

## 13. Unified Quote Studio storyboard

Build one application shell with service-specific rule sets and question modules.

### Screen 1 — Confirm the goal

- Display the selected audience and customer goal.
- Allow the customer to change either without losing completed compatible fields.
- Briefly explain the expected deliverable.

### Screen 2 — Identify the property

Prompt:

> Tell us which home we’re working with.

Choices:

- Enter the property address
- Enter a vacation-rental listing link
- I don’t have a property yet

V1 should use standardized address autocomplete. A pasted listing URL is stored as a reference; do not assume the system may scrape it.

### Screen 3 — Confirm property facts

Prompt:

> We found this property. Please confirm what’s correct.

Potential fields:

- Standardized address
- Property type
- Living area
- Bedrooms
- Full bathrooms
- Half bathrooms
- Year built
- Number of floors
- Rental status
- Intended guest capacity
- Map thumbnail

Every prefilled field must be editable. Record both the source value and the customer-confirmed value.

### Screen 4 — Confirm project scope

Questions change by service.

#### Rental Readiness Audit

- Current listing status
- Bedrooms, bathrooms, and guest capacity
- Existing amenities
- Problem areas
- Review or guest-feedback themes
- Photography status
- Desired outcome

#### Room Design Plan

- Room types
- Approximate dimensions
- Open-concept relationships
- Current condition
- Items to keep
- Intended users

#### Whole-Home Design Plan

- Living area
- Room list
- Property occupancy and use
- Existing furnishings to keep
- Desired implementation approach
- Design consistency issues

#### Renovation Design Plan

- Affected square footage
- Kitchen included
- Full and half bathrooms included
- Cosmetic, moderate, or major renovation
- Possible structural changes
- Outdoor areas
- Construction timeline

#### Turnkey Furnishing

- Living area
- Bedrooms and bathrooms
- Guest capacity when applicable
- Empty, partially furnished, or furnished
- Appliances needed
- Outdoor areas
- Pool, game room, theater, or specialty spaces
- Target furnishing grade
- Desired completion date

### Screen 5 — Show us the home

Accept:

- Current photographs
- Floor plan
- Inspiration images
- Pinterest or inspiration link
- Existing listing URL
- Optional description

Display a completeness message, for example:

> Your estimate is based on 9 confirmed property details and 12 uploaded photographs.

Do not call the measure “accuracy.” Use **Quote completeness** or **Information completeness**.

### Screen 6 — Select design level and options

Display the three furnishing grades only when relevant:

- **Rental Grade** — Durable, attractive, and value-conscious
- **Elegant Grade** — More distinctive finishes and upgraded furnishings
- **Utopian Grade** — Highly memorable, premium, and individually considered

Potential options:

- 3D visualization
- Additional design direction
- On-site walkthrough
- Rush delivery
- Outdoor-space design
- Additional revision round

The preliminary price may update during this screen, but do not visually dominate every question with a running total.

### Screen 7 — Quote reveal

Heading:

> Your preliminary Utopia Design estimate

Display:

- Exact preliminary total
- Itemized components
- Included deliverables
- Exclusions
- Expected delivery period
- Assumptions
- Meetings and revision allowance
- Quote-completeness indicator
- Estimate expiration date

Use an exact preliminary number rather than a range, but describe it clearly as nonbinding.

Required disclaimer:

> This preliminary estimate is based on the information you provided and is intended for budgeting purposes only. It is not a binding quote. Final pricing will be confirmed after Utopia Design reviews the property, project scope, product availability, delivery requirements, and schedule.

### Screen 8 — Acknowledge, save, and schedule

Required checkbox:

> I understand that this is a preliminary, nonbinding estimate and that final pricing will be confirmed after Utopia Design reviews the property and project scope.

Then collect or confirm:

- Name
- Email
- Phone, optional
- Preferred communication method, optional

Primary action:

> Email My Estimate

After acknowledgment and lead creation:

> **Your project appears to be a fit. Schedule your complimentary 30-minute design consultation.**

Do not expose Meghan’s scheduling calendar before acknowledgment succeeds.

---

## 14. Quote logic architecture

Separate the pricing engine from the visual questionnaire.

### Recommended conceptual layers

1. **Questionnaire schema** — Which questions appear for each service and audience
2. **Normalization layer** — Converts raw answers into stable pricing inputs
3. **Pricing rule set** — Base prices, unit prices, options, minimums, modifiers, and exclusions
4. **Quote renderer** — Customer-facing line items, assumptions, and disclaimer
5. **Lead converter** — Saves the customer, property, project, uploads, quote, and acknowledgment

Pricing rules should be configuration-driven and versioned. A saved quote must retain the pricing-rule version used to generate it.

### Required quote outputs

- Unique quote number
- Audience
- Customer goal
- Internal service ID
- Normalized property facts
- Selected options
- Line items
- Subtotal
- Preliminary total
- Assumptions
- Exclusions
- Rule-set version
- Information-completeness score
- Generated timestamp
- Expiration timestamp
- Acknowledgment timestamp
- Status

### Suggested quote statuses

- `draft`
- `generated`
- `acknowledged`
- `consultation_scheduled`
- `under_designer_review`
- `revised`
- `converted`
- `declined`
- `expired`

---

## 15. Data model

Exact implementation may follow the existing Utopia Homes backend, but preserve these logical records.

### Customer

- `customer_id`
- Name
- Email
- Phone
- Communication preference
- Marketing consent and timestamp, separate from quote delivery
- Created and updated timestamps

### Property

- `property_id`
- Standardized address fields
- Coordinates
- Property type
- Living area
- Bedrooms
- Full and half bathrooms
- Floors
- Year built
- Guest capacity
- Rental status
- Listing URLs
- Original source values
- Customer-confirmed values
- Data-source metadata and timestamps

### Project

- `project_id`
- `customer_id`
- `property_id`, nullable before property selection
- Audience
- Customer goal
- Internal service ID
- Scope answers
- Design grade
- Options
- Desired schedule
- Customer description
- Current status

### Upload

- `upload_id`
- `project_id`
- File type
- Storage reference
- Original filename
- Customer label
- Content category
- Uploaded timestamp
- Processing status
- Access controls

### Quote

- `quote_id`
- Human-readable quote number
- `project_id`
- Rule-set version
- Input snapshot
- Line items
- Total
- Assumptions
- Exclusions
- Completeness score
- Generated and expiration timestamps
- Status

### Estimate acknowledgment

- `acknowledgment_id`
- `quote_id`
- Exact disclaimer version
- Customer confirmation
- Timestamp
- Relevant session/user metadata permitted by privacy policy

### Consultation

- `consultation_id`
- `quote_id`
- Scheduled time
- Scheduler event reference
- Status
- Designer assignment
- Notes and outcome

---

## 16. Lead and email workflow

Email is a notification channel, not the system of record.

### Customer email

Subject example:

> Your Utopia Design Estimate — Quote UD-2026-00123

Include:

- Preliminary estimate
- Project summary
- Included services
- Assumptions and exclusions
- Property reference
- Link to reopen the quote
- Consultation scheduling link only after acknowledgment
- Contact/support path

### Internal email

Subject example:

> New Utopia Design Lead — Whole-Home Design — $8,495

Include:

- Customer contact information
- Audience and selected goal
- Property address
- Internal service ID
- Quote total
- Property facts
- Selected options
- Automatically populated data
- Customer-corrected data
- Upload summary and secure record link
- Quote completeness
- Consultation time, when booked
- Link to the canonical lead record

### Designer preparation

Before the consultation, the system should be able to generate an internal intake summary containing:

- Customer objective
- Property summary
- Important constraints
- Visual themes from uploaded inspiration
- Items requiring human verification
- Preliminary quote and assumptions
- Suggested consultation agenda

All synthetic summaries must link back to source fields and uploads. They do not replace the source record.

---

## 17. Property and listing data

### V1

- Address autocomplete and standardization
- Customer-entered and customer-confirmed facts
- Listing URL stored as a reference
- Photo and floor-plan uploads
- No dependency on third-party property enrichment

### V1.5

- Licensed property-data prefill such as ATTOM or an equivalent provider
- SI-generated intake summary
- Automated image organization
- Quote completeness scoring

### V2

- AirDNA enrichment where licensed and commercially justified
- Uplisting-connected property imports for authorized owners
- Rental-performance context
- Revenue-impact analysis with explicit assumptions

### Rules

- Never treat third-party data as authoritative without customer confirmation.
- Preserve data provenance.
- Do not scrape Airbnb or another platform in violation of its terms.
- A listing URL alone does not authorize automated collection.
- Existing Utopia/Uplisting customers may use authorized integrations when permissions allow.

---

## 18. Content and asset requirements

Lyra should create a clear asset checklist before final visual implementation.

### Required launch assets

- Utopia Design wordmark or approved typographic treatment
- Rental hero photograph
- Personal-home hero photograph
- Meghan environmental portrait
- At least one rental case study
- At least one residential or second-home case study, if available
- Before photographs
- After photographs
- Floor plans or mood boards when publishable
- Approved Meghan biography
- Approved first-person statement
- Accurate project facts
- Privacy and estimate disclaimer language

### Fallback if personal-home work is limited

Use Utopia properties to demonstrate design principles, but do not misrepresent a rental property as a personal residence. Position it as a second-home or hospitality design example when accurate.

### CMS requirements

The following must be editable without code deployment:

- Hero copy and imagery by audience
- Value statements
- Outcome-card copy
- Meghan content
- Case studies
- Furnishing-grade descriptions
- Options and display labels
- Disclaimer versions
- FAQs
- Calls to action

Pricing formulas and rule versions should be editable only through an authorized administrative workflow, not ordinary marketing CMS access.

---

## 19. Component map

Use the site’s existing framework and design system. Suggested component boundaries:

- `UtopiaDesignPage`
- `AudienceSelector`
- `DesignHero`
- `AudienceValueStrip`
- `OutcomeChooser`
- `OutcomeCard`
- `HelpMeChoose`
- `DesignCaseStudy`
- `MeghanProfile`
- `QuoteStudioIntro`
- `QuoteStudioShell`
- `QuoteProgress`
- `PropertyIdentificationStep`
- `PropertyConfirmationStep`
- `ProjectScopeStep`
- `ProjectUploadsStep`
- `DesignOptionsStep`
- `QuoteRevealStep`
- `EstimateAcknowledgment`
- `ConsultationUnlock`
- `DesignFAQ`
- `DesignFinalCTA`

Do not couple pricing rules directly to presentation components. Components send normalized inputs to the pricing service and render the returned quote.

---

## 20. URL, state, and recovery behavior

- Primary public route: `/design`
- Audience query parameter: `audience=rental|personal`
- Optional goal parameter: `goal=<stable-goal-key>`
- Quote reopening should use a secure opaque token, not sequential database identifiers.
- Autosave after meaningful steps once an email or recoverable session exists.
- A visitor who leaves before providing contact information may resume within the same browser session when technically practical.
- A customer reopening a generated quote sees the saved input snapshot and current quote status.
- If pricing rules change, do not silently recalculate an existing quote. Offer an explicit refresh or generate a new version.

---

## 21. Analytics and funnel events

Track at minimum:

- `design_page_viewed`
- `design_audience_selected`
- `design_case_study_viewed`
- `design_goal_selected`
- `design_help_me_choose_started`
- `quote_studio_started`
- `quote_step_completed`
- `property_prefill_used`
- `property_fact_corrected`
- `quote_upload_added`
- `quote_generated`
- `quote_acknowledged`
- `quote_emailed`
- `consultation_unlocked`
- `consultation_scheduled`
- `quote_abandoned`

Common event properties:

- Audience
- Goal
- Internal service ID
- Quote step
- Referral source
- Device class
- Quote ID after creation
- No sensitive upload content

Primary funnel:

> Page view → audience selected → goal selected → Quote Studio started → estimate generated → estimate acknowledged → consultation scheduled

Do not optimize only for consultation volume. Track estimate completion, qualification, show rate, conversion to paid work, project margin, and designer hours.

---

## 22. Accessibility requirements

- Meet WCAG 2.2 AA expectations for the public page and Quote Studio.
- The audience selector must use native buttons or radio controls with a clear selected state.
- All functionality must work with keyboard navigation.
- Use a logical heading hierarchy.
- Provide visible focus states.
- Maintain sufficient color contrast.
- Use descriptive alt text for meaningful project photography.
- Decorative images must use empty alt text.
- Upload controls require clear labels and error messages.
- Step changes should announce appropriate status without over-announcing.
- Validation errors must identify the field and recovery action.
- Do not rely on color alone for grade, completeness, or progress.
- Support reduced-motion preferences.

---

## 23. Responsive behavior

### Desktop

- Split hero with copy and strong photography.
- Three outcome cards in one row.
- Case study may use side-by-side before/after imagery and narrative.
- Quote Studio can use a centered bounded application surface.

### Tablet

- Preserve two-column hero when readable; otherwise stack.
- Outcome cards may use two columns with the third spanning or centered.
- Keep audience selection obvious.

### Mobile

- Stack hero copy and image.
- Audience choices must fit without horizontal scrolling.
- Stack outcome cards.
- Show one Quote Studio question group at a time.
- Use touch targets of at least approximately 44×44 CSS pixels.
- Keep progress visible but compact.
- Do not use hover-only information.
- Avoid large fixed-height image regions that push the CTA below several screens.

---

## 24. Performance, privacy, and security

### Performance

- Optimize and responsively serve project images.
- Lazy-load below-the-fold media.
- Avoid large client-side bundles for the marketing portion.
- Do not load the entire Quote Studio until needed if code splitting is available.
- Target strong Core Web Vitals on realistic mobile connections.

### Privacy

- Explain how customer photographs, floor plans, and property details will be used.
- Obtain separate marketing consent; quote delivery consent is not marketing consent.
- Provide a deletion/contact path.
- Do not expose uploads in public URLs.
- Use time-limited or authenticated access for customer and internal upload retrieval.

### Security

- Validate file types and sizes.
- Scan uploads before internal use when infrastructure supports it.
- Rate-limit quote generation and email delivery.
- Protect scheduler and lead endpoints from direct bypass.
- Enforce acknowledgment server-side, not only through a disabled front-end button.
- Log quote revisions and material lead-record changes.

---

## 25. Recommended build sequence

### Phase 1 — Marketing page shell

- `/design` route
- Audience selector and state
- Audience-specific hero, benefits, order, goals, and CTAs
- Meghan section
- One case-study template per audience
- Quote Studio introduction
- Responsive and accessible behavior

### Phase 2 — Quote Studio V1

- Shared application shell
- Five internal service schemas
- Address autocomplete
- Customer-entered property facts
- Scope questions
- Uploads
- Furnishing grades and options
- Versioned pricing rules
- Exact preliminary estimate
- Disclaimer and acknowledgment
- Lead record
- Customer and internal emails
- Consultation unlock

### Phase 3 — Operational preparation

- Designer lead view
- Quote revision and conversion
- SI-generated intake summary
- Analytics funnel
- Abandonment recovery
- Administrative pricing configuration

### Phase 4 — Enrichment

- Licensed property-data prefill
- Uplisting authorized imports
- AirDNA or other licensed rental intelligence
- Revenue-impact analysis
- Personalized pre-consultation design preparation

---

## 26. V1 acceptance criteria

The implementation is ready for V1 when all of the following are true:

1. Visitors can switch between Rental and Personal modes without a page reload.
2. The switch changes hero copy, imagery, benefits, goals, section order, case-study content, and CTAs.
3. The visitor’s audience selection persists into the Quote Studio and saved lead.
4. Each primary outcome starts the shared Quote Studio with the correct goal and internal service route.
5. “Help me choose” recommends a route without creating a separate application.
6. The Quote Studio supports all five paid service rule sets.
7. Customers can enter and confirm property facts.
8. Customers can upload relevant images and documents securely.
9. The system generates an exact preliminary estimate with line items, assumptions, exclusions, expiration, and rule version.
10. The required nonbinding-estimate acknowledgment is stored server-side.
11. Meghan’s consultation calendar is unavailable before acknowledgment.
12. Acknowledged customers can email, reopen, and schedule from their quote.
13. Internal users receive a complete lead record and notification.
14. The page and Quote Studio work on current desktop and mobile browsers.
15. Keyboard navigation, focus states, labels, errors, and contrast meet accessibility requirements.
16. Analytics measure the entire funnel from audience selection through consultation scheduling.
17. Marketing content and case studies are editable through the selected CMS.
18. Pricing rules are separated from marketing content and versioned.
19. No workflow depends on unauthorized scraping.
20. Real project imagery replaces conceptual placeholders before public launch wherever required assets exist.

---

## 27. Decisions Ray or Meghan still need to approve

These do not block the page shell, but they should be resolved before launch:

1. Final Utopia Design wordmark and relationship line to Utopia Homes
2. Final Meghan biography and first-person statement
3. Which projects represent Rental and Personal modes
4. Whether a second-home customer defaults to Rental or Personal based on intended use
5. Final deliverables and revision limits for each paid service
6. Final pricing formulas, minimum project fees, travel rules, and rush charges
7. Exact expiration period for preliminary estimates
8. Consultation scheduler and calendar ownership
9. Approved property-data provider for V1.5
10. Upload retention and deletion policy
11. Whether personal homeowners may select Rental, Elegant, and Utopian furnishing grades or receive different customer-facing grade names
12. Geographic service area and when on-site work becomes available

---

## 28. Final implementation principle

The public page should feel emotional, visual, and human. The Quote Studio should feel structured, intelligent, and transparent. The operational system behind both should be consistent, versioned, and maintainable.

Utopia Design is not selling a calculator. It is selling a transformation with enough early clarity that serious customers can confidently take the next step.
