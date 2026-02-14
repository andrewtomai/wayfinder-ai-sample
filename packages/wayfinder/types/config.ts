import { Type } from "typebox";

export const Config = Type.Object({
  accountId: Type.String(),
  venueId: Type.String(),
  headless: Type.Optional(Type.Boolean()),
  pinnedLocation: Type.Optional(
    Type.Object({
      pinTitle: Type.Optional(Type.String()),
      lat: Type.Number(),
      lng: Type.Number(),
      floorId: Type.String(),
    }),
  ),
});
