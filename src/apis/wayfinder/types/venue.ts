import { Type } from "typebox";

const BuildingAndLevel = Type.Object(
  {
    id: Type.String({
      description: "Building ID (e.g., 'llia-terminald')",
    }),
    name: Type.String({
      description: "Building Name (e.g., 'Terminal D')",
    }),
    levels: Type.Record(
      Type.String(),
      Type.Object(
        {
          id: Type.String({
            description: "Level ID (e.g., 'llia-terminald-departures')",
          }),
          name: Type.String({
            description: "Level Name (e.g., 'Departures')",
          }),
          details: Type.Optional(
            Type.String({ description: "A short description of the level" }),
          ),
        },
        { additionalProperties: false },
      ),
      {
        description: "List of floors/levels in this building",
      },
    ),
  },
  { additionalProperties: false },
);

// Response type for getBuildingsAndLevels tool
export const BuildingsAndLevels = Type.Array(BuildingAndLevel, {
  description: "Complete venue hierarchy: buildings with their nested levels",
});
