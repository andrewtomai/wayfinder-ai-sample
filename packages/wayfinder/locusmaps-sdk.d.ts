/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "locusmaps-sdk" {
  interface MapConfig {
    accountId: string;
    venueId: string;
    pinnedLocation?: {
      pinTitle?: string;
      lat: number;
      lng: number;
      floorId?: string;
      ordinal?: string;
      structureId?: string;
    };
  }

  export interface MapInstance {
    getDirectionsMultiple(
      locations: any[],
      accessible?: boolean,
      queueTypes?: string[],
    ): Promise<any>;
    showNavigationMultiple(
      locations: any[],
      accessible?: boolean,
      queueTypes?: string[],
    ): Promise<void>;
    getPOIDetails(poiId: number): Promise<any>;
    showPOI(poiId: number): Promise<void>;
    getAllPOIs(): Promise<any>;
    getStructures(): Promise<any>;
    getVenueData(): Promise<any>;
    search(term: string, details?: boolean): Promise<any>;
  }

  export function getVersion(): string;
  export function setLogging(logging: boolean): void;
  export function newMap(
    selector: string,
    config: MapConfig,
  ): Promise<MapInstance>;

  const AtriusMaps: {
    getVersion: typeof getVersion;
    setLogging: typeof setLogging;
    newMap: typeof newMap;
  };
  export default AtriusMaps;
}
