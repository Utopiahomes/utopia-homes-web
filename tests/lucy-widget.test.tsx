import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LucyWidget } from "@/components/lucy/LucyWidget";
import { publicLucyContent } from "@/content";

describe("LucyWidget", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens accessibly and renders an approved public answer", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ ok: true, answer: "Utopia Design helps homes feel considered." }),
      ),
    );
    render(<LucyWidget intro={publicLucyContent.intro} suggestions={publicLucyContent.suggestions} />);

    await user.click(screen.getByRole("button", { name: "Ask Lucy" }));
    expect(screen.getByRole("dialog", { name: "Ask Lucy" })).toBeVisible();
    expect(screen.getByText("Approved public information only. This chat isn’t saved.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "What is Utopia Design?" }));
    expect(await screen.findByText("Utopia Design helps homes feel considered.")).toBeVisible();
    expect(fetch).toHaveBeenCalledWith(
      "/api/lucy",
      expect.objectContaining({ body: JSON.stringify({ question: "What is Utopia Design?" }) }),
    );
  });
});
