import { assert, expect, test } from "vitest"
import {
  addToMaterializedData,
  applyChanges,
  cloneEntity,
  expandMaterialized,
  getEntity,
  isMaterializedEntity,
  isMaterializedEntityArray,
  MaterializedEntity,
  materializeNew,
  EntityData
} from "../src/models/materialization"
import {
  VoyageShipEntitySchema,
  VoyageSchema,
  getSchemaProp,
  NationalitySchema,
  VoyageDatesSchema,
  SparseDateSchema,
  VoyageCargoConnectionSchema,
  EntitySchema,
  getSchema,
  CargoUnitSchema,
  CargoTypeSchema,
  AllProperties
} from "../src/models/entities"
import {
  EntityChange,
  EntityUpdate,
  getChangeRefs
} from "../src/models/changeSets"
import { fillEntityWithDummies } from "./mock"

const getEntityByPath = (root: MaterializedEntity, ...path: string[]) => {
  let result = root
  for (let i = 0; i < path.length; ++i) {
    const child = result.data[path[i]]
    if (!isMaterializedEntity(child)) {
      return undefined
    }
    result = child
  }
  return result
}

test("materialize new voyage", () => {
  const voyage = materializeNew(VoyageSchema, "1234567890")
  // console.dir(voyage, { depth: null })
  expect(voyage.data["Voyage ID"]).toBe("1234567890")
  expect(voyage.data["Dataset"]).toBe(0)
  const ship = isMaterializedEntity(voyage.data["Ship"])
    ? voyage.data["Ship"].data
    : {}
  expect(ship).toBeTruthy()
  expect(ship["Name of vessel"]).toBe("")
  expect(ship["National carrier"]).toBe(null)
  const expanded = expandMaterialized(voyage)
  const expKeys = Object.keys(expanded)
  expect(expKeys).contains("Voyage")
  expect(expKeys).contains("VoyageShip")
  expect(expKeys).contains("VoyageItinerary")
  expect(expKeys).contains("VoyageDates")
  expect(expKeys).contains("VoyageSlaveNumbers")
})

