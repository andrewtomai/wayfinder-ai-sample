import type { Static } from "typebox";
import { Type } from "typebox";
import getMapInstance, {
  SearchOptions,
  SearchResult,
  POI,
  BuildingsAndLevels,
  MultipointDirections,
  SecurityWaitTimeResult,
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

const GetPOIDetailsInput = Type.Object({
  poiId: Type.Number({
    description:
      "POI ID (e.g., 108 for a specific Starbucks). Get POI IDs from the search tool results (item.poiId field).",
  }),
});

export const getPOIDetails: AgentTool = {
  name: "getPOIDetails",
  description:
    "Get complete details about a specific POI including description, images, keywords, real-time status, exact position, and nearby landmarks. Use this when you need full information about a POI you found via search. Returns more detailed data than search results, including all available images and metadata.",
  parametersJsonSchema: GetPOIDetailsInput,
  responseJsonSchema: POI,
  action: async (args) => {
    const map = await getMapInstance();
    const { poiId } = args as Static<typeof GetPOIDetailsInput>;
    return map.getPOIDetails(poiId);
  },
};

export const getBuildingsAndLevels: AgentTool = {
  name: "getBuildingsAndLevels",
  description:
    "Get the complete structure of this venue showing all buildings and floors. Returns building names, IDs, and nested floor information. Use the returned building IDs (e.g., 'llia-terminald') and floor IDs (e.g., 'llia-terminald-departures') to filter search results. Helpful for: understanding venue layout, showing users their options, filtering searches by location.",
  parametersJsonSchema: Type.Object({}),
  responseJsonSchema: BuildingsAndLevels,
  action: async () => {
    const map = await getMapInstance();
    return map.getStructures();
  },
};

export const getCategories: AgentTool = {
  name: "getCategories",
  description:
    "Get the complete list of all POI categories available in this venue. Categories are hierarchical with dot notation (e.g., 'eat.coffee', 'restroom.accessible'). Use these exact strings in the 'category' parameter of the search tool. Prefix matching is supported - 'eat' matches all food categories, 'restroom' matches all restroom types. Returns an array of category strings. No parameters required.",
  parametersJsonSchema: Type.Object({}),
  responseJsonSchema: Type.Array(Type.String()),
  action: async () => {
    const map = await getMapInstance();
    return map.getCategories();
  },
};

export const showPOI: AgentTool = {
  name: "showPOI",
  description:
    "Display a specific POI on the map UI and get its complete details. This tool both highlights the POI visually on the map and returns full information including description, images, keywords, real-time status, exact position, and nearby landmarks. Use this when you want to show the user a specific point of interest on the map. Returns the same detailed POI data as getPOIDetails.",
  parametersJsonSchema: GetPOIDetailsInput,
  responseJsonSchema: POI,
  action: async (args) => {
    const map = await getMapInstance();
    const { poiId } = args as Static<typeof GetPOIDetailsInput>;
    return map.showPOI(poiId);
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

export const getSecurityWaitTimes: AgentTool = {
  name: "getSecurityWaitTimes",
  description:
    "Get current wait times for all security checkpoints in the venue. Returns checkpoint name, ID, category, and real-time queue data (wait time in minutes, temporarily closed status, last updated timestamp). Some checkpoints may not have real-time data available. No parameters required.",
  parametersJsonSchema: Type.Object({}),
  responseJsonSchema: Type.Array(SecurityWaitTimeResult),
  action: async () => {
    const map = await getMapInstance();
    return map.getSecurityWaitTimes();
  },
};
