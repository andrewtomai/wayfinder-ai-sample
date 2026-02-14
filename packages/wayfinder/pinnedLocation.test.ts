/**
 * getPinnedLocation() Tests
 *
 * Tests for the pinned location reader covering all scenarios:
 * all vars set, partial vars, no vars, invalid numbers, missing floorId.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to re-import getPinnedLocation after each env change,
// so we use dynamic imports with module reset.
describe("getPinnedLocation", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("should return PinnedLocation when all env vars are set", async () => {
    vi.stubEnv("VITE_PINNED_LATITUDE", "40.7128");
    vi.stubEnv("VITE_PINNED_LONGITUDE", "-74.0060");
    vi.stubEnv("VITE_PINNED_FLOOR_ID", "floor-1");
    vi.stubEnv("VITE_PINNED_TITLE", "Main Entrance");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).not.toBeNull();
    expect(result).toEqual({
      lat: 40.7128,
      lng: -74.006,
      floorId: "floor-1",
      pinTitle: "Main Entrance",
    });
  });

  it("should default pinTitle to 'You Are Here' when VITE_PINNED_TITLE is missing", async () => {
    vi.stubEnv("VITE_PINNED_LATITUDE", "40.7128");
    vi.stubEnv("VITE_PINNED_LONGITUDE", "-74.0060");
    vi.stubEnv("VITE_PINNED_FLOOR_ID", "floor-1");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).not.toBeNull();
    expect(result!.pinTitle).toBe("You Are Here");
  });

  it("should return null when no env vars are set", async () => {
    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).toBeNull();
  });

  it("should return null when latitude is missing", async () => {
    vi.stubEnv("VITE_PINNED_LONGITUDE", "-74.0060");
    vi.stubEnv("VITE_PINNED_FLOOR_ID", "floor-1");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).toBeNull();
  });

  it("should return null when longitude is missing", async () => {
    vi.stubEnv("VITE_PINNED_LATITUDE", "40.7128");
    vi.stubEnv("VITE_PINNED_FLOOR_ID", "floor-1");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).toBeNull();
  });

  it("should return null when floorId is missing", async () => {
    vi.stubEnv("VITE_PINNED_LATITUDE", "40.7128");
    vi.stubEnv("VITE_PINNED_LONGITUDE", "-74.0060");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).toBeNull();
  });

  it("should return null when latitude is not a valid number", async () => {
    vi.stubEnv("VITE_PINNED_LATITUDE", "not-a-number");
    vi.stubEnv("VITE_PINNED_LONGITUDE", "-74.0060");
    vi.stubEnv("VITE_PINNED_FLOOR_ID", "floor-1");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).toBeNull();
  });

  it("should return null when longitude is not a valid number", async () => {
    vi.stubEnv("VITE_PINNED_LATITUDE", "40.7128");
    vi.stubEnv("VITE_PINNED_LONGITUDE", "abc");
    vi.stubEnv("VITE_PINNED_FLOOR_ID", "floor-1");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).toBeNull();
  });

  it("should handle negative coordinates correctly", async () => {
    vi.stubEnv("VITE_PINNED_LATITUDE", "-33.8688");
    vi.stubEnv("VITE_PINNED_LONGITUDE", "151.2093");
    vi.stubEnv("VITE_PINNED_FLOOR_ID", "level-2");
    vi.stubEnv("VITE_PINNED_TITLE", "South Wing");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).toEqual({
      lat: -33.8688,
      lng: 151.2093,
      floorId: "level-2",
      pinTitle: "South Wing",
    });
  });

  it("should handle zero coordinates", async () => {
    vi.stubEnv("VITE_PINNED_LATITUDE", "0");
    vi.stubEnv("VITE_PINNED_LONGITUDE", "0");
    vi.stubEnv("VITE_PINNED_FLOOR_ID", "ground");

    const { getPinnedLocation } = await import("./pinnedLocation");
    const result = getPinnedLocation();

    expect(result).not.toBeNull();
    expect(result!.lat).toBe(0);
    expect(result!.lng).toBe(0);
  });
});
