import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LucyWidget } from "@/components/lucy/LucyWidget";
import { publicLucyContent } from "@/content";

vi.mock("next/navigation", () => ({ usePathname: () => "/design" }));

describe("LucyWidget", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens accessibly and renders an approved public answer", async () => {
    const user = userEvent.setup();
    const mockedFetch = vi.fn().mockResolvedValue(
      Response.json({
        ok: true,
        outcome: "answered",
        answer: "Utopia Design helps homes feel considered.",
        sources: [{ id: "design", label: "Utopia Design", href: "/design" }],
        links: [],
      }),
    );
    vi.stubGlobal("fetch", mockedFetch);
    render(<LucyWidget intro={publicLucyContent.intro} suggestions={publicLucyContent.suggestions} />);

    await user.click(screen.getByRole("button", { name: "Ask Lucy" }));
    expect(screen.getByRole("dialog", { name: "Ask Lucy" })).toBeVisible();
    expect(screen.getByText(/Approved public information only.*isn’t saved/u)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "What is Utopia Design?" }));
    expect(await screen.findByText("Utopia Design helps homes feel considered.")).toBeVisible();
    expect(fetch).toHaveBeenCalledWith(
      "/api/lucy",
      expect.objectContaining({
        body: JSON.stringify({
          question: "What is Utopia Design?",
          page_context: { route: "design" },
          history: [],
        }),
      }),
    );
    expect(screen.getByRole("link", { name: "Utopia Design" })).toHaveAttribute("href", "/design");
    expect(screen.getByRole("button", { name: "Start over" })).toBeVisible();

    await user.type(screen.getByLabelText("Ask Lucy a question"), "How does it work?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    const secondBody = JSON.parse(String(mockedFetch.mock.calls[1][1].body));
    expect(secondBody.history).toEqual([
      { role: "visitor", content: "What is Utopia Design?" },
      { role: "lucy", content: "Utopia Design helps homes feel considered." },
    ]);

    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.queryByText("Utopia Design helps homes feel considered.")).not.toBeInTheDocument();
  });

  it("expires browser-memory history after thirty minutes", async () => {
    const user = userEvent.setup();
    let observedAt = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => observedAt);
    const mockedFetch = vi.fn().mockResolvedValue(
      Response.json({
        ok: true,
        outcome: "answered",
        answer: "Approved answer.",
        sources: [],
        links: [],
      }),
    );
    vi.stubGlobal("fetch", mockedFetch);
    render(<LucyWidget intro={publicLucyContent.intro} suggestions={publicLucyContent.suggestions} />);

    await user.click(screen.getByRole("button", { name: "Ask Lucy" }));
    await user.type(screen.getByLabelText("Ask Lucy a question"), "First question");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Approved answer.");
    await user.click(screen.getByRole("button", { name: "Close Lucy" }));

    observedAt += 30 * 60 * 1_000 + 1;
    await user.click(screen.getByRole("button", { name: "Ask Lucy" }));
    await user.type(screen.getByLabelText("Ask Lucy a question"), "Second question");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const secondBody = JSON.parse(String(mockedFetch.mock.calls[1][1].body));
    expect(secondBody.history).toEqual([]);
  });
  it("renders no Sources or Useful links container when both are empty, and renders them when populated", async () => {
    const user = userEvent.setup();
    const mockedFetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          outcome: "fallback",
          answer: "No approved information is available for that yet.",
          sources: [],
          links: [],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          outcome: "answered",
          answer: "Buttercup Beauty sleeps up to fourteen guests.",
          sources: [{ id: "buttercup", label: "Buttercup Beauty", href: "/stays/buttercup-beauty" }],
          links: [{ id: "contact", label: "Contact Utopia Homes", href: "/contact" }],
        }),
      );
    vi.stubGlobal("fetch", mockedFetch);
    render(<LucyWidget intro={publicLucyContent.intro} suggestions={publicLucyContent.suggestions} />);

    await user.click(screen.getByRole("button", { name: "Ask Lucy" }));
    await user.type(screen.getByLabelText("Ask Lucy a question"), "Where is a good spot to get coffee?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("No approved information is available for that yet.");
    expect(screen.queryByLabelText("Sources")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Useful links")).not.toBeInTheDocument();
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Ask Lucy a question"), "How many guests does Buttercup sleep?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Buttercup Beauty sleeps up to fourteen guests.");
    expect(screen.getByLabelText("Sources")).toBeVisible();
    expect(screen.getByRole("link", { name: "Buttercup Beauty" })).toHaveAttribute(
      "href",
      "/stays/buttercup-beauty",
    );
    expect(screen.getByLabelText("Useful links")).toBeVisible();
    expect(screen.getByRole("link", { name: /Contact Utopia Homes/u })).toHaveAttribute("href", "/contact");
  });
});
