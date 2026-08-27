import { expect, test } from "vitest"
import { VoyageItinerarySchema } from "../src/models/entities"

const port = (Name: string) => ({ data: { Name } })

const label = (data: Record<string, unknown>) =>
  VoyageItinerarySchema.getLabel(data)

/**
 * The intended first ports are the itinerary as planned, so they keep naming
 * it wherever the contributor gave them.
 */
test("an itinerary is named from its intended first ports", () => {
  expect(
    label({
      "First port of intended embarkation": port("Luanda"),
      "First port of intended disembarkation": port("Rio de Janeiro"),
      "Principal port of embarkation": port("Cabinda"),
      "Principal port of disembarkation": port("Bahia")
    })
  ).toBe("Itinerary from Luanda to Rio de Janeiro")
})

/**
 * The case from the Preview box: sources routinely give a principal port and
 * no intended first one, and the label said "unknown" about a port the
 * contribution was carrying.
 */
test("a principal port names the itinerary when no intended first port was given", () => {
  expect(
    label({
      "First port of intended disembarkation": port("Rio de Janeiro"),
      "Principal port of embarkation": port("Luanda")
    })
  ).toBe("Itinerary from Luanda to Rio de Janeiro")

  expect(
    label({
      "First port of intended embarkation": port("Luanda"),
      "Principal port of disembarkation": port("Bahia")
    })
  ).toBe("Itinerary from Luanda to Bahia")
})

/** "unknown" now means neither port was recorded. */
test("an end with no port at all is still unknown", () => {
  expect(label({})).toBe("Itinerary from unknown to unknown")
})
