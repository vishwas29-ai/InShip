
import { describe, it, expect } from "vitest";
import { calculateDeliveryPrice } from "./pricing";

describe("InShip Delivery Pricing Tests", () => {

  it("should apply minimum charge for 10 km", () => {
    const result = calculateDeliveryPrice(10);
    expect(result.totalCharge).toBe(50);
  });

  it("should charge Rs. 50 for 25 km", () => {
    const result = calculateDeliveryPrice(25);
    expect(result.totalCharge).toBe(50);
  });

  it("should charge Rs. 200 for 100 km", () => {
    const result = calculateDeliveryPrice(100);
    expect(result.totalCharge).toBe(200);
  });

  it("should charge Rs. 800 for 400 km", () => {
    const result = calculateDeliveryPrice(400);
    expect(result.totalCharge).toBe(800);
  });

  it("should charge Rs. 850 for 450 km", () => {
    const result = calculateDeliveryPrice(450);
    expect(result.totalCharge).toBe(850);
  });

  it("should round up decimal distance", () => {
    const result = calculateDeliveryPrice(500.2);

    expect(result.roundedDistance).toBe(501);
    expect(result.totalCharge).toBe(901);
  });

  it("should reject zero distance", () => {
    expect(() => calculateDeliveryPrice(0)).toThrow(
      "Invalid delivery distance"
    );
  });

  it("should reject negative distance", () => {
    expect(() => calculateDeliveryPrice(-10)).toThrow(
      "Invalid delivery distance"
    );
  });

  it("should reject invalid numeric distance", () => {
    expect(() => calculateDeliveryPrice(NaN)).toThrow(
      "Invalid delivery distance"
    );
  });

});
