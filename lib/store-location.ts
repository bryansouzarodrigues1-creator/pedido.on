/** A store address is optional. Never turn the customer's delivery address into a public map link. */
export function storeLocation(address: string, city: string) {
  const street = address.trim();
  if (!street) return null;
  const locality = city.trim();
  const parts = [street, locality].filter(Boolean);
  return {
    label: parts.join(" · "),
    mapUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(parts.join(", ")),
  };
}
