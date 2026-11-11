import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateRangeInputs } from "@/components/DateRangeInputs";

describe("check-in and check-out fields", () => {
  afterEach(cleanup);
  it("moves check-out with check-in without opening its picker or taking focus", () => {
    // Chrome's picker changes check-in live while you use its month arrows; opening the check-out
    // picker on that closed the calendar you were browsing (Ray, 2026-11-11).
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, "showPicker", { configurable: true, value: showPicker });
    render(<form><DateRangeInputs /></form>);
    const checkIn = screen.getByLabelText("Check-in") as HTMLInputElement;
    const checkOut = screen.getByLabelText("Check-out") as HTMLInputElement;
    checkIn.focus();

    fireEvent.change(checkIn, { target: { value: "2027-03-12" } });
    expect(checkOut.value).toBe("2027-03-14");
    expect(checkOut.min).toBe("2027-03-13");

    fireEvent.change(checkIn, { target: { value: "2027-04-12" } });
    expect(checkOut.value).toBe("2027-04-14");

    expect(showPicker).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(checkIn);
  });

  it("keeps a check-out the guest already chose when it's still after check-in", () => {
    render(<form><DateRangeInputs arrival="2027-03-12" departure="2027-03-20" /></form>);
    fireEvent.change(screen.getByLabelText("Check-in"), { target: { value: "2027-03-13" } });
    expect((screen.getByLabelText("Check-out") as HTMLInputElement).value).toBe("2027-03-20");
  });
});
