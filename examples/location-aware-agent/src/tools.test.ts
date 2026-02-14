/**
 * Agent Tools Tests
 *
 * Tests for tool handlers that execute locusmaps-sdk operations.
 * Verifies that tools correctly invoke SDK methods and handle errors.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { search, showDirections, searchNearby } from "./tools";
import type { Static } from "typebox";
import { SearchOptions } from "@core/wayfinder";

// Mock the map instance
vi.mock("@core/wayfinder", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@core/wayfinder")>();
  return {
    ...actual,
    default: vi.fn(),
    getPinnedLocation: vi.fn(() => ({
      lat: 40.7128,
      lng: -74.006,
      floorId: "floor-1",
      pinTitle: "Main Entrance",
    })),
  };
});

// Mock the shared tools module so we can test the imports
vi.mock("@core/agent-tools", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@core/agent-tools")>();
  return actual;
});

describe("Agent Tools", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMapInstance: any;

  beforeEach(async () => {
    // Create a mock map instance with all required methods
    mockMapInstance = {
      search: vi.fn(),
      getPOIDetails: vi.fn(),
      getStructures: vi.fn(),
      getCategories: vi.fn(),
      showPOI: vi.fn(),
      showDirections: vi.fn(),
      getSecurityWaitTimes: vi.fn(),
    };

    // Mock getMapInstance to return our mock
    const wayfinder = await import("@core/wayfinder");
    vi.mocked(wayfinder.default).mockResolvedValue(mockMapInstance);
  });

  describe("Search Tool", () => {
    it("should have correct name and description", () => {
      expect(search.name).toBe("search");
      expect(search.description).toBeDefined();
      expect(search.description.length).toBeGreaterThan(0);
    });

    it("should have parametersJsonSchema", () => {
      expect(search.parametersJsonSchema).toBeDefined();
    });

    it("should have responseJsonSchema", () => {
      expect(search.responseJsonSchema).toBeDefined();
    });

    it("should call map.search with search options", async () => {
      const mockResults = [{ poiId: "1", name: "Bathroom", score: 0.95 }];
      mockMapInstance.search.mockResolvedValue(mockResults);

      const options: Static<typeof SearchOptions> = {
        term: "bathroom",
      };

      const result = await search.action(options);

      expect(mockMapInstance.search).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockResults);
    });

    it("should pass complex search options to map", async () => {
      mockMapInstance.search.mockResolvedValue([]);

      const options: Static<typeof SearchOptions> = {
        term: "coffee",
        buildingId: "terminal-a",
        isAfterSecurity: true,
      };

      await search.action(options);

      expect(mockMapInstance.search).toHaveBeenCalledWith(options);
    });

    it("should handle search errors", async () => {
      mockMapInstance.search.mockRejectedValue(new Error("Search failed"));

      const options = { term: "test" };

      await expect(search.action(options)).rejects.toThrow("Search failed");
    });

    it("should return empty array when no results", async () => {
      mockMapInstance.search.mockResolvedValue([]);

      const result = await search.action({ term: "nonexistent" });

      expect(result).toEqual([]);
    });
  });

  describe("ShowDirections Tool", () => {
    it("should have correct name and description", () => {
      expect(showDirections.name).toBe("showDirections");
      expect(showDirections.description).toBeDefined();
    });

    it("should have parametersJsonSchema with waypoints", () => {
      expect(showDirections.parametersJsonSchema).toBeDefined();
    });

    it("should call map.showDirections with pinned origin prepended", async () => {
      const mockDirections = {
        distance: 500,
        duration: 5,
        steps: [{ instruction: "Go straight", distance: 500 }],
      };
      mockMapInstance.showDirections.mockResolvedValue(mockDirections);

      const result = await showDirections.action({ waypoints: [200] });

      expect(mockMapInstance.showDirections).toHaveBeenCalledWith([
        { lat: 40.7128, lng: -74.006, floorId: "floor-1" },
        200,
      ]);
      expect(result).toEqual(mockDirections);
    });

    it("should support multi-stop routes with pinned origin", async () => {
      mockMapInstance.showDirections.mockResolvedValue({});

      await showDirections.action({ waypoints: [100, 200, 300] });

      expect(mockMapInstance.showDirections).toHaveBeenCalledWith([
        { lat: 40.7128, lng: -74.006, floorId: "floor-1" },
        100,
        200,
        300,
      ]);
    });

    it("should return direction details", async () => {
      const directions = {
        distance: 1200,
        duration: 12,
        steps: [
          {
            instruction: "Walk towards gate",
            distance: 300,
          },
          {
            instruction: "Turn right",
            distance: 400,
          },
          {
            instruction: "Continue forward",
            distance: 500,
          },
        ],
      };
      mockMapInstance.showDirections.mockResolvedValue(directions);

      const result = (await showDirections.action({
        waypoints: [2],
      })) as Record<string, unknown>;

      expect(result).toHaveProperty("distance");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("steps");
      expect(Array.isArray(result.steps)).toBe(true);
    });

    it("should handle showDirections errors", async () => {
      mockMapInstance.showDirections.mockRejectedValue(
        new Error("Route calculation failed"),
      );

      await expect(
        showDirections.action({ waypoints: [1] }),
      ).rejects.toThrow("Route calculation failed");
    });

    it("should handle unreachable routes", async () => {
      mockMapInstance.showDirections.mockRejectedValue(
        new Error("No route found between locations"),
      );

      await expect(
        showDirections.action({ waypoints: [100] }),
      ).rejects.toThrow("No route found");
    });
  });

  describe("Tool Schema Validation", () => {
    it("all tools should have name and description", () => {
      const tools = [search, showDirections, searchNearby];

      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe("string");
        expect(tool.name.length).toBeGreaterThan(0);

        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it("all tools should have parametersJsonSchema", () => {
      const tools = [search, showDirections, searchNearby];

      tools.forEach((tool) => {
        expect(tool.parametersJsonSchema).toBeDefined();
        expect(typeof tool.parametersJsonSchema).toBe("object");
      });
    });

    it("all tools should have action function", () => {
      const tools = [search, showDirections, searchNearby];

      tools.forEach((tool) => {
        expect(tool.action).toBeDefined();
        expect(typeof tool.action).toBe("function");
      });
    });
  });

  describe("Tool Execution Error Handling", () => {
    it("should propagate SDK errors", async () => {
      const error = new Error("SDK connection error");
      mockMapInstance.search.mockRejectedValue(error);

      await expect(search.action({ term: "test" })).rejects.toThrow(
        "SDK connection error",
      );
    });

    it("should handle timeout errors", async () => {
      mockMapInstance.search.mockRejectedValue(
        new Error("Request timeout after 30s"),
      );

      await expect(search.action({})).rejects.toThrow("timeout");
    });

    it("should handle null/undefined returns gracefully", async () => {
      mockMapInstance.search.mockResolvedValue(null);

      const result = await search.action({});

      expect(result).toBeNull();
    });
  });

  describe("SearchNearby Tool", () => {
    it("should have correct name and description", () => {
      expect(searchNearby.name).toBe("searchNearby");
      expect(searchNearby.description).toBeDefined();
      expect(searchNearby.description).toContain("near");
    });

    it("should have parametersJsonSchema", () => {
      expect(searchNearby.parametersJsonSchema).toBeDefined();
    });

    it("should call map.search with auto-populated near from pinned location", async () => {
      const mockResults = [{ poiId: "5", name: "Coffee Shop", score: 0.9 }];
      mockMapInstance.search.mockResolvedValue(mockResults);

      const result = await searchNearby.action({ term: "coffee" });

      expect(mockMapInstance.search).toHaveBeenCalledWith({
        term: "coffee",
        floorId: "floor-1",
        near: {
          point: { lat: 40.7128, lng: -74.006 },
          radius: 100,
        },
      });
      expect(result).toEqual(mockResults);
    });

    it("should use custom radius when provided", async () => {
      mockMapInstance.search.mockResolvedValue([]);

      await searchNearby.action({ term: "food", radius: 250 });

      expect(mockMapInstance.search).toHaveBeenCalledWith({
        term: "food",
        floorId: "floor-1",
        near: {
          point: { lat: 40.7128, lng: -74.006 },
          radius: 250,
        },
      });
    });

    it("should default radius to 100 when not specified", async () => {
      mockMapInstance.search.mockResolvedValue([]);

      await searchNearby.action({});

      expect(mockMapInstance.search).toHaveBeenCalledWith({
        term: undefined,
        floorId: "floor-1",
        near: {
          point: { lat: 40.7128, lng: -74.006 },
          radius: 100,
        },
      });
    });

    it("should work without a search term", async () => {
      const mockResults = [{ poiId: "10", name: "Gate A1", score: 1 }];
      mockMapInstance.search.mockResolvedValue(mockResults);

      const result = await searchNearby.action({});

      expect(result).toEqual(mockResults);
    });

    it("should throw when pinned location is not configured", async () => {
      const wayfinder = await import("@core/wayfinder");
      vi.mocked(wayfinder.getPinnedLocation).mockReturnValueOnce(null);

      await expect(searchNearby.action({ term: "test" })).rejects.toThrow(
        "Pinned location is not configured",
      );
    });
  });

  describe("ShowDirections with null pinned location", () => {
    it("should throw when pinned location is not configured", async () => {
      const wayfinder = await import("@core/wayfinder");
      vi.mocked(wayfinder.getPinnedLocation).mockReturnValueOnce(null);

      await expect(
        showDirections.action({ waypoints: [100] }),
      ).rejects.toThrow("Pinned location is not configured");
    });
  });
});