test("materialize new voyage with edits", () => {
  const voyage = materializeNew(VoyageSchema, "new_00001")
  const ship = voyage.data["Ship"]
  const dates = voyage.data["Dates"]
  assert(
    isMaterializedEntity(ship),
    "Expected a materialized ship entity for voyage"
  )
  assert(
    isMaterializedEntity(dates),
    "Expected a materialized dates entity for voyage"
  )
  const shipProp = getSchemaProp(VoyageSchema, "Ship")
  assert(shipProp !== undefined, "Voyage ship prop not found in schema")
  const datesProp = getSchemaProp(VoyageSchema, "Dates")
  assert(datesProp !== undefined, "Voyage dates prop not found in schema")
  const shipnameProp = getSchemaProp(VoyageShipEntitySchema, "Name of vessel")
  assert(shipnameProp !== undefined, "Vessel name prop not found in schema")
  const cargoProp = getSchemaProp(VoyageSchema, "Cargo")
  assert(cargoProp !== undefined, "Cargo prop not found in schema")
  const shipNationProp = getSchemaProp(
    VoyageShipEntitySchema,
    "National carrier"
  )
  assert(
    shipNationProp !== undefined,
    "Vessel nationality prop not found in schema"
  )
  const voyageYearProp = getSchemaProp(
    VoyageDatesSchema,
    "Year of arrival at port of disembarkation"
  )
  assert(voyageYearProp !== undefined, "Voyage year prop not found in schema")
  const voyageDaysProp = getSchemaProp(
    VoyageDatesSchema,
    "Length of transoceanic voyage in days"
  )
  assert(voyageDaysProp !== undefined, "Voyage days prop not found in schema")
  const sparseYearProp = getSchemaProp(SparseDateSchema, "Year")
  assert(sparseYearProp !== undefined, "Sparse year prop not found in schema")
  const change: EntityUpdate = {
    type: "update",
    entityRef: voyage.entityRef,
    changes: [
      {
        kind: "owned",
        comments: "changing ship info",
        property: shipProp.uid,
        ownedEntity: cloneEntity(ship),
        changes: [
          {
            kind: "direct",
            property: shipnameProp.uid,
            changed: "Santa Maria"
          },
          {
            kind: "linked",
            property: shipNationProp.uid,
            changed: {
              entityRef: {
                id: 1234,
                schema: NationalitySchema.name,
                type: "existing"
              },
              data: {},
              state: "lazy"
            }
          }
        ]
      },
      {
        kind: "owned",
        comments: "setting a year for the voyage",
        property: datesProp.uid,
        ownedEntity: cloneEntity(dates),
        changes: [
          {
            kind: "owned",
            property: voyageYearProp.uid,
            ownedEntity: {
              entityRef: {
                id: "temp_987654321",
                schema: SparseDateSchema.name,
                type: "new"
              },
              data: {},
              state: "new"
            },
            changes: [
              {
                kind: "direct",
                property: sparseYearProp.uid,
                changed: 1756
              }
            ]
          },
          {
            kind: "direct",
            property: voyageDaysProp.uid,
            changed: 42
          }
        ]
      },
      {
        kind: "ownedList",
        comments: "Adding cargo items",
        property: cargoProp.uid,
        removed: [],
        modified: [
          {
            kind: "owned",
            ownedEntity: {
              entityRef: {
                id: "temp_cargo_123",
                schema: VoyageCargoConnectionSchema.name,
                type: "new"
              },
              data: {},
              state: "new"
            },
            changes: [
              {
                kind: "linked",
                property:
                  getSchemaProp(VoyageCargoConnectionSchema, "Cargo unit")
                    ?.uid ?? "<notfound>",
                changed: {
                  entityRef: {
                    id: 5555,
                    schema: CargoUnitSchema.name,
                    type: "existing"
                  },
                  data: {},
                  state: "lazy"
                }
              },
              {
                kind: "linked",
                property:
                  getSchemaProp(VoyageCargoConnectionSchema, "Cargo type")
                    ?.uid ?? "<notfound>",
                changed: {
                  entityRef: {
                    id: 7777,
                    schema: CargoTypeSchema.name,
                    type: "existing"
                  },
                  data: {},
                  state: "lazy"
                }
              },
              {
                kind: "direct",
                property:
                  getSchemaProp(
                    VoyageCargoConnectionSchema,
                    "The amount of cargo according to the unit"
                  )?.uid ?? "<notfound>",
                changed: 10
              }
            ]
          }
        ]
      }
    ]
  }
  // console.dir(change, { depth: null })
  const data = expandMaterialized(cloneEntity(voyage))
  const extraRefs = getChangeRefs(change)
  // console.log(extraRefs)
  // Check that the nationality we set for the ship is observed in the change
  // refs.
  const natRef = extraRefs.find((r) => r.schema === NationalitySchema.name)
  expect(natRef).toBeTruthy()
  assert(natRef !== undefined)
  expect(natRef.id).toBe(1234)
  const fakeNat: MaterializedEntity = {
    ...materializeNew(NationalitySchema, natRef.id),
    state: "original"
  }
  fillEntityWithDummies(fakeNat)
  fakeNat.data["Nation name"] = "Brazil"
  addToMaterializedData(data, fakeNat)
  // More additional fake pre-existing data.
  const fakeCargoUnit: MaterializedEntity = {
    ...materializeNew(CargoUnitSchema, 5555),
    state: "original"
  }
  fillEntityWithDummies(fakeCargoUnit)
  addToMaterializedData(data, fakeCargoUnit)
  const fakeCargoType: MaterializedEntity = {
    ...materializeNew(CargoTypeSchema, 7777),
    state: "original"
  }
  fillEntityWithDummies(fakeCargoType)
  addToMaterializedData(data, fakeCargoType)
  applyChanges(data, [change])
  // console.dir(data, { depth: null })
  const modified = getEntity(data, voyage.entityRef)
  // console.dir(modified, { depth: null })
  expect(getEntityByPath(voyage, "Ship")?.data["Name of vessel"]).toBe("")
  expect(getEntityByPath(modified, "Ship")?.data["Name of vessel"]).toBe(
    "Santa Maria"
  )
  expect(
    getEntityByPath(modified, "Ship", "National carrier")?.data["Nation name"]
  ).toBe("Brazil")
  expect(
    getEntityByPath(modified, "Dates", voyageYearProp.label)?.data["Year"]
  ).toBe(1756)
  expect(getEntityByPath(modified, "Dates")?.data[voyageDaysProp.label]).toBe(
    42
  )
  expect(
    isMaterializedEntityArray(modified.data["Cargo"]) &&
      modified.data["Cargo"].length === 1
  ).toBeTruthy()
  const cargoItem = modified.data["Cargo"]![0] as MaterializedEntity
  expect(cargoItem.state).toBe("new")
  expect(cargoItem.data["voyage_id"]).toBe("new_00001")
  expect(cargoItem.data["The amount of cargo according to the unit"]).toBe(10)
  expect(
    cargoItem.data["Was this a commodity used to purchase enslaved people"]
  ).toBe(false)
  expect(getEntityByPath(cargoItem, "Cargo unit")?.entityRef.id).toBe(5555)
  expect(getEntityByPath(cargoItem, "Cargo type")?.entityRef.id).toBe(7777)
  // console.dir(modified, { depth: null })
})

