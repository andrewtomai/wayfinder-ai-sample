import { Type } from "typebox";

export const Config = Type.Object({
  accountId: Type.String(),
  venueId: Type.String(),
  headless: Type.Optional(Type.Boolean()),
});
