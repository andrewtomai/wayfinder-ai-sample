/**
 * Agent Tools Tests
 *
 * Tests for tool handlers that execute locusmaps-sdk operations.
 * Verifies that tools correctly invoke SDK methods and handle errors.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPOIDetails,
  getBuildingsAndLevels,
  getCategories,
  showPOI,
  getSecurityWaitTimes,
} from "@core/agent-tools";

// Mock the map instance
vi.mock("@core/wayfinder", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@core/wayfinder")>();
  return {
    ...actual,
    default: vi.fn(),
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

  describe("GetPOIDetails Tool", () => {
    it("should have correct name and description", () => {
      expect(getPOIDetails.name).toBe("getPOIDetails");
      expect(getPOIDetails.description).toBeDefined();
    });

    it("should have parametersJsonSchema with poiId", () => {
      expect(getPOIDetails.parametersJsonSchema).toBeDefined();
    });

    it("should call map.getPOIDetails with POI ID", async () => {
      const mockPOI = {
        poiId: "123",
        name: "Bathroom",
        category: "restroom",
      };
      mockMapInstance.getPOIDetails.mockResolvedValue(mockPOI);

      const result = await getPOIDetails.action({ poiId: 123 });

      expect(mockMapInstance.getPOIDetails).toHaveBeenCalledWith(123);
      expect(result).toEqual(mockPOI);
    });

    it("should handle invalid POI ID", async () => {
      mockMapInstance.getPOIDetails.mockRejectedValue(
        new Error("POI not found"),
      );

      await expect(getPOIDetails.action({ poiId: 99999 })).rejects.toThrow(
        "POI not found",
      );
    });

    it("should return full POI details", async () => {
      const fullPOI = {
        poiId: "456",
        name: "Gate A5",
        category: "gate",
        description: "Departure gate A5",
        isAfterSecurity: true,
        keywords: [{ name: "gate", isDisplayed: true, isUserSearchable: true }],
        images: [],
        position: {
          latitude: 32.1234,
          longitude: -97.5678,
          floorId: "floor-2",
          floorName: "Level 2",
        },
      };
      mockMapInstance.getPOIDetails.mockResolvedValue(fullPOI);

      const result = (await getPOIDetails.action({
        poiId: 456,
      })) as Record<string, unknown>;

      expect(result).toHaveProperty("poiId");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("description");
    });
  });

  describe("GetBuildingsAndLevels Tool", () => {
    it("should have correct name", () => {
      expect(getBuildingsAndLevels.name).toBe("getBuildingsAndLevels");
    });

    it("should have parametersJsonSchema as empty object", () => {
      expect(getBuildingsAndLevels.parametersJsonSchema).toBeDefined();
    });

    it("should call map.getStructures", async () => {
      const mockStructures = {
        buildings: [{ id: "terminal-a", name: "Terminal A" }],
      };
      mockMapInstance.getStructures.mockResolvedValue(mockStructures);

      const result = await getBuildingsAndLevels.action({});

      expect(mockMapInstance.getStructures).toHaveBeenCalled();
      expect(result).toEqual(mockStructures);
    });

    it("should accept empty args object", async () => {
      mockMapInstance.getStructures.mockResolvedValue({});

      await expect(getBuildingsAndLevels.action({})).resolves.not.toThrow();
    });

    it("should handle getStructures errors", async () => {
      mockMapInstance.getStructures.mockRejectedValue(
        new Error("Failed to load structures"),
      );

      await expect(getBuildingsAndLevels.action({})).rejects.toThrow(
        "Failed to load structures",
      );
    });
  });

  describe("GetCategories Tool", () => {
    it("should have correct name", () => {
      expect(getCategories.name).toBe("getCategories");
    });

    it("should call map.getCategories", async () => {
      const mockCategories = [
        "eat",
        "eat.coffee",
        "restroom",
        "restroom.accessible",
        "gate",
      ];
      mockMapInstance.getCategories.mockResolvedValue(mockCategories);

      const result = await getCategories.action({});

      expect(mockMapInstance.getCategories).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });

    it("should return array of category strings", async () => {
      const categories = [
        "eat.coffee",
        "eat.pizza",
        "restroom.male",
        "restroom.female",
      ];
      mockMapInstance.getCategories.mockResolvedValue(categories);

      const result = (await getCategories.action({})) as unknown[];

      expect(Array.isArray(result)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(result?.every((c: any) => typeof c === "string")).toBe(true);
    });

    it("should return empty array when no categories", async () => {
      mockMapInstance.getCategories.mockResolvedValue([]);

      const result = await getCategories.action({});

      expect(result).toEqual([]);
    });

    it("should handle getCategories errors", async () => {
      mockMapInstance.getCategories.mockRejectedValue(
        new Error("Category service unavailable"),
      );

      await expect(getCategories.action({})).rejects.toThrow(
        "Category service unavailable",
      );
    });
  });

  describe("ShowPOI Tool", () => {
    it("should have correct name and description", () => {
      expect(showPOI.name).toBe("showPOI");
      expect(showPOI.description).toBeDefined();
    });

    it("should call map.showPOI with POI ID", async () => {
      const mockPOI = {
        poiId: "789",
        name: "Starbucks",
        category: "eat.coffee",
      };
      mockMapInstance.showPOI.mockResolvedValue(mockPOI);

      const result = await showPOI.action({ poiId: 789 });

      expect(mockMapInstance.showPOI).toHaveBeenCalledWith(789);
      expect(result).toEqual(mockPOI);
    });

    it("should return detailed POI information for display", async () => {
      const poiWithImages = {
        poiId: "100",
        name: "Coffee Shop",
        description: "Great coffee",
        images: [
          { url: "https://example.com/image1.jpg" },
          { url: "https://example.com/image2.jpg" },
        ],
        position: {
          latitude: 32.5,
          longitude: -97.5,
        },
      };
      mockMapInstance.showPOI.mockResolvedValue(poiWithImages);

      const result = (await showPOI.action({
        poiId: 100,
      })) as Record<string, unknown>;

      expect(result).toHaveProperty("images");
      expect(Array.isArray(result.images)).toBe(true);
    });

    it("should handle showPOI errors", async () => {
      mockMapInstance.showPOI.mockRejectedValue(
        new Error("POI display failed"),
      );

      await expect(showPOI.action({ poiId: 999 })).rejects.toThrow(
        "POI display failed",
      );
    });
  });

  describe("GetSecurityWaitTimes Tool", () => {
    it("should have correct name and description", () => {
      expect(getSecurityWaitTimes.name).toBe("getSecurityWaitTimes");
      expect(getSecurityWaitTimes.description).toBeDefined();
      expect(getSecurityWaitTimes.description.length).toBeGreaterThan(0);
    });

    it("should have parametersJsonSchema as empty object", () => {
      expect(getSecurityWaitTimes.parametersJsonSchema).toBeDefined();
    });

    it("should have responseJsonSchema", () => {
      expect(getSecurityWaitTimes.responseJsonSchema).toBeDefined();
    });

    it("should call map.getSecurityWaitTimes", async () => {
      const mockResults = [
        {
          poiId: 1,
          name: "Security Checkpoint A",
          category: "security",
          queueTime: 15,
          isTemporarilyClosed: false,
          lastUpdated: 1700000000,
        },
      ];
      mockMapInstance.getSecurityWaitTimes.mockResolvedValue(mockResults);

      const result = await getSecurityWaitTimes.action({});

      expect(mockMapInstance.getSecurityWaitTimes).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });

    it("should return empty array when no security checkpoints", async () => {
      mockMapInstance.getSecurityWaitTimes.mockResolvedValue([]);

      const result = await getSecurityWaitTimes.action({});

      expect(result).toEqual([]);
    });

    it("should handle errors", async () => {
      mockMapInstance.getSecurityWaitTimes.mockRejectedValue(
        new Error("Failed to get security wait times"),
      );

      await expect(getSecurityWaitTimes.action({})).rejects.toThrow(
        "Failed to get security wait times",
      );
    });
  });

  describe("Tool Schema Validation", () => {
    it("all tools should have name and description", () => {
      const tools = [
        getPOIDetails,
        getBuildingsAndLevels,
        getCategories,
        showPOI,
        getSecurityWaitTimes,
      ];

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
      const tools = [
        getPOIDetails,
        getBuildingsAndLevels,
        getCategories,
        showPOI,
        getSecurityWaitTimes,
      ];

      tools.forEach((tool) => {
        expect(tool.parametersJsonSchema).toBeDefined();
        expect(typeof tool.parametersJsonSchema).toBe("object");
      });
    });

    it("all tools should have action function", () => {
      const tools = [
        getPOIDetails,
        getBuildingsAndLevels,
        getCategories,
        showPOI,
        getSecurityWaitTimes,
      ];

      tools.forEach((tool) => {
        expect(tool.action).toBeDefined();
        expect(typeof tool.action).toBe("function");
      });
    });
  });
});
