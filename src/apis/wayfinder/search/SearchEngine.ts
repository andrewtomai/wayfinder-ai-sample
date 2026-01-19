import Fuse from "fuse.js";
import { POI } from "../types/poi.js";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { Omit } from "typebox/type";

const NearPOI = Type.Object({
  poiId: Type.String({
    description:
      "POI ID to search near (e.g., '108' for a specific Starbucks). Either poiId or point (lat/lng) is required.",
  }),
  radius: Type.Optional(
    Type.Number({
      description: "Filter results within a specific radius in meters.",
    }),
  ),
});

const NearPoint = Type.Object({
  point: Type.Object(
    {
      lat: Type.Number({ description: "Latitude" }),
      lng: Type.Number({ description: "Longitude" }),
    },
    {
      description:
        "Coordinate to search near. Either point or poiId is required.",
    },
  ),
  radius: Type.Optional(
    Type.Number({
      description: "Filter results within a specific radius in meters.",
    }),
  ),
});

const Near = Type.Union([NearPOI, NearPoint], {
  description:
    "Search near a POI or coordinate. Default radius: 100m. Recommended: 100-500m for typical queries.",
});

export const SearchOptions = Type.Object({
  term: Type.Optional(
    Type.String({
      description:
        "Text search query. Supports fuzzy matching for typos (e.g., 'coffe' finds 'coffee'). Searches across POI names, keywords, categories, and descriptions. Optional - can filter by building/floor without a text term.",
    }),
  ),
  buildingId: Type.Optional(
    Type.String({
      description:
        "Filter by building ID (e.g., 'llia-terminald', 'llia-terminalb'). Use getBuildingsAndLevels to get valid building IDs.",
    }),
  ),
  floorId: Type.Optional(
    Type.String({
      description:
        "Filter by floor ID (e.g., 'llia-terminald-departures', 'llia-terminalb-lower'). Use getBuildingsAndLevels to get valid floor IDs for each building.",
    }),
  ),
  isAfterSecurity: Type.Optional(
    Type.Boolean({
      description:
        "Filter by security checkpoint location. 'true' returns only POIs after security checkpoints, 'false' returns only POIs before security. Omit to search both areas.",
    }),
  ),
  near: Type.Optional(Near),
});

// Schema for internal indexed POI (keywords flattened to strings)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IndexedPOISchema = Type.Intersect([
  Omit(POI, ["keywords"]),
  Type.Object({ keywords: Type.Array(Type.String()) }),
]);
type IndexedPOI = Static<typeof IndexedPOISchema>;

/**
 * Simplified search result for AI consumption.
 * Contains only essential fields for decision-making.
 */
export const SearchResult = Type.Object({
  poiId: Type.String({
    description: "Unique POI identifier for use with other tools",
  }),
  name: Type.String({ description: "Display name of the POI" }),
  description: Type.Optional(
    Type.String({
      description: "A human readable description of this POI",
    }),
  ),
  score: Type.Optional(
    Type.Number({ description: "Search relevance score (lower is better)" }),
  ),
  distance: Type.Optional(
    Type.Number({
      description:
        "Distance in meters from search origin (when using proximity search)",
    }),
  ),
});

const LIMIT = 10;

export class SearchEngine {
  private readonly engine: Fuse<IndexedPOI>;
  private readonly pois: IndexedPOI[];

  constructor(pois: Static<typeof POI>[]) {
    const transformed = SearchEngine.transformPOIs(pois);
    // Main search index
    this.engine = new Fuse(transformed, {
      keys: [
        { name: "name", weight: 2.0 },
        { name: "keywords", weight: 1.5 },
        { name: "category", weight: 1.0 },
        { name: "description", weight: 0.5 },
      ],
      threshold: 0.4, // adjust based on testing
      includeScore: true,
      includeMatches: true, // helpful for debugging
      minMatchCharLength: 2,
      ignoreLocation: true, // search entire string
    });

    // Keep original data for filtering
    this.pois = transformed;
  }

  private static transformPOIs(pois: Static<typeof POI>[]): IndexedPOI[] {
    return pois.map((poi) => ({
      ...poi,
      keywords: poi.keywords.map((x) => x.name),
    }));
  }

  search(options: Static<typeof SearchOptions>): Static<typeof SearchResult>[] {
    const { term, buildingId, floorId, isAfterSecurity, near } = Value.Parse(
      SearchOptions,
      options,
    );

    // Internal type for processing (includes full item data)
    type InternalResult = {
      item: IndexedPOI;
      score?: number;
      distance?: number;
    };

    // Text search - get all results, we'll apply limit after filtering
    let results: InternalResult[] = term
      ? this.engine.search(term).map((r) => ({ item: r.item, score: r.score }))
      : this.pois.map((poi) => ({ item: poi, score: 0 }));

    if (buildingId) {
      results = results.filter((r) =>
        r.item.position?.buildingId?.includes(buildingId.toLowerCase()),
      );
    }

    if (floorId) {
      results = results.filter((r) => r.item.position?.floorId === floorId);
    }

    if (isAfterSecurity !== undefined) {
      results = results.filter(
        (r) => r.item.isAfterSecurity === isAfterSecurity,
      );
    }

    // Proximity filtering
    results = this.filterByProximity(results, near);

    // Simplify results before returning
    return results.slice(0, LIMIT).map((r) => ({
      poiId: r.item.poiId,
      name: r.item.name,
      description: r.item.description,
      score: r.score,
      distance: r.distance,
    }));
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const poi of this.pois) {
      categories.add(poi.category);
    }
    return Array.from(categories).sort();
  }

  private filterByProximity<T extends { item: IndexedPOI; score?: number }>(
    results: T[],
    near?: Static<typeof Near>,
  ): (T & { distance?: number })[] {
    if (!near) return results;

    let centerLat: number | undefined;
    let centerLng: number | undefined;
    const radius = near.radius || 100;

    if (Value.Check(NearPOI, near)) {
      const centerPoi = this.pois.find((p) => p.poiId === near.poiId);
      if (centerPoi?.position) {
        centerLat = centerPoi.position.latitude;
        centerLng = centerPoi.position.longitude;
      }
    } else {
      centerLat = near.point.lat;
      centerLng = near.point.lng;
    }

    if (centerLat === undefined || centerLng === undefined) {
      return [];
    }

    return results
      .map((r) => ({
        ...r,
        distance: SearchEngine.haversineDistance(
          centerLat,
          centerLng,
          r.item.position.latitude,
          r.item.position.longitude,
        ),
      }))
      .filter((r) => r.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  private static haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}
