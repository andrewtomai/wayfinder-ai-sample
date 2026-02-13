import type { Static } from "typebox";
import { Type } from "typebox";
import getMapInstance, {
  SearchOptions,
  SearchResult,
  MultipointDirections,
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
      "Ordered list of POI IDs to route through (minimum 2). First ID is the starting point, last is the destination. Example: [109, 108] routes from the starting point (109) to the destination (108). For multi-stop routes, add IDs in order: [109, 108, 124] routes from the starting point → mid point → final destination",
  }),
});

export const showDirections: AgentTool = {
  name: "showDirections",
  description:
    "Get turn-by-turn directions between POIs and display them on the map. Returns walking time, distance, step-by-step instructions, and an interactive map visualization. Supports multi-stop routes (A→B→C). Distance is in meters, time is in minutes. Use POI IDs from search results to specify waypoints. Accessible routes can be requested to avoid stairs and escalators.",
  parametersJsonSchema: ShowDirectionsInput,
  responseJsonSchema: MultipointDirections,
  action: async (args) => {
    const map = await getMapInstance();
    const { waypoints } = args as Static<typeof ShowDirectionsInput>;
    return map.showDirections(waypoints);
  },
};
