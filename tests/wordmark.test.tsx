import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Wordmark } from "@/components/Wordmark";

describe("Wordmark", () => {
  it("uses the Homes division by default", () => {
    const markup = renderToStaticMarkup(<Wordmark />);
    expect(markup).toContain('aria-label="Utopia Homes"');
    expect(markup).toContain("wordmark-homes");
    expect(markup).toContain("utopia-homes-logo.png");
  });

  it("builds the Interiors wordmark from the same geometry", () => {
    const markup = renderToStaticMarkup(<Wordmark division="Interiors" />);
    expect(markup).toContain('aria-label="Utopia Interiors"');
    expect(markup).toContain("wordmark-interiors");
    expect(markup).toContain("nteriors");
  });
});