const voyage1234: MaterializedEntity = {
  data: {
    "Voyage ID": 1234,
    Dataset: 0,
    Cargo: [],
    Crew: {
      data: {
        "Crew at voyage outset": null,
        "Crew at departure from last port of embarkation": null,
        "Crew at first port of disembarkation": null,
        "Crew when return voyage began": null,
        "Crew at end of voyage": null,
        "Number of crew if voyage stage unknown": null,
        "Crew died before first place of trade in Africa": null,
        "Crew died while ship was on African coast": null,
        "Crew died during transoceanic passage": null,
        "Crew died in the Americas": null,
        "Crew died on return voyage": null,
        "Crew died during complete voyage": null,
        "Total number of crew deserted": null,
        id: 1217
      },
      state: "original",
      entityRef: {
        type: "existing",
        schema: "VoyageCrew",
        id: 1217
      }
    },
    "Slave numbers": {
      data: {
        "Captives intended from first port of embarkation": null,
        num_men_embark_first_port_purchase: null,
        num_women_embark_first_port_purchase: null,
        num_boy_embark_first_port_purchase: null,
        num_girl_embark_first_port_purchase: null,
        num_males_embark_first_port_purchase: null,
        num_females_embark_first_port_purchase: null,
        num_adult_embark_first_port_purchase: null,
        num_child_embark_first_port_purchase: null,
        num_infant_embark_first_port_purchase: null,
        num_men_embark_second_port_purchase: null,
        num_women_embark_second_port_purchase: null,
        num_boy_embark_second_port_purchase: null,
        num_girl_embark_second_port_purchase: null,
        num_males_embark_second_port_purchase: null,
        num_females_embark_second_port_purchase: null,
        num_adult_embark_second_port_purchase: null,
        num_child_embark_second_port_purchase: null,
        num_infant_embark_second_port_purchase: null,
        num_men_embark_third_port_purchase: null,
        num_women_embark_third_port_purchase: null,
        num_boy_embark_third_port_purchase: null,
        num_girl_embark_third_port_purchase: null,
        num_males_embark_third_port_purchase: null,
        num_females_embark_third_port_purchase: null,
        num_adult_embark_third_port_purchase: null,
        num_child_embark_third_port_purchase: null,
        num_infant_embark_third_port_purchase: null,
        num_men_died_middle_passage: null,
        num_women_died_middle_passage: null,
        num_boy_died_middle_passage: null,
        num_girl_died_middle_passage: null,
        num_males_died_middle_passage: null,
        num_females_died_middle_passage: null,
        num_adult_died_middle_passage: null,
        num_child_died_middle_passage: null,
        num_infant_died_middle_passage: null,
        num_men_disembark_first_landing: null,
        num_women_disembark_first_landing: null,
        num_boy_disembark_first_landing: null,
        num_girl_disembark_first_landing: null,
        num_males_disembark_first_landing: null,
        num_females_disembark_first_landing: null,
        num_adult_disembark_first_landing: null,
        num_child_disembark_first_landing: null,
        num_infant_disembark_first_landing: null,
        num_men_disembark_second_landing: null,
        num_women_disembark_second_landing: null,
        num_boy_disembark_second_landing: null,
        num_girl_disembark_second_landing: null,
        num_males_disembark_second_landing: null,
        num_females_disembark_second_landing: null,
        num_adult_disembark_second_landing: null,
        num_child_disembark_second_landing: null,
        num_infant_disembark_second_landing: null,
        imp_num_male_embarked: null,
        imp_num_female_embarked: null,
        imp_num_adult_embarked: null,
        imp_num_children_embarked: null,
        imp_num_male_landed: null,
        imp_num_female_landed: null,
        imp_num_adult_landed: null,
        imp_num_child_landed: null,
        imp_num_men_total: null,
        imp_num_women_total: null,
        imp_num_boy_total: null,
        imp_num_girl_total: null,
        imp_num_males_total: null,
        imp_num_females_total: null,
        imp_num_adult_total: null,
        imp_num_child_total: null,
        imp_male_death_middle_passage: null,
        imp_female_death_middle_passage: null,
        imp_adult_death_middle_passage: null,
        imp_child_death_middle_passage: null,
        id: 1217
      },
      state: "original",
      entityRef: {
        type: "existing",
        schema: "VoyageSlaveNumbers",
        id: 1217
      }
    },
    Ship: {
      data: {
        "Name of vessel": "Juanita",
        "National carrier": {
          data: {
            "Nation name": "Spain",
            Code: 1,
            id: 6
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "Nationality",
            id: 6
          }
        },
        "Definition of ton": null,
        "Tonnage of vessel": null,
        "Rig of vessel": {
          data: {
            "Rig of vessel": "Schooner",
            Code: 2,
            id: 3
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "RigOfVessel",
            id: 3
          }
        },
        "Guns mounted": null,
        "Year of ship construction": null,
        "Place where ship constructed": null,
        "Year of ship registration": null,
        "Place where ship registered": null,
        Nationality: {
          data: {
            "Nation name": "Spain / Uruguay",
            Code: 3,
            id: 5
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "Nationality",
            id: 5
          }
        },
        "Tonnage standardized on British measured tons, 1773-1870": null,
        id: 1217
      },
      state: "original",
      entityRef: {
        type: "existing",
        schema: "VoyageShip",
        id: 1217
      }
    },
    Outcome: {
      data: {
        "Outcome of voyage": {
          data: {
            Name: "Voyage completed as intended",
            Value: 1,
            id: 2
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "ParticularOutcome",
            id: 2
          }
        },
        "African resistance": null,
        "Enslaved outcome": {
          data: {
            Name: "Slaves disembarked in Americas",
            Value: 1,
            id: 1
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "SlavesOutcome",
            id: 1
          }
        },
        "Vessel outcome": {
          data: {
            Name: "Not captured",
            Value: 14,
            id: 1
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "VesselOutcomeSchema",
            id: 1
          }
        },
        "Owner outcome": {
          data: {
            Name: "Delivered slaves for original owners",
            Value: 1,
            id: 1
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "OwnerOutcome",
            id: 1
          }
        },
        id: 1217
      },
      state: "original",
      entityRef: {
        type: "existing",
        schema: "VoyageOutcome",
        id: 1217
      }
    },
    Itinerary: {
      data: {
        "Port of vessel's departure": {
          data: {
            Name: "Havana",
            Code: 31312,
            id: 1126
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "Location",
            id: 1126
          }
        },
        "First port of intended embarkation": null,
        "Second port of intended embarkation": null,
        "First port of intended disembarkation": null,
        "Second port of intended disembarkation": null,
        "Third port of intended disembarkation": null,
        "Fourth port of intended disembarkation": null,
        "Number of ports called prior to purchase": null,
        "First port of embarkation": null,
        "Second port of embarkation": null,
        "Third port of embarkation": null,
        "Places of call before crossing": null,
        "Number of ports of call before disembarkation": null,
        "First port of disembarkation": {
          data: {
            Name: "Cuba, port unspecified",
            Code: 31399,
            id: 1148
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "Location",
            id: 1148
          }
        },
        "Second port of disembarkation": null,
        "Third port of disembarkation": null,
        "Port at which voyage ended": null,
        "Imputed port where voyage began": {
          data: {
            Name: "Havana",
            Code: 31312,
            id: 1126
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "Location",
            id: 1126
          }
        },
        "Principal port of embarkation": null,
        "Imputed principal place of slave purchase": {
          data: {
            Name: "Africa, port unspecified",
            Code: 60999,
            id: 1904
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "Location",
            id: 1904
          }
        },
        "Principal port of disembarkation": {
          data: {
            Name: "Cuba, port unspecified",
            Code: 31399,
            id: 1148
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "Location",
            id: 1148
          }
        },
        "Imputed principal port of slave disembarkation": {
          data: {
            Name: "Cuba, port unspecified",
            Code: 31399,
            id: 1148
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "Location",
            id: 1148
          }
        },
        id: 1217
      },
      state: "original",
      entityRef: {
        type: "existing",
        schema: "VoyageItinerary",
        id: 1217
      }
    },
    Dates: {
      data: {
        "Length of transoceanic voyage in days": null,
        "Voyage length from home port to disembarkation (days)": 184,
        "Voyage length from last slave embarkation to first disembarkation (days)":
          null,
        "Date of vessel's departure": {
          data: {
            Year: 1831,
            Month: 5,
            Day: 27,
            id: 6182
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "VoyageSparseDate",
            id: 6182
          }
        },
        "Date that embarkation began": null,
        "Date that vessel left last slaving port": null,
        "Date of first disembarkation": {
          data: {
            Year: 1831,
            Month: 11,
            Day: 27,
            id: 6183
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "VoyageSparseDate",
            id: 6183
          }
        },
        "Date vessel departed Africa": null,
        "Date of second disembarkation": null,
        "Date of third disembarkation": null,
        "Date that ship left on return voyage": null,
        "Date when voyage completed": null,
        "Year voyage began": {
          data: {
            Year: 1831,
            Month: null,
            Day: null,
            id: 6184
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "VoyageSparseDate",
            id: 6184
          }
        },
        "Year departed Africa": {
          data: {
            Year: 1831,
            Month: null,
            Day: null,
            id: 6185
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "VoyageSparseDate",
            id: 6185
          }
        },
        "Year of arrival at port of disembarkation": {
          data: {
            Year: 1831,
            Month: null,
            Day: null,
            id: 6186
          },
          state: "original",
          entityRef: {
            type: "existing",
            schema: "VoyageSparseDate",
            id: 6186
          }
        },
        id: 1217
      },
      state: "original",
      entityRef: {
        type: "existing",
        schema: "VoyageDates",
        id: 1217
      }
    },
    Sources: [
      {
        data: {
          voyage_id: 1234,
          Source: {
            data: {
              Title:
                "Irish University Press Series of British Parliamentary Papers: Slave Trade",
              id: 1564
            },
            state: "original",
            entityRef: {
              type: "existing",
              schema: "Voyage Source",
              id: 1564
            }
          },
          "Page range": "IUP,ST,13/A2/49,50",
          id: 78189
        },
        state: "original",
        entityRef: {
          type: "existing",
          schema: "Voyage Source Connection",
          id: 78189
        }
      },
      {
        data: {
          voyage_id: 1234,
          Source: {
            data: {
              Title:
                "Great Britain, <i>Parliamentary Papers</i>:  1777, Accounts and Papers, No 9 1788, XXII  1789, XXIV, XXV, XXVI 1790, XXIX, XXX, XXXI 1790-91, XXXIV 1792, XXXV 1795-96, XLII  1798-99, XLVIII 1799 XLVIII 1801-2, IV  1803-4, X 1806, XII 1813-14, XII 181",
              id: 1996
            },
            state: "original",
            entityRef: {
              type: "existing",
              schema: "Voyage Source",
              id: 1996
            }
          },
          "Page range": "PP,1845,XLIX:593-633",
          id: 120970
        },
        state: "original",
        entityRef: {
          type: "existing",
          schema: "Voyage Source Connection",
          id: 120970
        }
      },
      {
        data: {
          voyage_id: 1234,
          Source: {
            data: {
              Title:
                "Irish University Press Series of British Parliamentary Papers: Slave Trade",
              id: 1564
            },
            state: "original",
            entityRef: {
              type: "existing",
              schema: "Voyage Source",
              id: 1564
            }
          },
          "Page range": null,
          id: 225110
        },
        state: "original",
        entityRef: {
          type: "existing",
          schema: "Voyage Source Connection",
          id: 225110
        }
      },
      {
        data: {
          voyage_id: 1234,
          Source: {
            data: {
              Title:
                "Great Britain, <i>Parliamentary Papers</i>:  1777, Accounts and Papers, No 9 1788, XXII  1789, XXIV, XXV, XXVI 1790, XXIX, XXX, XXXI 1790-91, XXXIV 1792, XXXV 1795-96, XLII  1798-99, XLVIII 1799 XLVIII 1801-2, IV  1803-4, X 1806, XII 1813-14, XII 181",
              id: 1996
            },
            state: "original",
            entityRef: {
              type: "existing",
              schema: "Voyage Source",
              id: 1996
            }
          },
          "Page range": null,
          id: 266326
        },
        state: "original",
        entityRef: {
          type: "existing",
          schema: "Voyage Source Connection",
          id: 266326
        }
      }
    ],
    "Enslavement relations": [
      {
        data: {
          voyage_id: 1234,
          "Relation type": {
            data: {
              "Relation type": "Transportation",
              id: 1
            },
            state: "original",
            entityRef: {
              type: "existing",
              schema: "EnslavementRelationType",
              id: 1
            }
          },
          Place: null,
          Amount: null,
          id: 1955,
          "Enslaved in relation": [],
          "Enslavers in relation": [
            {
              data: {
                relation_id: 1955,
                "Enslaver alias": {
                  data: {
                    Alias: "Arrarte, Juan Bautista",
                    Identity: {
                      data: {
                        "Principal alias": "Arrate, Juan Bautista",
                        "Birth year": null,
                        "Birth month": null,
                        "Birth day": null,
                        "Birth place": null,
                        "Death year": null,
                        "Death month": null,
                        "Death day": null,
                        "Death place": null,
                        "Father name": null,
                        "Father occupation": null,
                        "Mother name": null,
                        "Probate date": null,
                        "Will value (pounds)": null,
                        "Will value (dollars)": null,
                        "Will court": null,
                        "Principal location": null,
                        Notes: null,
                        id: 1000290,
                        Aliases: [
                          {
                            data: {
                              Alias: "Arrarte, Juan Batista de",
                              id: 1000758
                            },
                            state: "original",
                            entityRef: {
                              type: "existing",
                              schema: "EnslaverAlias",
                              id: 1000758
                            }
                          },
                          {
                            data: {
                              Alias: "Arrate, Juan Bautista",
                              id: 1000759
                            },
                            state: "original",
                            entityRef: {
                              type: "existing",
                              schema: "EnslaverAlias",
                              id: 1000759
                            }
                          },
                          {
                            data: {
                              Alias: "Arrarte, Juan Bautista",
                              id: 1000760
                            },
                            state: "original",
                            entityRef: {
                              type: "existing",
                              schema: "EnslaverAlias",
                              id: 1000760
                            }
                          },
                          {
                            data: {
                              Alias: "Arrarte, Juan Bautista",
                              id: 1000761
                            },
                            state: "original",
                            entityRef: {
                              type: "existing",
                              schema: "EnslaverAlias",
                              id: 1000761
                            }
                          },
                          {
                            data: {
                              Alias: "Arrate, Juan Bautista",
                              id: 1000763
                            },
                            state: "original",
                            entityRef: {
                              type: "existing",
                              schema: "EnslaverAlias",
                              id: 1000763
                            }
                          }
                        ]
                      },
                      state: "original",
                      entityRef: {
                        type: "existing",
                        schema: "Enslaver",
                        id: 1000290
                      }
                    },
                    id: 1000761
                  },
                  state: "original",
                  entityRef: {
                    type: "existing",
                    schema: "EnslaverAliasWithIdentity",
                    id: 1000761
                  }
                },
                id: 3178,
                Roles: [
                  {
                    data: {
                      enslaverinrelation_id: 3178,
                      Role: {
                        data: {
                          "Enslaver role": "Captain",
                          id: 1
                        },
                        state: "original",
                        entityRef: {
                          type: "existing",
                          schema: "EnslaverRole",
                          id: 1
                        }
                      },
                      id: 3571
                    },
                    state: "original",
                    entityRef: {
                      type: "existing",
                      schema: "EnslaverRelationRoleConn",
                      id: 3571
                    }
                  }
                ]
              },
              state: "original",
              entityRef: {
                type: "existing",
                schema: "EnslaverInRelation",
                id: 3178
              }
            }
          ]
        },
        state: "original",
        entityRef: {
          type: "existing",
          schema: "EnslavementRelation",
          id: 1955
        }
      }
    ]
  },
  state: "original",
  entityRef: {
    type: "existing",
    schema: "Voyage",
    id: 1234
  }
}

