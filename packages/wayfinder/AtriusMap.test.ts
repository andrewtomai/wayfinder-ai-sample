/**
 * AtriusMap.getSecurityWaitTimes() Tests
 *
 * Tests the security wait time data retrieval logic including
 * POI filtering, dynamic data extraction, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AtriusMap } from "./index";

// Mock locusmaps-sdk
vi.mock("locusmaps-sdk", () => ({
  default: {
    newMap: vi.fn(),
  },
}));

// Mock logger to suppress output during tests
vi.mock("@core/logger", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AtriusMap.getSecurityWaitTimes", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMapInstance: any;

  beforeEach(async () => {
    // Reset singleton between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (AtriusMap as any).instance = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (AtriusMap as any).initPromise = null;

    mockMapInstance = {
      getAllPOIs: vi.fn(),
      getPOIDetails: vi.fn(),
      showPOI: vi.fn(),
      getDirectionsMultiple: vi.fn(),
      showNavigationMultiple: vi.fn(),
      getStructures: vi.fn(),
      search: vi.fn(),
      getVenueData: vi.fn(),
    };

    const sdk = await import("locusmaps-sdk");
    vi.mocked(sdk.default.newMap).mockResolvedValue(mockMapInstance);

    // Default: return empty POI list for initialization
    mockMapInstance.getAllPOIs.mockResolvedValue({});
  });

  async function getAtriusMap(): Promise<AtriusMap> {
    return AtriusMap.getInstance("#map", {
      venueId: "test-venue",
      accountId: "test-account",
    });
  }

  it("should filter POIs by category prefix 'security'", async () => {
    const pois = {
      "1": {
        poiId: "1",
        name: "Security Checkpoint A",
        category: "security",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "f1",
          latitude: 0,
          longitude: 0,
          structureName: "T1",
          buildingId: "b1",
          floorName: "L1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
        dynamicData: {
          security: {
            queueTime: 15,
            timeIsReal: true,
            isTemporarilyClosed: false,
            lastUpdated: 1700000000,
          },
        },
      },
      "2": {
        poiId: "2",
        name: "Security Checkpoint B",
        category: "security.checkpoint",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "f1",
          latitude: 0,
          longitude: 0,
          structureName: "T1",
          buildingId: "b1",
          floorName: "L1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
        dynamicData: {
          security: {
            queueTime: 25,
            timeIsReal: true,
            isTemporarilyClosed: false,
            lastUpdated: 1700000100,
          },
        },
      },
      "3": {
        poiId: "3",
        name: "Coffee Shop",
        category: "eat.coffee",
        isAfterSecurity: true,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "f1",
          latitude: 0,
          longitude: 0,
          structureName: "T1",
          buildingId: "b1",
          floorName: "L1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
      },
    };

    // First call for initialization, second for getSecurityWaitTimes
    mockMapInstance.getAllPOIs
      .mockResolvedValueOnce(pois)
      .mockResolvedValueOnce(pois);

    const map = await getAtriusMap();
    const results = await map.getSecurityWaitTimes();

    expect(results).toHaveLength(2);
    expect(results[0]?.name).toBe("Security Checkpoint A");
    expect(results[1]?.name).toBe("Security Checkpoint B");
  });

  it("should include queue fields when dynamicData.security is present and timeIsReal is true", async () => {
    const pois = {
      "1": {
        poiId: "1",
        name: "Security Checkpoint A",
        category: "security",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "f1",
          latitude: 0,
          longitude: 0,
          structureName: "T1",
          buildingId: "b1",
          floorName: "L1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
        dynamicData: {
          security: {
            queueTime: 15,
            timeIsReal: true,
            isTemporarilyClosed: false,
            lastUpdated: 1700000000,
          },
        },
      },
    };

    mockMapInstance.getAllPOIs
      .mockResolvedValueOnce(pois)
      .mockResolvedValueOnce(pois);

    const map = await getAtriusMap();
    const results = await map.getSecurityWaitTimes();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      poiId: 1,
      name: "Security Checkpoint A",
      category: "security",
      queueTime: 15,
      isTemporarilyClosed: false,
      lastUpdated: 1700000000,
    });
  });

  it("should omit queue fields when dynamicData.security is absent", async () => {
    const pois = {
      "1": {
        poiId: "1",
        name: "Security Checkpoint A",
        category: "security",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "f1",
          latitude: 0,
          longitude: 0,
          structureName: "T1",
          buildingId: "b1",
          floorName: "L1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
      },
    };

    mockMapInstance.getAllPOIs
      .mockResolvedValueOnce(pois)
      .mockResolvedValueOnce(pois);

    const map = await getAtriusMap();
    const results = await map.getSecurityWaitTimes();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      poiId: 1,
      name: "Security Checkpoint A",
      category: "security",
    });
    expect(results[0]).not.toHaveProperty("queueTime");
    expect(results[0]).not.toHaveProperty("isTemporarilyClosed");
    expect(results[0]).not.toHaveProperty("lastUpdated");
  });

  it("should omit queue fields when timeIsReal is false", async () => {
    const pois = {
      "1": {
        poiId: "1",
        name: "Security Checkpoint A",
        category: "security",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "f1",
          latitude: 0,
          longitude: 0,
          structureName: "T1",
          buildingId: "b1",
          floorName: "L1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
        dynamicData: {
          security: {
            queueTime: 0,
            timeIsReal: false,
            isTemporarilyClosed: false,
            lastUpdated: 1700000000,
          },
        },
      },
    };

    mockMapInstance.getAllPOIs
      .mockResolvedValueOnce(pois)
      .mockResolvedValueOnce(pois);

    const map = await getAtriusMap();
    const results = await map.getSecurityWaitTimes();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      poiId: 1,
      name: "Security Checkpoint A",
      category: "security",
    });
    expect(results[0]).not.toHaveProperty("queueTime");
    expect(results[0]).not.toHaveProperty("isTemporarilyClosed");
    expect(results[0]).not.toHaveProperty("lastUpdated");
  });

  it("should return empty array when no security POIs exist", async () => {
    const pois = {
      "1": {
        poiId: "1",
        name: "Coffee Shop",
        category: "eat.coffee",
        isAfterSecurity: true,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "f1",
          latitude: 0,
          longitude: 0,
          structureName: "T1",
          buildingId: "b1",
          floorName: "L1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
      },
    };

    mockMapInstance.getAllPOIs
      .mockResolvedValueOnce(pois)
      .mockResolvedValueOnce(pois);

    const map = await getAtriusMap();
    const results = await map.getSecurityWaitTimes();

    expect(results).toEqual([]);
  });

  it("should return empty array when no POIs exist at all", async () => {
    mockMapInstance.getAllPOIs.mockResolvedValue({});

    const map = await getAtriusMap();
    const results = await map.getSecurityWaitTimes();

    expect(results).toEqual([]);
  });

  it("should convert poiId to number", async () => {
    const pois = {
      "42": {
        poiId: "42",
        name: "Security Checkpoint",
        category: "security",
        isAfterSecurity: false,
        isNavigable: true,
        keywords: [],
        images: [],
        position: {
          floorId: "f1",
          latitude: 0,
          longitude: 0,
          structureName: "T1",
          buildingId: "b1",
          floorName: "L1",
          floorOrdinal: 1,
        },
        zoomRadius: "5",
      },
    };

    mockMapInstance.getAllPOIs
      .mockResolvedValueOnce(pois)
      .mockResolvedValueOnce(pois);

    const map = await getAtriusMap();
    const results = await map.getSecurityWaitTimes();

    expect(results[0]?.poiId).toBe(42);
    expect(typeof results[0]?.poiId).toBe("number");
  });
});
