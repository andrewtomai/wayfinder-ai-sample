import { describe, it, expect, beforeEach } from "vitest";
import { SearchEngine } from "./SearchEngine.js";
import type { Static } from "typebox";
import type { POI } from "../types/poi.js";

describe("SearchEngine", () => {
  let searchEngine: SearchEngine;
  let mockPOIs: Static<typeof POI>[];

  beforeEach(() => {
    // Create mock POI data for testing
    mockPOIs = [
      {
        poiId: "1",
        name: "Starbucks Coffee",
        category: "eat.coffee",
        description: "Premium coffee shop serving espresso drinks",
        isAfterSecurity: true,
        isNavigable: true,
        keywords: [
          { isDisplayed: true, isUserSearchable: true, name: "coffee" },
          { isDisplayed: true, isUserSearchable: true, name: "espresso" },
          { isDisplayed: false, isUserSearchable: true, name: "starbucks" },
        ],
        images: [],
        position: {
          floorId: "terminal-a-floor-2",
          latitude: 32.8968,
          longitude: -97.0381,
          structureName: "Terminal A",
          buildingId: "terminal-a",
          floorName: "Level 2",
          floorOrdinal: 2,
        },
        zoomRadius: "10",
      },
      {
        poiId: "2",
        name: "Einstein Bros. Bagels",
        category: "eat",
        description: "Bagels and breakfast items",
        isAfterSecurity: true,
        isNavigable: true,
        keywords: [
          { isDisplayed: true, isUserSearchable: true, name: "bagels" },
          { isDisplayed: true, isUserSearchable: true, name: "breakfast" },
          { isDisplayed: true, isUserSearchable: true, name: "coffee" },
        ],
        images: [],
        position: {
          floorId: "terminal-a-floor-2",
          latitude: 32.897,
          longitude: -97.0382,
          structureName: "Terminal A",
          buildingId: "terminal-a",
          floorName: "Level 2",
          floorOrdinal: 2,
        },
        zoomRadius: "10",
      },
      {
        poiId: "3",
        name: "Gate A13",
        category: "gate",
        isAfterSecurity: true,
        isNavigable: true,
        keywords: [
          { isDisplayed: true, isUserSearchable: true, name: "gate" },
          { isDisplayed: true, isUserSearchable: true, name: "A13" },
        ],
        images: [],
        position: {
          floorId: "terminal-a-floor-2",
          latitude: 32.8965,
          longitude: -97.037,
          structureName: "Terminal A",
          buildingId: "terminal-a",
          floorName: "Level 2",
          floorOrdinal: 2,
        },
        zoomRadius: "5",
      },
      {
        poiId: "4",
        name: "Restroom",
        category: "restroom.male",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [
          { isDisplayed: true, isUserSearchable: true, name: "restroom" },
          { isDisplayed: true, isUserSearchable: true, name: "bathroom" },
        ],
        images: [],
        position: {
          floorId: "terminal-b-floor-1",
          latitude: 32.9,
          longitude: -97.04,
          structureName: "Terminal B",
          buildingId: "terminal-b",
          floorName: "Level 1",
          floorOrdinal: 1,
        },
        zoomRadius: "3",
      },
      {
        poiId: "5",
        name: "Security Checkpoint",
        category: "security.checkpoint",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [
          { isDisplayed: true, isUserSearchable: true, name: "security" },
          { isDisplayed: true, isUserSearchable: true, name: "checkpoint" },
          { isDisplayed: true, isUserSearchable: true, name: "tsa" },
        ],
        images: [],
        position: {
          floorId: "terminal-a-floor-1",
          latitude: 32.896,
          longitude: -97.0375,
          structureName: "Terminal A",
          buildingId: "terminal-a",
          floorName: "Level 1",
          floorOrdinal: 1,
        },
        zoomRadius: "8",
      },
      {
        poiId: "6",
        name: "Peet's Coffee",
        category: "eat.coffee",
        description: "Artisan coffee and tea",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [
          { isDisplayed: true, isUserSearchable: true, name: "coffee" },
          { isDisplayed: true, isUserSearchable: true, name: "tea" },
          { isDisplayed: false, isUserSearchable: true, name: "peets" },
        ],
        images: [],
        position: {
          floorId: "terminal-b-floor-2",
          latitude: 32.901,
          longitude: -97.041,
          structureName: "Terminal B",
          buildingId: "terminal-b",
          floorName: "Level 2",
          floorOrdinal: 2,
        },
        zoomRadius: "10",
      },
    ];

    searchEngine = new SearchEngine(mockPOIs);
  });

  describe("Constructor", () => {
    it("should initialize with POI data", () => {
      expect(searchEngine).toBeDefined();
    });

    it("should handle empty POI array", () => {
      const emptyEngine = new SearchEngine([]);
      const results = emptyEngine.search({});
      expect(results).toEqual([]);
    });
  });

  describe("Simplified Results", () => {
    it("should return only poiId, name, score, and distance fields", () => {
      const results = searchEngine.search({ term: "Starbucks" });
      expect(results.length).toBe(1);
      const result = results[0]!;

      // Should have these fields
      expect(result.poiId).toBe("1");
      expect(result.name).toBe("Starbucks Coffee");
      expect(result.score).toBeDefined();

      // Should NOT have full POI data
      expect((result as Record<string, unknown>).category).toBeUndefined();
      expect((result as Record<string, unknown>).position).toBeUndefined();
      expect((result as Record<string, unknown>).item).toBeUndefined();
    });

    it("should include distance when using proximity search", () => {
      const results = searchEngine.search({
        near: {
          poiId: "1",
          radius: 200,
        },
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.distance).toBeDefined();
      expect(typeof results[0]?.distance).toBe("number");
    });

    it("should not include distance when not using proximity search", () => {
      const results = searchEngine.search({ term: "coffee" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.distance).toBeUndefined();
    });
  });

  describe("Text Search", () => {
    it("should find POI by exact name match", () => {
      const results = searchEngine.search({ term: "Starbucks" });
      expect(results.length).toBe(1);
      expect(results[0]?.name).toBe("Starbucks Coffee");
    });

    it("should find POI by partial name match", () => {
      const results = searchEngine.search({ term: "Star" });
      expect(results.length).toBe(2);
      const [starbucks, restroom] = results;
      expect(starbucks?.name).toContain("Starbucks");
      expect(restroom?.name).toContain("Restroom");
    });

    it("should find POI by keyword", () => {
      const results = searchEngine.search({ term: "coffee" });
      const [first, second, third] = results;
      expect(first?.name).toContain("Peet");
      expect(second?.name).toContain("Starbucks");
      expect(third?.name).toContain("Einstein");
    });

    it("should find POI by description", () => {
      const results = searchEngine.search({ term: "espresso" });
      expect(results.length).toEqual(1);
      expect(results[0]?.name).toBe("Starbucks Coffee");
    });

    it("should handle case-insensitive search", () => {
      const results = searchEngine.search({ term: "STARBUCKS" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.name).toBe("Starbucks Coffee");
    });

     it("should return POIs when no term provided (limited to 10)", () => {
       const results = searchEngine.search({});
       expect(results.length).toBe(mockPOIs.length);
     });

    it("should return empty array for non-matching term", () => {
      const results = searchEngine.search({ term: "nonexistentplace12345" });
      expect(results).toEqual([]);
    });

    it("should include score in results when term is provided", () => {
      const results = searchEngine.search({ term: "coffee" });
      expect(results[0]?.score).toBeDefined();
      expect(typeof results[0]?.score).toBe("number");
    });

    it("should handle special characters in search term", () => {
      const results = searchEngine.search({ term: "Peet's" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.name).toBe("Peet's Coffee");
    });
  });

  describe("Building Filtering", () => {
     it("should filter by buildingId (limited to 10)", () => {
       const results = searchEngine.search({
         buildingId: "terminal-a",
       });
       expect(results.length).toBe(4);
       // Verify by checking the poiIds match terminal-a POIs
       const poiIds = results.map((r) => r.poiId);
       expect(poiIds).toContain("1"); // Starbucks
       expect(poiIds).toContain("2"); // Einstein
       expect(poiIds).toContain("3"); // Gate A13
       expect(poiIds).toContain("5"); // Security
     });

     it("should handle case-insensitive building filter", () => {
       const results = searchEngine.search({
         buildingId: "TERMINAL-A",
       });
       expect(results.length).toBe(4);
     });
  });

  describe("Floor Filtering", () => {
    it("should filter by floorId", () => {
      const results = searchEngine.search({ floorId: "terminal-a-floor-2" });
      expect(results.length).toBe(3);
      const poiIds = results.map((r) => r.poiId);
      expect(poiIds).toContain("1");
      expect(poiIds).toContain("2");
      expect(poiIds).toContain("3");
    });

    it("should combine floor and building filters", () => {
      const results = searchEngine.search({
        buildingId: "terminal-a",
        floorId: "terminal-a-floor-2",
      });
      expect(results.length).toBe(3);
    });

    it("should return empty array for non-existent floor", () => {
      const results = searchEngine.search({ floorId: "nonexistent-floor" });
      expect(results).toEqual([]);
    });
  });

  describe("Security Filtering", () => {
    it("should filter POIs after security", () => {
      const results = searchEngine.search({ isAfterSecurity: true });
      // POIs 1, 2, 3 are after security
      expect(results.length).toBe(3);
      const poiIds = results.map((r) => r.poiId);
      expect(poiIds).toContain("1");
      expect(poiIds).toContain("2");
      expect(poiIds).toContain("3");
    });

    it("should filter POIs before security", () => {
      const results = searchEngine.search({ isAfterSecurity: false });
      // POIs 4, 5, 6 are before security
      expect(results.length).toBe(3);
      const poiIds = results.map((r) => r.poiId);
      expect(poiIds).toContain("4");
      expect(poiIds).toContain("5");
      expect(poiIds).toContain("6");
    });

     it("should return POIs when isAfterSecurity is not specified (limited to 10)", () => {
       const results = searchEngine.search({});
       expect(results.length).toBe(mockPOIs.length);
     });

    it("should combine security filter with other filters", () => {
      const results = searchEngine.search({
        isAfterSecurity: true,
        buildingId: "terminal-a",
      });
      expect(results.length).toBe(3);
      const poiIds = results.map((r) => r.poiId);
      expect(poiIds).toContain("1");
      expect(poiIds).toContain("2");
      expect(poiIds).toContain("3");
    });
  });

  describe("Proximity Filtering", () => {
    describe("Near POI", () => {
       it("should filter by proximity to another POI", () => {
         const results = searchEngine.search({
           near: {
             poiId: "1", // Starbucks
             radius: 200,
           },
         });
         expect(results.length).toBe(4);
       });

      it("should use default radius when not specified", () => {
        const results = searchEngine.search({
          near: {
            poiId: "1",
          },
        });
        expect(results.length).toBe(2);
      });

      it("should handle invalid POI ID gracefully", () => {
        const results = searchEngine.search({
          near: {
            poiId: "nonexistent",
            radius: 100,
          },
        });
        expect(results).toEqual([]);
      });

      it("should include distance in results", () => {
        const results = searchEngine.search({
          near: {
            poiId: "1",
            radius: 200,
          },
        });
        expect(results.length).toBeGreaterThan(0);
        results.forEach((r) => {
          expect(r.distance).toBeDefined();
          expect(typeof r.distance).toBe("number");
        });
      });

      it("should sort results by distance", () => {
        const results = searchEngine.search({
          near: {
            poiId: "1",
            radius: 500,
          },
        });
        for (let i = 1; i < results.length; i++) {
          expect(results[i]!.distance).toBeGreaterThanOrEqual(
            results[i - 1]!.distance!,
          );
        }
      });
    });

    describe("Near Point", () => {
       it("should filter by proximity to coordinates", () => {
         const results = searchEngine.search({
           near: {
             point: {
               lat: 32.8968,
               lng: -97.0381,
             },
             radius: 200,
           },
         });
         expect(results.length).toBe(4);
       });

      it("should combine proximity with other filters", () => {
        const results = searchEngine.search({
          near: {
            point: {
              lat: 32.8968,
              lng: -97.0381,
            },
            radius: 200,
          },
          buildingId: "terminal-a",
        });
        // All results should be in terminal-a
        const poiIds = results.map((r) => r.poiId);
        // Only terminal-a POIs: 1, 2, 3, 5
        poiIds.forEach((id) => {
          expect(["1", "2", "3", "5"]).toContain(id);
        });
      });

       it("should handle large radius values", () => {
         const results = searchEngine.search({
           near: {
             point: {
               lat: 32.8968,
               lng: -97.0381,
             },
             radius: 10000,
           },
         });
         expect(results.length).toBe(mockPOIs.length);
       });

      it("should handle small radius values", () => {
        const results = searchEngine.search({
          near: {
            point: {
              lat: 32.8968,
              lng: -97.0381,
            },
            radius: 1,
          },
        });
        expect(results.length).toBe(1);
      });
    });
  });

  describe("Default Limit Behavior", () => {
    it("should limit results to default of 10", () => {
      const results = searchEngine.search({});
      expect(results.length).toBeLessThanOrEqual(10);
      expect(results.length).toBe(mockPOIs.length);
    });

    it("should apply limit to all search results", () => {
      const results = searchEngine.search({ term: "coffee" });
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it("should return fewer results if fewer POIs match after filtering", () => {
      const results = searchEngine.search({
        buildingId: "terminal-a",
        floorId: "terminal-a-floor-2",
      });
      expect(results.length).toBe(3);
    });
  });

  describe("Complex Queries", () => {
     it("should handle multiple filters together", () => {
       const results = searchEngine.search({
         term: "coffee",
         buildingId: "terminal-a",
         isAfterSecurity: true,
       });
       expect(results.length).toBeGreaterThan(0);
       // Verify results are from terminal-a and after security
       // POIs matching: Starbucks (1), Einstein (2)
       const poiIds = results.map((r) => r.poiId);
       poiIds.forEach((id) => {
         expect(["1", "2"]).toContain(id);
       });
     });

     it("should handle all filters including proximity", () => {
       const results = searchEngine.search({
         term: "coffee",
         buildingId: "terminal-a",
         isAfterSecurity: true,
         near: {
           poiId: "3", // Gate A13
           radius: 500,
         },
       });
       // Results should have distance
       results.forEach((r) => {
         expect(r.distance).toBeDefined();
       });
     });

    it("should return empty results when no matches found", () => {
      const results = searchEngine.search({
        term: "nonexistent",
        buildingId: "nonexistent-building",
      });
      expect(results).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle POIs with missing optional fields", () => {
      const minimalPOI: Static<typeof POI> = {
        poiId: "999",
        name: "Minimal POI",
        category: "test",
        isAfterSecurity: true,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "test-floor",
          latitude: 32.8968,
          longitude: -97.0381,
          structureName: "Test",
          buildingId: "test-building",
          floorName: "Level 1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
      };

      const engine = new SearchEngine([minimalPOI]);
      const results = engine.search({});
      expect(results.length).toBe(1);
      expect(results[0]?.poiId).toBe("999");
      expect(results[0]?.name).toBe("Minimal POI");
    });

     it("should handle empty string search term", () => {
       const results = searchEngine.search({ term: "" });
       expect(results.length).toBe(mockPOIs.length);
     });

    it("should handle very long search terms", () => {
      const longTerm = "a".repeat(1000);
      const results = searchEngine.search({ term: longTerm });
      expect(results).toHaveLength(0);
    });

    it("should handle negative radius values", () => {
      const results = searchEngine.search({
        near: {
          poiId: "1",
          radius: -100,
        },
      });
      // Should return empty or no results within negative radius
      expect(results).toHaveLength(0);
    });
  });

  describe("Input Validation", () => {
     it("should validate search options schema", () => {
       // Valid options should not throw
       expect(() => {
         searchEngine.search({
           term: "test",
         });
       }).not.toThrow();
     });

     it("should return results limited to default of 10", () => {
       const results = searchEngine.search({});
       expect(results.length).toBeLessThanOrEqual(10);
     });
  });
});
