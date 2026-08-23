export function getBookingHost(bookingUrl: string) {
  return new URL(bookingUrl).host;
}

export function appendAttribution(bookingUrl: string, search = "") {
  const target = new URL(bookingUrl);
  const source = new URLSearchParams(search);
  for (const [key, value] of source) {
    if (key.startsWith("utm_") && !target.searchParams.has(key)) target.searchParams.set(key, value);
  }
  return target.toString();
}
