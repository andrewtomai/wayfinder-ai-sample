/**
 * Prompts Tests
 *
 * Tests for the buildSystemInstruction function which provides
 * iteration-aware system instructions for the AI agent.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock getPinnedLocation before importing prompts
vi.mock("@core/wayfinder", () => ({
  getPinnedLocation: vi.fn(() => ({
    lat: 40.7128,
    lng: -74.006,
    floorId: "floor-1",
    pinTitle: "Gate B12 Kiosk",
  })),
}));

import { buildSystemInstruction } from "./prompts";

describe("buildSystemInstruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include dynamic system instruction warnings on iterations 8-9", () => {
    /**
     * This test verifies that buildSystemInstruction() is called with correct iteration numbers
     * and includes warnings when iterations are 8 or 9.
     */

    // Iteration 8 should have warning
    const instruction8 = buildSystemInstruction(8);
    expect(instruction8).toContain("2 iteration");
    expect(instruction8.toLowerCase()).toContain("prioritize");

    // Iteration 9 should have warning
    const instruction9 = buildSystemInstruction(9);
    expect(instruction9).toContain("1 iteration");
    expect(instruction9.toLowerCase()).toContain("prioritize");

    // Iteration 10 should have explicit "no iterations left"
    const instruction10 = buildSystemInstruction(10);
    expect(instruction10).toContain("no iterations left");

    // Iteration 7 should NOT have warning
    const instruction7 = buildSystemInstruction(7);
    expect(instruction7).not.toContain("prioritize");
    expect(instruction7).not.toContain("iteration(s) remaining");
  });

  it("should include base system instruction on all iterations", () => {
    const instruction1 = buildSystemInstruction(1);
    expect(instruction1).toContain("Airport Assistant");

    const instruction10 = buildSystemInstruction(10);
    expect(instruction10).toContain("Airport Assistant");
  });

  it("should include tools instructions on non-final iterations", () => {
    const instruction1 = buildSystemInstruction(1);
    expect(instruction1).toContain("Tools:");
    expect(instruction1).toContain("search");
    expect(instruction1).toContain("showDirections");
  });

  it("should NOT include tools instructions on final iteration", () => {
    const instruction10 = buildSystemInstruction(10);
    expect(instruction10).not.toContain("Tools:");
  });

  it("should include operational protocols for early iterations", () => {
    const instruction1 = buildSystemInstruction(1);
    expect(instruction1).toContain("Search First");
    expect(instruction1).toContain("Operational Protocols");
  });

  it("should include location context when pinned location is set", () => {
    const instruction = buildSystemInstruction(1);
    expect(instruction).toContain("Gate B12 Kiosk");
    expect(instruction).toContain("floor-1");
    expect(instruction).toContain("Location Awareness");
  });

  it("should include location context on all iteration types", () => {
    // Early iteration
    const instruction1 = buildSystemInstruction(1);
    expect(instruction1).toContain("Location Awareness");

    // Warning iteration
    const instruction8 = buildSystemInstruction(8);
    expect(instruction8).toContain("Location Awareness");

    // Final iteration
    const instruction10 = buildSystemInstruction(10);
    expect(instruction10).toContain("Location Awareness");
  });

  it("should include searchNearby in tools instructions", () => {
    const instruction = buildSystemInstruction(1);
    expect(instruction).toContain("searchNearby");
  });

  it("should mention searchNearby in location context", () => {
    const instruction = buildSystemInstruction(1);
    expect(instruction).toContain("searchNearby");
    expect(instruction).toContain("nearby");
  });

  it("should mention that directions start from kiosk in base instruction", () => {
    const instruction = buildSystemInstruction(1);
    expect(instruction).toContain("current location");
  });
});

describe("buildSystemInstruction without pinned location", () => {
  beforeEach(async () => {
    const wayfinder = await import("@core/wayfinder");
    vi.mocked(wayfinder.getPinnedLocation).mockReturnValue(null);
  });

  it("should not include location context when pinned location is null", () => {
    const instruction = buildSystemInstruction(1);
    expect(instruction).not.toContain("Location Awareness");
  });

  it("should still include base instruction and tools", () => {
    const instruction = buildSystemInstruction(1);
    expect(instruction).toContain("Airport Assistant");
    expect(instruction).toContain("Tools:");
  });
});