test("deep relational update with ownedList", () => {
  const target = cloneEntity(voyage1234)
  const changes: EntityChange[] = [
    {
      type: "update",
      entityRef: {
        type: "existing",
        schema: "Voyage",
        id: 1234
      },
      changes: [
        {
          kind: "ownedList",
          modified: [
            {
              kind: "owned",
              ownedEntity: {
                data: {},
                state: "lazy",
                entityRef: {
                  type: "existing",
                  schema: "EnslavementRelation",
                  id: 1955
                }
              },
              changes: [
                {
                  kind: "ownedList",
                  modified: [
                    {
                      kind: "owned",
                      ownedEntity: {
                        entityRef: {
                          id: "17473375505203f49685d-b011-476f-a214-81dba288f8bd",
                          schema: "EnslaverInRelation",
                          type: "new"
                        },
                        state: "new",
                        data: {}
                      },
                      changes: [
                        {
                          kind: "linked",
                          property: "EnslaverInRelation_enslaver_alias_id",
                          changed: {
                            entityRef: {
                              id: "d1bcdd0b-bf75-49e1-82ea-efaca936ea08",
                              schema: "EnslaverAliasWithIdentity",
                              type: "new"
                            },
                            state: "new",
                            data: {
                              Alias: "McEnslaver, Badderson",
                              Identity: {
                                entityRef: {
                                  id: "d3968b53-7f01-4f8e-9e13-a5e6ead506a5",
                                  schema: "Enslaver",
                                  type: "new"
                                },
                                data: {
                                  Aliases: [],
                                  "Principal alias": "Bad Enslaver",
                                  "Is natural person": true,
                                  "Birth year": null,
                                  "Birth month": null,
                                  "Birth day": null,
                                  "Birth place": null,
                                  "Death year": null,
                                  "Death month": null,
                                  "Death day": null,
                                  "Death place": null,
                                  "Father name": "",
                                  "Father occupation": "",
                                  "Mother name": "",
                                  "Probate date": "",
                                  "Will value (pounds)": "",
                                  "Will value (dollars)": "",
                                  "Will court": "",
                                  "Principal location": {
                                    entityRef: {
                                      id: "680",
                                      schema: "Location",
                                      type: "existing"
                                    },
                                    state: "lazy",
                                    data: {
                                      Name: "New York",
                                      Code: 20699,
                                      id: 680
                                    }
                                  },
                                  Notes: ""
                                },
                                state: "new"
                              }
                            }
                          }
                        },
                        {
                          kind: "direct",
                          property: "EnslaverInRelation_owner_relation_id",
                          changed: 1955
                        }
                      ]
                    }
                  ],
                  removed: [],
                  property: "EnslavementRelation_Enslavers in relation"
                },
                {
                  kind: "linked",
                  property: "EnslavementRelation_place_id",
                  changed: {
                    entityRef: {
                      id: "2068",
                      schema: "Location",
                      type: "existing"
                    },
                    data: {
                      Name: "At sea",
                      Code: 90719,
                      id: 2068
                    },
                    state: "lazy"
                  }
                }
              ]
            }
          ],
          removed: [],
          property: "Voyage_Enslavement relations"
        }
      ]
    }
  ]
  applyChanges(expandMaterialized(target), changes)
  // Check that the original enslaver is still there and the new one is added
  // (both Alias and Identity).
  const enslavers =
    target.data["Enslavement relations"]![0].data["Enslavers in relation"]
  expect(enslavers[0].data["Enslaver alias"].data["Alias"]).toBe(
    "Arrarte, Juan Bautista"
  )
  expect(enslavers[1].data["Enslaver alias"].data["Alias"]).toBe(
    "McEnslaver, Badderson"
  )
  expect(
    enslavers[1].data["Enslaver alias"].data["Identity"].data["Principal alias"]
  ).toBe("Bad Enslaver")
  // console.dir(target, { depth: null })
})

