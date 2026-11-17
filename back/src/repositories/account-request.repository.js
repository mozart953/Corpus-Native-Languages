import { prisma } from "../config/database.js";
import { ACCOUNT_REQUEST_STATUSES } from "../models/account.model.js";

// Admin views need the requester's identity; self-service views can reuse the
// same shape so the frontend has one account-request type.
const includeRelations = {
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      roleCode: true,
      statusCode: true,
    },
  },
  resolvedBy: {
    select: { id: true, username: true, email: true },
  },
};

export const accountRequestRepository = {
  create(data, client = prisma) {
    return client.accountChangeRequest.create({
      data,
      include: includeRelations,
    });
  },

  findById(id, client = prisma) {
    return client.accountChangeRequest.findUnique({
      where: { id },
      include: includeRelations,
    });
  },

  findOpenByUserId(userId, client = prisma) {
    return client.accountChangeRequest.findFirst({
      where: { userId, statusCode: ACCOUNT_REQUEST_STATUSES.PENDING },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: includeRelations,
    });
  },

  findManyByUserId(userId, client = prisma) {
    return client.accountChangeRequest.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: includeRelations,
    });
  },

  findMany(
    { where = {}, orderBy = [{ createdAt: "desc" }, { id: "desc" }], skip, take } = {},
    client = prisma,
  ) {
    return client.accountChangeRequest.findMany({
      where,
      orderBy,
      skip,
      take,
      include: includeRelations,
    });
  },

  count(where = {}, client = prisma) {
    return client.accountChangeRequest.count({ where });
  },

  resolve(id, { statusCode, resolvedById, resolutionNote }, client = prisma) {
    return client.accountChangeRequest.update({
      where: { id },
      data: {
        statusCode,
        resolvedById: resolvedById ?? null,
        resolvedAt: new Date(),
        resolutionNote: resolutionNote ?? null,
      },
      include: includeRelations,
    });
  },
};
