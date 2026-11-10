import { prisma } from "../config/database.js";

export const userRepository = {
  findById(id, client = prisma) {
    return client.user.findUnique({ where: { id } });
  },

  findByEmail(email, client = prisma) {
    return client.user.findUnique({ where: { email } });
  },

  create(data, client = prisma) {
    return client.user.create({ data });
  },

  findMany({ where = {}, orderBy = { createdAt: "desc" }, skip, take } = {}, client = prisma) {
    return client.user.findMany({ where, orderBy, skip, take });
  },

  count(where = {}, client = prisma) {
    return client.user.count({ where });
  },

  updateRole(id, roleCode, client = prisma) {
    return client.user.update({ where: { id }, data: { roleCode } });
  },

  updateStatus(id, data, client = prisma) {
    return client.user.update({ where: { id }, data });
  },

  markLogin(id, client = prisma) {
    return client.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },
};
