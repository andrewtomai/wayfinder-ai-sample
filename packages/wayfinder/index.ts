// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./locusmaps-sdk.d.ts" />
import AtriusMaps from "locusmaps-sdk";
import type { MapInstance } from "locusmaps-sdk";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";
import logger from "@core/logger";
import { Config } from "./types/config";
import { Directions, MultipointDirections } from "./types/directions";
import { POI } from "./types/poi";
import { BuildingsAndLevels } from "./types/venue";
import {
  SearchEngine,
  SearchResult,
  SearchOptions,
} from "./search/SearchEngine";

const outputValidation = (type: TSchema, data: unknown) => {
  try {
    return Value.Parse(type, data);
  } catch (e) {
    const errors = Value.Errors(type, data);
    logger.error("Output Validation Failure", { errors, data });
    throw e;
  }
};

class AtriusMap {
  private readonly map;
  private readonly searchEngine: SearchEngine;
  private static instance: AtriusMap | null = null;
  private static initPromise: Promise<AtriusMap> | null = null;

  private constructor(map: MapInstance, searchEngine: SearchEngine) {
    this.map = map;
    this.searchEngine = searchEngine;
  }

  public static async getInstance(
    selector: string,
    config: Static<typeof Config>,
  ): Promise<AtriusMap> {
    // If instance already exists, return it
    if (this.instance) {
      return this.instance;
    }

    // If initialization is in progress, wait for it to complete
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this.createInstance(selector, config);
    this.instance = await this.initPromise;
    return this.instance;
  }

  private static async createInstance(
    selector: string,
    config: Static<typeof Config>,
  ): Promise<AtriusMap> {
    const map = await AtriusMaps.newMap(selector, Value.Parse(Config, config));
    const searchEngine = new SearchEngine(
      Object.values(await map.getAllPOIs()),
    );
    return new AtriusMap(map, searchEngine);
  }

  async getPOIDetails(poiId: number) {
    const result = await this.map.getPOIDetails(poiId);
    return outputValidation(POI, result);
  }

  async showPOI(poiId: number) {
    const data = await this.map.getPOIDetails(poiId);
    await this.map.showPOI(poiId);
    return outputValidation(POI, data);
  }

  async showDirections(waypoints: number[]) {
    const args = waypoints.map((poiId) => ({ poiId }));
    const result = await this.map.getDirectionsMultiple(args);
    await this.map.showNavigationMultiple(args);
    return outputValidation(MultipointDirections, result);
  }

  async getStructures() {
    const result = await this.map.getStructures();
    return outputValidation(BuildingsAndLevels, result);
  }

  async search(options: Static<typeof SearchOptions>) {
    return this.searchEngine.search(options);
  }

  async getCategories() {
    return this.searchEngine.getCategories();
  }
}

// Export a function that returns the singleton instance
const getMapInstance = () =>
  AtriusMap.getInstance("#map", {
    venueId: import.meta.env.VITE_ATRIUS_VENUE_ID,
    accountId: import.meta.env.VITE_ATRIUS_ACCOUNT_ID,
  });

export default getMapInstance;

export {
  AtriusMap,
  SearchEngine,
  SearchResult,
  Directions,
  MultipointDirections,
};
export { SearchOptions };
export { Config } from "./types/config";
export { POI } from "./types/poi";
export { BuildingsAndLevels } from "./types/venue";
