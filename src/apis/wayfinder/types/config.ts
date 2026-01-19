import { Type } from "typebox";

export const Config = Type.Object({
  accountId: Type.String(),
  venueId: Type.String(),
});
