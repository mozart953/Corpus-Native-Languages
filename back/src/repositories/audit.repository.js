import { prisma } from "../config/database.js";

export const auditRepository = {
  create(data, client = prisma) {
    return client.auditLog.create({ data });
  },

  findMany({ where = {}, orderBy = { createdAt: "desc" }, skip, take } = {}, client = prisma) {
    return client.auditLog.findMany({ where, orderBy, skip, take });
  },

  count(where = {}, client = prisma) {
    return client.auditLog.count({ where });
  },
};
