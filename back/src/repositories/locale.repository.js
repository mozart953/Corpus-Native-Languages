import { prisma } from "../config/database.js";
import { DEFAULT_LOCALE } from "../models/locale.model.js";

/**
 * Locale rows are data, not schema. Adding a language later is an insert, not
 * a migration, which is why every translation lookup goes through this table.
 */
export const localeRepository = {
  listActive(client = prisma) {
    return client.locale.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { code: "asc" }],
    });
  },

  listAll(client = prisma) {
    return client.locale.findMany({
      orderBy: [{ position: "asc" }, { code: "asc" }],
    });
  },

  findByCode(code, client = prisma) {
    return client.locale.findUnique({ where: { code } });
  },

  findDefault(client = prisma) {
    return client.locale.findFirst({
      where: { isDefault: true },
      orderBy: { position: "asc" },
    });
  },

  async resolve(code, client = prisma) {
    if (code) {
      const exact = await localeRepository.findByCode(code, client);
      if (exact?.isActive) return exact;
    }

    const fallback = await localeRepository.findDefault(client);
    if (fallback?.isActive) return fallback;

    return localeRepository.findByCode(DEFAULT_LOCALE, client);
  },
};
