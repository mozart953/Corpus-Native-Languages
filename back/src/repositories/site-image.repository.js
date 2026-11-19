import { prisma } from "../config/database.js";

export const siteImageRepository = {
  findByKey(key, client = prisma) {
    return client.siteImage.findUnique({ where: { id: key } });
  },

  update({ key, data }, client = prisma) {
    return client.siteImage.update({
      where: { id: key },
      data,
    });
  },

  upsert({ key, data }, client = prisma) {
    return client.siteImage.upsert({
      where: { id: key },
      create: { id: key, ...data },
      update: data,
    });
  },

  deleteByKey(key, client = prisma) {
    return client.siteImage.deleteMany({ where: { id: key } });
  },
};
