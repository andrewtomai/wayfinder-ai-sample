import type { Static } from "typebox";
import { Type } from "typebox";
import getMapInstance, {
  SearchOptions,
  SearchResult,
  MultipointDirections,
  getPinnedLocation,
} from "@core/wayfinder";
import type { AgentTool } from "@core/agent";

export const search: AgentTool = {
  name: "search",
  description:
    "Search for points of interest (POIs) with flexible filtering. Supports fuzzy text search and location-based queries. Returns simplified POI info (poiId, name, score, distance). Use getPOIDetails or showPOI with the poiId to get full details. Results sorted by relevance (text search) or distance (proximity search).",
  parametersJsonSchema: SearchOptions,
  responseJsonSchema: Type.Array(SearchResult),
  action: async (options) => {
    const map = await getMapInstance();
    return map.search(options as Static<typeof SearchOptions>);
  },
};

const ShowDirectionsInput = Type.Object({
  waypoints: Type.Array(Type.Number(), {
    description:
      "Ordered list of destination POI IDs to route through (minimum 1). Directions always start from the user's current location. Example: [108] routes from here to POI 108. For multi-stop routes: [108, 124] routes from here → 108 → 124.",
    minItems: 1,
  }),
});

export const showDirections: AgentTool = {
  name: "showDirections",
  description:
    "Get turn-by-turn directions from the user's current location to one or more destinations and display them on the map. Directions always start from the kiosk's known location — only provide destination POI IDs. Returns walking time, distance, step-by-step instructions, and an interactive map visualization. Supports multi-stop routes (here→A→B). Distance is in meters, time is in minutes. Use POI IDs from search results to specify waypoints.",
  parametersJsonSchema: ShowDirectionsInput,
  responseJsonSchema: MultipointDirections,
  action: async (args) => {
    const map = await getMapInstance();
    const { waypoints } = args as Static<typeof ShowDirectionsInput>;
    const pinned = getPinnedLocation();
    if (!pinned) {
      throw new Error("Pinned location is not configured.");
    }
    const origin = {
      lat: pinned.lat,
      lng: pinned.lng,
      floorId: pinned.floorId,
    };
    return map.showDirections([
      origin,
      ...waypoints.map((id) => ({ poiId: id })),
    ]);
  },
};

const SearchNearbyInput = Type.Object({
  term: Type.Optional(
    Type.String({
      description:
        "Text search query to filter nearby POIs. Supports fuzzy matching. Optional — omit to get all POIs near the current location.",
    }),
  ),
  radius: Type.Optional(
    Type.Number({
      description:
        "Search radius in meters from the current location. Default: 100. Recommended: 100-500.",
    }),
  ),
});

export const searchNearby: AgentTool = {
  name: "searchNearby",
  description:
    "Search for points of interest near the user's current location. Automatically scoped to the kiosk's position and floor. Returns POIs sorted by distance with name, ID, and distance in meters. Use for 'what's nearby?' or 'find something close' queries.",
  parametersJsonSchema: SearchNearbyInput,
  responseJsonSchema: Type.Array(SearchResult),
  action: async (args) => {
    const map = await getMapInstance();
    const { term, radius } = args as Static<typeof SearchNearbyInput>;
    const pinned = getPinnedLocation();
    if (!pinned) {
      throw new Error("Pinned location is not configured.");
    }
    return map.search({
      term,
      floorId: pinned.floorId,
      near: {
        point: { lat: pinned.lat, lng: pinned.lng },
        radius: radius ?? 100,
      },
    });
  },
};
