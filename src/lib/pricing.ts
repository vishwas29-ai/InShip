
export function calculateDeliveryPrice(distanceKm: number) {
  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0
  ) {
    throw new Error("Invalid delivery distance");
  }

  // Round up distance to the next whole kilometre
  const roundedDistance = Math.ceil(distanceKm);

  // First 400 km: Rs. 2 per km
  const first400Km = Math.min(roundedDistance, 400);
  const first400Charge = first400Km * 2;

  // Beyond 400 km: Rs. 1 per km
  const extraKm = Math.max(roundedDistance - 400, 0);
  const extraCharge = extraKm;

  // Minimum delivery charge: Rs. 50
  const totalCharge = Math.max(
    50,
    first400Charge + extraCharge
  );

  return {
    distanceKm,
    roundedDistance,
    breakdown: {
      first400Charge,
      extraCharge,
      minimumCharge: 50,
    },
    totalCharge,
    currency: "INR",
  };
}
