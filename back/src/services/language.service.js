import {
  LANGUAGE_SORT_FIELDS,
  LANGUAGE_STATUSES,
} from "../models/language.model.js";
import { languageRepository } from "../repositories/language.repository.js";
import { toLanguageResponse } from "../presenters/language.presenter.js";
import { slugify } from "../utils/slugify.js";
import { createContentService } from "./content.service.js";

function splitRegions(value) {
  return String(value ?? "")
    .split(",")
    .map((region) => region.trim())
    .filter(Boolean);
}

/**
 * Nested writes for the Region many-to-many. `position` preserves the order
 * the contributor typed, and `connectOrCreate` keeps the Region lookup table
 * deduplicated.
 */
function regionWrites(region) {
  return splitRegions(region).map((name, position) => ({
    position,
    region: {
      connectOrCreate: {
        where: { name },
        create: { name },
      },
    },
  }));
}

export const languageService = createContentService({
  entityType: "language",
  entityLabel: "Language",
  repository: languageRepository,
  presenter: toLanguageResponse,
  sortFields: LANGUAGE_SORT_FIELDS,
  defaultSortField: "name",

  buildPublicFilters: ({ status } = {}) =>
    status && LANGUAGE_STATUSES.includes(status) ? { statusCode: status } : {},

  buildSearch: (q) => [
    { name: { contains: q } },
    { autonym: { contains: q } },
    { regions: { some: { region: { name: { contains: q } } } } },
    { deletionReason: { contains: q } },
  ],

  resolveId: (input) => input.id?.trim() || slugify(input.name),

  buildCreateData: (input, { id }) => ({
    id,
    name: input.name,
    autonym: input.autonym,
    speakers: input.speakers,
    accent: input.accent ?? "#2f8bff",
    statusCode: input.status ?? "active",
    regions: { create: regionWrites(input.region) },
  }),

  buildUpdateData: (input) => {
    const data = {};

    for (const field of ["name", "autonym", "speakers", "accent"]) {
      if (field in input) data[field] = input[field];
    }
    if ("status" in input) data.statusCode = input.status;
    if ("region" in input) {
      data.regions = {
        deleteMany: {},
        create: regionWrites(input.region),
      };
    }

    return data;
  },
});
