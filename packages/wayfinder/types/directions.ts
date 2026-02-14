import { Type } from "typebox";

export const Bounds = Type.Object({
  n: Type.Number(),
  s: Type.Number(),
  e: Type.Number(),
  w: Type.Number(),
});

const AnimationAnchor = Type.Object({
  lat: Type.Number(),
  lng: Type.Number(),
  floorId: Type.String(),
  ordinal: Type.Number(),
  structureId: Type.String(),
});

const SecurityWaitTime = Type.Object({
  isTemporarilyClosed: Type.Boolean(),
  queueTime: Type.Number(),
  timeIsReal: Type.Boolean(),
});

const SecurityLane = Type.Object({
  type: Type.String(),
  id: Type.String(),
});

const DirectionStep = Type.Object({
  primaryText: Type.String(),
  secondaryText: Type.String(),
  icon: Type.String(),
  animationAnchor: AnimationAnchor,
  eta: Type.Number(),
  distance: Type.Number(),
  bounds: Bounds,
  isAccessible: Type.Boolean(),
  securityWaitTimes: Type.Optional(SecurityWaitTime),
  poiId: Type.Optional(Type.String()),
});

const WaypointPosition = Type.Object({
  lat: Type.Number(),
  lng: Type.Number(),
  floorId: Type.String(),
  ordinal: Type.Number(),
  structureId: Type.String(),
});

const Waypoint = Type.Object({
  distance: Type.Number(),
  eta: Type.Number(),
  levelDifference: Type.Number(),
  position: WaypointPosition,
  portalType: Type.Optional(Type.String()),
  isPortal: Type.Optional(Type.Boolean()),
  poiId: Type.Optional(Type.String()),
  securityWaitTimes: Type.Optional(SecurityWaitTime),
  securityLane: Type.Optional(SecurityLane),
  isSecurityCheckpoint: Type.Optional(Type.Boolean()),
  isDestination: Type.Optional(Type.Boolean()),
});

export const Stop = Type.Union([
  Type.Object({
    poiId: Type.Number(),
  }),
  Type.Object({
    lat: Type.Number(),
    lng: Type.Number(),
    floorId: Type.String(),
  }),
]);

export const Directions = Type.Object({
  distance: Type.Number(),
  time: Type.Number(),
  steps: Type.Array(DirectionStep),
  waypoints: Type.Array(Waypoint),
});

export const MultipointDirections = Type.Object({
  total: Type.Object({
    distance: Type.Number(),
    time: Type.Number(),
  }),
  directions: Type.Array(Directions),
});
