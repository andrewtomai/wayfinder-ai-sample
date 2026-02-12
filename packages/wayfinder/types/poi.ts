import { Type } from "typebox";

const Keyword = Type.Object({
  isDisplayed: Type.Boolean(),
  isUserSearchable: Type.Boolean(),
  name: Type.String(),
});

const Link = Type.Object({
  type: Type.String(),
  url: Type.String(),
  label: Type.Optional(Type.String()),
});

const ImageReference = Type.Object({
  url: Type.String(),
});

const POIPosition = Type.Object({
  floorId: Type.String(),
  latitude: Type.Number(),
  longitude: Type.Number(),
  structureName: Type.String(),
  buildingId: Type.String(),
  floorName: Type.String(),
  floorOrdinal: Type.Number(),
});

export const POI = Type.Object({
  poiId: Type.String(),
  name: Type.String(),
  category: Type.String(),
  isAfterSecurity: Type.Boolean(),
  isNavigable: Type.Boolean(),
  keywords: Type.Array(Keyword),
  images: Type.Array(Type.String()),
  description: Type.Optional(Type.String()),
  additionalAttributes: Type.Optional(Type.Record(Type.String(), Type.Any())),
  fullImages: Type.Optional(Type.Array(ImageReference)),
  links: Type.Optional(Type.Array(Link)),
  nearbyLandmark: Type.Optional(Type.String()),
  operationHours: Type.Optional(Type.String()),
  phone: Type.Optional(Type.String()),
  position: POIPosition,
  zoomRadius: Type.String(),
  dynamicData: Type.Optional(
    Type.Object({
      "open-closed-status": Type.Optional(
        Type.Object({
          expiration: Type.Number(),
          isOpen: Type.Boolean(),
        }),
      ),
      security: Type.Optional(
        Type.Object({
          isTemporarilyClosed: Type.Boolean(),
          queueTime: Type.Number(),
          timeIsReal: Type.Boolean(),
          lastUpdated: Type.Number(),
        }),
      ),
      parking: Type.Optional(
        Type.Object({
          lotStatus: Type.String(),
          rateDay: Type.String(),
          rateHour: Type.String(),
          timeIsReal: Type.Boolean(),
          lastUpdated: Type.Number(),
        }),
      ),
    }),
  ),
});
