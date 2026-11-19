import { prisma } from "../config/database.js";

/**
 * Page copy overrides. The bundled JSON files remain the defaults; this table
 * stores only the keys an administrator has actually changed.
 */
export const pageContentRepository = {
  findOverrides(localeCode, client = prisma) {
    return client.pageContent.findMany({
      where: { localeCode },
      select: { key: true, value: true },
      orderBy: { key: "asc" },
    });
  },

  findOverride(key, localeCode, client = prisma) {
    return client.pageContent.findUnique({
      where: { key_localeCode: { key, localeCode } },
    });
  },

  upsert({ key, localeCode, value, updatedById = null }, client = prisma) {
    return client.pageContent.upsert({
      where: { key_localeCode: { key, localeCode } },
      create: { key, localeCode, value, updatedById },
      update: { value, updatedById },
    });
  },

  deleteKey(key, localeCode, client = prisma) {
    return client.pageContent.deleteMany({ where: { key, localeCode } });
  },

  deleteLocale(localeCode, client = prisma) {
    return client.pageContent.deleteMany({ where: { localeCode } });
  },

  count(localeCode, client = prisma) {
    return client.pageContent.count({ where: { localeCode } });
  },
};
