import { DataMapping } from "./importer"

const extractSourcePrefixes =
  (d: string) => {
    const values: [prefix: string, suffix: string][] = []
    const original = d
    while (true) {
      const idxSep = d.lastIndexOf(",")
      if (idxSep < 0) {
        break
      }
      d = d.slice(0, idxSep).trim()
      if (d !== "") {
        values.push([d, original.slice(idxSep + 1).trim()])
      }
    }
    if (original.trim() !== "") {
      values.push([original.trim(), ""])
    }
    return values.length > 0
      ? values
      : null
  }

// Main voyage mapping: configure this to map CSV rows to ChangeSets.
export const voyageMapping: DataMapping = {
  kind: "conditional",
  anyNonEmpty: ["voyageid"], // Only process if we have a voyage ID,
  mappings: [
    // Basic voyage properties
    {
      kind: "direct",
      targetField: "Voyage ID",
      header: "voyageid"
    },
    {
      kind: "direct",
      targetField: "Dataset",
      header: "intraamer"
    },
    {
      kind: "linked",
      targetField: "Voyage grouping",
      header: "xmimpflag",
      lookupField: "Code"
    },

    // Voyage Ship data.
    {
      kind: "owned",
      targetField: "Ship",
      importUpdates: [
        {
          kind: "direct",
          targetField: "Name of vessel",
          header: "shipname"
        },
        {
          kind: "linked",
          targetField: "National carrier",
          header: "national",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Construction place",
          header: "placcons",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Registered place",
          header: "placreg",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Rig of vessel",
          header: "rig",
          lookupField: "Code"
        },
        {
          kind: "direct",
          targetField: "Tonnage of vessel",
          header: "tonnage"
        },
        {
          kind: "linked",
          targetField: "Ton type",
          header: "tontype",
          lookupField: "Code"
        },
        {
          kind: "direct",
          targetField: "Guns mounted",
          header: "guns"
        },
        {
          kind: "linked",
          targetField: "Nationality",
          header: "natinimp",
          lookupField: "Code"
        }
      ]
    },

    // Crew
    {
      kind: "owned",
      targetField: "Crew",
      importUpdates: [
        {
          kind: "direct",
          targetField: "Crew at voyage outset",
          header: "crew1"
        },
        {
          kind: "direct",
          targetField: "Crew at departure from last port of slave purchase",
          header: "crew2"
        },
        {
          kind: "direct",
          targetField: "Crew at first landing of captives",
          header: "crew3"
        },
        {
          kind: "direct",
          targetField: "Crew died during complete voyage",
          header: "crewdied"
        }
      ]
    },

    // Outcome
    {
      kind: "owned",
      targetField: "Outcome",
      importUpdates: [
        {
          kind: "linked",
          targetField: "Particular outcome",
          header: "fate",
          lookupField: "Value"
        },
        {
          kind: "linked",
          targetField: "Resistance",
          header: "resistance",
          lookupField: "Value"
        },
        {
          kind: "linked",
          targetField: "Enslaved outcome",
          header: "fate2",
          lookupField: "Value"
        },
        {
          kind: "linked",
          targetField: "Vessel outcome",
          header: "fate3",
          lookupField: "Value"
        },
        {
          kind: "linked",
          targetField: "Owner outcome",
          header: "fate4",
          lookupField: "Value"
        }
      ]
    },

    // Itinerary
    {
      kind: "owned",
      targetField: "Itinerary",
      importUpdates: [
        {
          kind: "linked",
          targetField: "First intended port of embarkation",
          header: "embport",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Second intended port of embarkation",
          header: "embport2",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "First intended port of disembarkation",
          header: "arrport",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Second intended port of disembarkation",
          header: "arrport2",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Port of departure",
          header: "portdep",
          lookupField: "Code"
        },
        {
          kind: "direct",
          targetField: "Number of ports of call prior to buying captives",
          header: "nppretra"
        },
        {
          kind: "linked",
          targetField: "First place of slave purchase",
          header: "plac1tra",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Second place of slave purchase",
          header: "plac2tra",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Third place of slave purchase",
          header: "plac3tra",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Principal place of slave purchase",
          header: "majbuypt",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "First place of slave landing",
          header: "sla1port",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Second place of slave landing",
          header: "adpsale1",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Third place of slave landing",
          header: "adpsale2",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Principal port of slave disembarkation",
          header: "majselpt",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Place at which voyage ended",
          header: "portret",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Imputed port where voyage began",
          header: "ptdepimp",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Imputed principal place of slave purchase",
          header: "mjbyptimp",
          lookupField: "Code"
        },
        {
          kind: "linked",
          targetField: "Imputed principal port of slave disembarkation",
          header: "mjslptimp",
          lookupField: "Code"
        }
      ]
    },

    // Dates

    {
      kind: "owned",
      targetField: "Dates",
      importUpdates: [
        {
          kind: "direct",
          targetField:
            "Voyage length from last slave embarkation to first disembarkation (days)",
          header: "voyage"
        },
        {
          kind: "direct",
          targetField: "Voyage length from home port to disembarkation (days)",
          header: "voy1imp"
        },
        {
          kind: "direct",
          targetField:
            "Voyage length from last slave embarkation to first disembarkation (days)",
          header: "voy2imp"
        },
        {
          kind: "linked",
          targetField: "Year voyage began",
          header: "yeardep",
          lookupField: "",
          createIfMissing: {
            kind: "owned",
            importUpdates: [
              {
                kind: "direct",
                targetField: "Year",
                header: "yeardep"
              }
            ]
          }
        },
        {
          kind: "linked",
          targetField: "Year departed Africa",
          header: "yearaf",
          lookupField: "",
          createIfMissing: {
            kind: "owned",
            importUpdates: [
              {
                kind: "direct",
                targetField: "Year",
                header: "yearaf"
              }
            ]
          }
        },
        {
          kind: "linked",
          targetField: "Year of arrival at port of disembarkation",
          header: "yearam",
          lookupField: "",
          createIfMissing: {
            kind: "owned",
            importUpdates: [
              {
                kind: "direct",
                targetField: "Year",
                header: "yearam"
              }
            ]
          }
        },
        {
          kind: "multiple",
          bindings: [
            {
              $dateHeader: "datedep",
              $targetField: "Date that voyage began"
            },
            {
              $dateHeader: "dateend",
              $targetField: "Date on which slave voyage completed"
            },
            {
              $dateHeader: "datebuy",
              $targetField: "Date that slave purchase began"
            },
            {
              $dateHeader: "dateleftafr",
              $targetField: "Date vessel departed Africa"
            },
            {
              $dateHeader: "dateland1",
              $targetField: "Date of first disembarkation of captives"
            },
            {
              $dateHeader: "dateland2",
              $targetField: "Date of second disembarkation of captives"
            },
            {
              $dateHeader: "dateland3",
              $targetField: "Date of third disembarkation of captives"
            },
            {
              $dateHeader: "datedepam",
              $targetField: "Date that vessel left last slaving port"
            }
          ],
          mappings: [
            {
              kind: "linked",
              targetField: "$targetField",
              header: "$dateHeader",
              lookupField: "",
              createIfMissing: {
                kind: "owned",
                importUpdates: [
                  {
                    kind: "direct",
                    targetField: "Year",
                    header: "$dateHeader",
                    formula: (d: string) => {
                      if (d.length < 4) {
                        return null
                      }
                      const m = d.match(/^(\d{4})/)
                      return m ? m[1] : null
                    }
                  },
                  {
                    kind: "direct",
                    targetField: "Month",
                    header: "$dateHeader",
                    formula: (d: string) => {
                      if (d.length < 4) {
                        return null
                      }
                      const m = d.match(/^\d{4}-(\d{2})/)
                      return m ? m[1] : null
                    }
                  },
                  {
                    kind: "direct",
                    targetField: "Day",
                    header: "$dateHeader",
                    formula: (d: string) => {
                      if (d.length < 4) {
                        return null
                      }
                      const m = d.match(/^\d{4}-\d{2}-(\d{2})/)
                      return m ? m[1] : null
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    },

    // Slave numbers

    {
      kind: "owned",
      targetField: "Slave numbers",
      importUpdates: [
        {
          kind: "direct",
          targetField: "Captive deaths before leaving Africa",
          header: "sladafri"
        },
        {
          kind: "direct",
          targetField: "Captive deaths between Africa and Americas",
          header: "sladvoy"
        },
        {
          kind: "direct",
          targetField: "Captive deaths between arrival and sale",
          header: "sladamer"
        },
        {
          kind: "direct",
          targetField: "Captives intended from first port of purchase",
          header: "slintend"
        },
        {
          kind: "direct",
          targetField: "Captives intended from second port of purchase",
          header: "slinten2"
        },
        {
          kind: "direct",
          targetField: "Number of captives carried from first port of purchase",
          header: "ncar13"
        },
        {
          kind: "direct",
          targetField:
            "Number of captives carried from second port of purchase",
          header: "ncar15"
        },
        {
          kind: "direct",
          targetField: "Number of captives carried from third port of purchase",
          header: "ncar17"
        },
        {
          kind: "direct",
          targetField: "Total captives purchased",
          header: "tslavesp"
        },
        {
          kind: "direct",
          targetField: "Total captives on board at departure from last port",
          header: "tslavesd"
        },
        {
          kind: "direct",
          targetField: "Total captives arrived at first port of disembarkation",
          header: "slaarriv"
        },
        {
          kind: "direct",
          targetField: "Number of captives disembarked at first place",
          header: "slas32"
        },
        {
          kind: "direct",
          targetField: "Number of captives disembarked at second place",
          header: "slas36"
        },
        {
          kind: "direct",
          targetField: "Number of captives disembarked at third place",
          header: "slas39"
        },
        {
          kind: "direct",
          targetField: "Total captives embarked (imputed)",
          header: "slaximp"
        },
        {
          kind: "direct",
          targetField: "Total captives disembarked (imputed)",
          header: "slamimp"
        },
        {
          kind: "direct",
          targetField: "Sterling cash price in Jamaica (imputed)",
          header: "jamcaspr"
        },
        {
          kind: "direct",
          targetField: "Imputed number of captive deaths during Middle Passage",
          header: "vymrtimp"
        },

        // Table entries for characteristics (MEN1, WOMEN1, etc.)
        {
          kind: "table",
          targetField: "Slave characteristics",
          mappings: [
            {
              targetField: "num_men_embark_first_port_purchase",
              header: "men1"
            },
            {
              targetField: "num_women_embark_first_port_purchase",
              header: "women1"
            },
            {
              targetField: "num_boy_embark_first_port_purchase",
              header: "boy1"
            },
            {
              targetField: "num_girl_embark_first_port_purchase",
              header: "girl1"
            },
            {
              targetField: "num_adult_embark_first_port_purchase",
              header: "adult1"
            },
            {
              targetField: "num_child_embark_first_port_purchase",
              header: "child1"
            },
            {
              targetField: "num_infant_embark_first_port_purchase",
              header: "infant1"
            },
            {
              targetField: "num_males_embark_first_port_purchase",
              header: "male1"
            },
            {
              targetField: "num_females_embark_first_port_purchase",
              header: "female1"
            },
            {
              targetField: "num_men_died_middle_passage",
              header: "men2"
            },
            {
              targetField: "num_women_died_middle_passage",
              header: "women2"
            },
            {
              targetField: "num_boy_died_middle_passage",
              header: "boy2"
            },
            {
              targetField: "num_girl_died_middle_passage",
              header: "girl2"
            },
            {
              targetField: "num_adult_died_middle_passage",
              header: "adult2"
            },
            {
              targetField: "num_child_died_middle_passage",
              header: "child2"
            },
            {
              targetField: "num_infant_died_middle_passage",
              header: "infant2"
            },
            {
              targetField: "num_males_died_middle_passage",
              header: "male2"
            },
            {
              targetField: "num_females_died_middle_passage",
              header: "female2"
            },
            {
              targetField: "num_men_disembark_first_landing",
              header: "men3"
            },
            {
              targetField: "num_women_disembark_first_landing",
              header: "women3"
            },
            {
              targetField: "num_boy_disembark_first_landing",
              header: "boy3"
            },
            {
              targetField: "num_girl_disembark_first_landing",
              header: "girl3"
            },
            {
              targetField: "num_adult_disembark_first_landing",
              header: "adult3"
            },
            {
              targetField: "num_child_disembark_first_landing",
              header: "child3"
            },
            {
              targetField: "num_infant_disembark_first_landing",
              header: "infant3"
            },
            {
              targetField: "num_males_disembark_first_landing",
              header: "male3"
            },
            {
              targetField: "num_females_disembark_first_landing",
              header: "female3"
            },
            {
              targetField: "num_men_embark_second_port_purchase",
              header: "men4"
            },
            {
              targetField: "num_women_embark_second_port_purchase",
              header: "women4"
            },
            {
              targetField: "num_boy_embark_second_port_purchase",
              header: "boy4"
            },
            {
              targetField: "num_girl_embark_second_port_purchase",
              header: "girl4"
            },
            {
              targetField: "num_adult_embark_second_port_purchase",
              header: "adult4"
            },
            {
              targetField: "num_child_embark_second_port_purchase",
              header: "child4"
            },
            {
              targetField: "num_infant_embark_second_port_purchase",
              header: "infant4"
            },
            {
              targetField: "num_males_embark_second_port_purchase",
              header: "male4"
            },
            {
              targetField: "num_females_embark_second_port_purchase",
              header: "female4"
            },
            {
              targetField: "num_men_embark_third_port_purchase",
              header: "men5"
            },
            {
              targetField: "num_women_embark_third_port_purchase",
              header: "women5"
            },
            {
              targetField: "num_boy_embark_third_port_purchase",
              header: "boy5"
            },
            {
              targetField: "num_girl_embark_third_port_purchase",
              header: "girl5"
            },
            {
              targetField: "num_adult_embark_third_port_purchase",
              header: "adult5"
            },
            {
              targetField: "num_child_embark_third_port_purchase",
              header: "child5"
            },
            {
              targetField: "num_infant_embark_third_port_purchase",
              header: "infant5"
            },
            {
              targetField: "num_males_embark_third_port_purchase",
              header: "male5"
            },
            {
              targetField: "num_females_embark_third_port_purchase",
              header: "female5"
            },
            {
              targetField: "num_men_disembark_second_landing",
              header: "men6"
            },
            {
              targetField: "num_women_disembark_second_landing",
              header: "women6"
            },
            {
              targetField: "num_boy_disembark_second_landing",
              header: "boy6"
            },
            {
              targetField: "num_girl_disembark_second_landing",
              header: "girl6"
            },
            {
              targetField: "num_adult_disembark_second_landing",
              header: "adult6"
            },
            {
              targetField: "num_child_disembark_second_landing",
              header: "child6"
            },
            {
              targetField: "num_infant_disembark_second_landing",
              header: "infant6"
            },
            {
              targetField: "num_males_disembark_second_landing",
              header: "male6"
            },
            {
              targetField: "num_females_disembark_second_landing",
              header: "female6"
            }
          ]
        },

        // Imputed characteristics - back to descriptive labels for direct fields
        {
          kind: "direct",
          targetField: "Total captives embarked with age identified",
          header: "slavema1"
        },
        {
          kind: "direct",
          targetField: "Total captives embarked with gender identified",
          header: "slavemx1"
        },
        {
          kind: "direct",
          targetField: "Total captives landed with age identified",
          header: "slavema3"
        },
        {
          kind: "direct",
          targetField: "Total captives landed with gender identified",
          header: "slavemx3"
        },
        {
          kind: "direct",
          targetField:
            "Total captives identified by age at departure or arrival",
          header: "slavema7"
        },
        {
          kind: "direct",
          targetField:
            "Total captives identified by gender at departure or arrival",
          header: "slavemx7"
        },
        {
          kind: "direct",
          targetField:
            "Imputed number of captives embarked for mortality calculation",
          header: "tslmtimp"
        },
        {
          kind: "direct",
          targetField: "Total captives embarked with age and gender identified",
          header: "slavmax1"
        },
        {
          kind: "direct",
          targetField:
            "Total captives identified by age and gender among landed",
          header: "slavmax3"
        },
        {
          kind: "direct",
          targetField:
            "Total captives identified by age and gender at departure or arrival",
          header: "slavmax7"
        },
        {
          kind: "direct",
          targetField: "Percentage of boys among embarked captives",
          header: "boyrat1"
        },
        {
          kind: "direct",
          targetField: "Child ratio among embarked captives",
          header: "chilrat1"
        },
        {
          kind: "direct",
          targetField: "Percentage of girls among embarked captives",
          header: "girlrat1"
        },
        {
          kind: "direct",
          targetField: "Male ratio among embarked captives",
          header: "malrat1"
        },
        {
          kind: "direct",
          targetField: "Percentage of men among embarked captives",
          header: "menrat1"
        },
        {
          kind: "direct",
          targetField: "Percentage of women among embarked captives",
          header: "womrat1"
        },
        {
          kind: "direct",
          targetField: "Percentage of boys among landed captives",
          header: "boyrat3"
        },
        {
          kind: "direct",
          targetField: "Child ratio among landed captives",
          header: "chilrat3"
        },
        {
          kind: "direct",
          targetField: "Percentage of girls among landed captives",
          header: "girlrat3"
        },
        {
          kind: "direct",
          targetField: "Male ratio among landed captives",
          header: "malrat3"
        },
        {
          kind: "direct",
          targetField: "Percentage of men among landed captives",
          header: "menrat3"
        },
        {
          kind: "direct",
          targetField: "Percentage of women among landed captives",
          header: "womrat3"
        },
        {
          kind: "direct",
          targetField: "Percentage men on voyage",
          header: "menrat7"
        },
        {
          kind: "direct",
          targetField: "Percentage women on voyage",
          header: "womrat7"
        },
        {
          kind: "direct",
          targetField: "Percentage boy on voyage",
          header: "boyrat7"
        },
        {
          kind: "direct",
          targetField: "Percentage girl on voyage",
          header: "girlrat7"
        },
        {
          kind: "direct",
          targetField: "Percentage male on voyage",
          header: "malrat7"
        },
        {
          kind: "direct",
          targetField: "Percentage children on voyage",
          header: "chilrat7"
        },
        {
          kind: "direct",
          targetField: "Imputed mortality ratio",
          header: "vymrtrat"
        },

        // Table entries for imputed characteristics
        {
          kind: "table",
          targetField: "Slave characteristics (imputed)",
          mappings: [
            {
              targetField: "imp_num_adult_embarked",
              header: "adlt1imp"
            },
            {
              targetField: "imp_num_children_embarked",
              header: "chil1imp"
            },
            {
              targetField: "imp_num_male_embarked",
              header: "male1imp"
            },
            {
              targetField: "imp_num_female_embarked",
              header: "feml1imp"
            },
            {
              targetField: "imp_adult_death_middle_passage",
              header: "adlt2imp"
            },
            {
              targetField: "imp_child_death_middle_passage",
              header: "chil2imp"
            },
            {
              targetField: "imp_male_death_middle_passage",
              header: "male2imp"
            },
            {
              targetField: "imp_female_death_middle_passage",
              header: "feml2imp"
            },
            {
              targetField: "imp_num_adult_landed",
              header: "adlt3imp"
            },
            {
              targetField: "imp_num_child_landed",
              header: "chil3imp"
            },
            {
              targetField: "imp_num_male_landed",
              header: "male3imp"
            },
            {
              targetField: "imp_num_female_landed",
              header: "feml3imp"
            },
            {
              targetField: "imp_num_men_total",
              header: "men7"
            },
            {
              targetField: "imp_num_women_total",
              header: "women7"
            },
            {
              targetField: "imp_num_boy_total",
              header: "boy7"
            },
            {
              targetField: "imp_num_girl_total",
              header: "girl7"
            },
            {
              targetField: "imp_num_adult_total",
              header: "adult7"
            },
            {
              targetField: "imp_num_child_total",
              header: "child7"
            },
            {
              targetField: "imp_num_males_total",
              header: "male7"
            },
            {
              targetField: "imp_num_females_total",
              header: "female7"
            }
          ]
        }
      ]
    },

    // Voyage sources
    {
      kind: "multiple",
      bindings: [
        {
          $sourceHeader: "sourcea"
        },
        {
          $sourceHeader: "sourceb"
        },
        {
          $sourceHeader: "sourcec"
        },
        {
          $sourceHeader: "sourced"
        },
        {
          $sourceHeader: "sourcee"
        },
        {
          $sourceHeader: "sourcef"
        },
        {
          $sourceHeader: "sourceg"
        },
        {
          $sourceHeader: "sourceh"
        },
        {
          $sourceHeader: "sourcei"
        },
        {
          $sourceHeader: "sourcej"
        },
        {
          $sourceHeader: "sourcek"
        },
        {
          $sourceHeader: "sourcel"
        },
        {
          $sourceHeader: "sourcem"
        }
      ],
      mappings: [
        {
          kind: "ownedList",
          targetField: "Sources",
          addedToList: [
            {
              kind: "owned",
              importUpdates: [
                {
                  kind: "linked",
                  targetField: "Source",
                  header: "$sourceHeader",
                  lookupField: "Short reference.Name",
                  lookupFormula: (d: string) => {
                    const values = extractSourcePrefixes(d)
                    return values ? values.map(([prefix,]) => prefix) : null
                  }
                },
                {
                  kind: "direct",
                  targetField: "Page range",
                  header: "$sourceHeader",
                  formula: (d: string, ctx?: Record<string, string>) => {
                    const values = extractSourcePrefixes(d)
                    if (values && ctx && ctx["__lookup__Source"]) {
                      const lookupValue = ctx["__lookup__Source"]
                      const match = values.find (([prefix,]) => prefix === lookupValue)
                      return match ? match[1] : null
                    }
                    return null
                  }
                }
              ]
            }
          ]
        }
      ]
    },

    // Generate EnslaverRelationship changes with deeply nested entries for
    // each Enslaver with its role. Both aliases and identities are created if no
    // match is EntityNotFoundError.

    {
      kind: "conditional",
      anyNonEmpty: [
        "ownera",
        "ownerb",
        "ownerc",
        "ownerd",
        "ownere",
        "captaina",
        "captainb",
        "captainc"
      ],
      mappings: [
        {
          targetField: "Enslavement relations",
          kind: "ownedList",
          addedToList: [
            {
              kind: "owned",
              importUpdates: [
                {
                  kind: "const",
                  targetField: "Relation type",
                  mode: "linked",
                  value: 1 // 1 => Transportation
                },
                {
                  kind: "multiple",
                  bindings: [
                    {
                      $enslaver: "ownera",
                      $enslaverRoleId: "4"
                    },
                    {
                      $enslaver: "ownerb",
                      $enslaverRoleId: "4"
                    },
                    {
                      $enslaver: "ownerc",
                      $enslaverRoleId: "4"
                    },
                    {
                      $enslaver: "ownerd",
                      $enslaverRoleId: "4"
                    },
                    {
                      $enslaver: "ownere",
                      $enslaverRoleId: "4"
                    },
                    {
                      $enslaver: "captaina",
                      $enslaverRoleId: "1"
                    },
                    {
                      $enslaver: "captainb",
                      $enslaverRoleId: "1"
                    },
                    {
                      $enslaver: "captainc",
                      $enslaverRoleId: "1"
                    }
                  ],
                  mappings: [
                    {
                      kind: "conditional",
                      anyNonEmpty: ["$enslaver"],
                      mappings: [
                        {
                          kind: "ownedList",
                          targetField: "Enslavers in relation",
                          addedToList: [
                            {
                              kind: "owned",
                              importUpdates: [
                                {
                                  kind: "linked",
                                  targetField: "Enslaver alias",
                                  header: "$enslaver",
                                  lookupField: "alias",
                                  createIfMissing: {
                                    kind: "owned",
                                    canonicalId: [
                                      {
                                        kind: "const",
                                        value: "CanonicalEnslaverAliasId_"
                                      },
                                      {
                                        kind: "direct",
                                        header: "$enslaver"
                                      }
                                    ],
                                    importUpdates: [
                                      {
                                        kind: "direct",
                                        targetField: "Alias",
                                        header: "$enslaver"
                                      },
                                      {
                                        kind: "linked",
                                        targetField: "Identity",
                                        header: "$enslaver",
                                        lookupField: "Principal alias",
                                        createIfMissing: {
                                          kind: "owned",
                                          canonicalId: [
                                            {
                                              kind: "const",
                                              value:
                                                "CanonicalEnslaverIdentityId_"
                                            },
                                            {
                                              kind: "direct",
                                              header: "$enslaver"
                                            }
                                          ],
                                          importUpdates: [
                                            {
                                              kind: "direct",
                                              targetField: "Principal alias",
                                              header: "$enslaver"
                                            }
                                          ]
                                        }
                                      }
                                    ]
                                  }
                                },
                                {
                                  kind: "ownedList",
                                  targetField: "Roles",
                                  addedToList: [
                                    {
                                      kind: "owned",
                                      importUpdates: [
                                        {
                                          kind: "const",
                                          mode: "linked",
                                          targetField: "Role",
                                          value: "$enslaverRoleId"
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },

    // Ignored columns

    {
      kind: "ignored",
      headers: [
        "constreg",
        "regisreg",
        "regem1",
        "regem2",
        "regarr",
        "regdis1",
        "regdis2",
        "regdis3",
        "majbyimp",
        "majbyimp1",
        "mjselimp",
        "mjselimp1"
      ],
      reason:
        "The region is inferred from the place (which could be e.g., '<Region name>, port unspecified')"
    },
    {
      kind: "ignored",
      headers: ["voycount", "ncartot", "slastot"],
      reason: "These are not codebook variables (2024-12-17)"
    },
    {
      kind: "ignored",
      headers: ["year5", "year10", "year25", "year100"],
      reason: "These are trivially obtained from the year"
    },
    {
      kind: "ignored",
      headers: [
        "datedepc",
        "d1slatrc",
        "datarr34",
        "datarr38",
        "datarr41",
        "dlslatrc",
        "ddepamc",
        "datarr45"
      ],
      reason:
        "This date component is found as part of a sparse date in a different column"
    }
  ]
}