test("table change", () => {
  const target = cloneEntity(voyage1234)
  const changes: EntityChange[] = [
    {
      type: "update",
      entityRef: {
        type: "existing",
        schema: "Voyage",
        id: 1234
      },
      changes: [
        {
          property: "Voyage_Slave numbers",
          kind: "owned",
          ownedEntity: {
            entityRef: {
              type: "existing",
              schema: "VoyageSlaveNumbers",
              id: 1217
            },
            state: "original",
            data: {}
          },
          changes: [
            {
              kind: "table",
              property: "sn_characteristics",
              changes: {
                num_men_embark_first_port_purchase: 55,
                num_women_embark_first_port_purchase: 44
              }
            }
          ]
        }
      ]
    }
  ]
  applyChanges(expandMaterialized(target), changes)
  const sn = target.data["Slave numbers"] as MaterializedEntity
  expect(sn.data["num_men_embark_first_port_purchase"]).toBe(55)
})

test("sparse date changes", () => {
  const target = cloneEntity(voyage1234)
  const changes: EntityChange[] = [
    {
      type: "update",
      entityRef: {
        type: "existing",
        schema: "Voyage",
        id: 1234
      },
      changes: [
        {
          property: "Voyage_Dates",
          kind: "owned",
          ownedEntity: {
            entityRef: {
              type: "existing",
              schema: "VoyageDates",
              id: 1217
            },
            state: "original",
            data: {}
          },
          changes: [
            {
              kind: "linked",
              property: "VoyageDates_date_departed_africa_sparsedate_id",
              changed: {
                entityRef: {
                  id: "ee2c5a7c-c298-4d77-85d0-45888aa9d8f0",
                  schema: "VoyageSparseDate",
                  type: "new"
                },
                state: "new",
                data: {
                  Year: null,
                  Month: null,
                  Day: null
                }
              },
              linkedChanges: [
                {
                  kind: "direct",
                  property: "VoyageSparseDate_year",
                  changed: 1831
                },
                {
                  kind: "direct",
                  property: "VoyageSparseDate_month",
                  changed: 9
                }
              ]
            }
          ]
        }
      ]
    }
  ]
  applyChanges(expandMaterialized(target), changes)
  const dates = target.data["Dates"] as MaterializedEntity
  const field = AllProperties["VoyageDates_date_departed_africa_sparsedate_id"].label
  const changedDate = dates.data[field] as MaterializedEntity
  expect(changedDate.data["Year"]).toBe(1831)
  expect(changedDate.data["Month"]).toBe(9)
})

