/**
 * Prompts Tests
 *
 * Tests for the buildSystemInstruction function which provides
 * iteration-aware system instructions for the AI agent.
 */

import { describe, it, expect } from "vitest";
import { buildSystemInstruction } from "./prompts";

describe("buildSystemInstruction", () => {
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
    expect(instruction7.toLowerCase()).not.toContain("iteration");
    expect(instruction7.toLowerCase()).not.toContain("prioritize");
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
});
