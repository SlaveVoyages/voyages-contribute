import { EntitySchema, VoyageSchema } from "../models"
import { DataMapping } from "./importer"
import { voyageMapping } from "./voyageMapping"
import { voyageTemplateColumnOrder } from "./voyageTemplateOrder"

export const AllMappings: Record<
  string,
  {
    mapping: DataMapping
    schema: EntitySchema
    /**
     * The sequence a downloaded template presents its columns in. Cosmetic --
     * the importer matches on header name -- and optional: without it, columns
     * come out in whatever order the mapping is walked in.
     */
    templateColumnOrder?: string[]
  }
> = {
  Voyage: {
    mapping: voyageMapping,
    schema: VoyageSchema,
    templateColumnOrder: voyageTemplateColumnOrder
  }
}