/**
 * `voyage1234` is keyed by property *labels*, the same way a materialized
 * entity coming off the API is. Nothing reads the keys this test doesn't
 * touch, so a label rename leaves stale keys sitting in the fixture and the
 * suite stays green while drifting away from the schema. Resolve them all.
 */
test("every key in the voyage fixture resolves to a schema property", () => {
  const stale: string[] = []
  // Table cells are keyed by the backing field `cellField` generates, not by a
  // label, so collect those as valid keys alongside the labels.
  const cellFields = (schema: EntitySchema) => {
    const fields = new Set<string>()
    for (const p of schema.properties) {
      if (p.kind !== "table") continue
      p.columns.forEach((_c, ci) => p.rows.forEach((_r, ri) => fields.add(p.cellField(ci, ri))))
    }
    return fields
  }
  const visit = (schema: EntitySchema, data: EntityData, path: string) => {
    const cells = cellFields(schema)
    for (const [key, value] of Object.entries(data ?? {})) {
      if (key === "id" || cells.has(key)) continue
      const prop = getSchemaProp(schema, key)
      if (prop === undefined) {
        stale.push(`${path}.${key}`)
        continue
      }
      const linked = (prop as { linkedEntitySchema?: string }).linkedEntitySchema
      if (linked === undefined) continue
      if (isMaterializedEntity(value)) visit(getSchema(linked), value.data, `${path}.${key}`)
      else if (isMaterializedEntityArray(value))
        value.forEach((item, i) => visit(getSchema(linked), item.data, `${path}.${key}[${i}]`))
    }
  }
  visit(getSchema(voyage1234.entityRef.schema), voyage1234.data, "voyage1234")
  expect(stale).toEqual([])
})
