import { prisma } from "../config/database.js";
import { REVIEW_STATES } from "../models/language.model.js";

const languageSelection = {
  select: {
    id: true,
    name: true,
    autonym: true,
    reviewState: true,
    deletedAt: true,
  },
};

export const wordRepository = {
  findMany({ where = {}, orderBy = { createdAt: "desc" }, skip, take } = {}, client = prisma) {
    return client.word.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { language: languageSelection },
    });
  },

  count(where = {}, client = prisma) {
    return client.word.count({ where });
  },

  findById(id, client = prisma) {
    return client.word.findUnique({
      where: { id },
      include: { language: languageSelection },
    });
  },

  create(data, client = prisma) {
    return client.word.create({
      data,
      include: { language: languageSelection },
    });
  },

  update(id, data, client = prisma) {
    return client.word.update({
      where: { id },
      data,
      include: { language: languageSelection },
    });
  },

  softDelete(id, { deletedById, reason }, client = prisma) {
    return client.word.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: deletedById ?? null,
        deletionReason: reason ?? null,
        reviewState: REVIEW_STATES.REMOVED,
        verified: false,
        removalRequestedAt: null,
        removalRequestedById: null,
        removalRequestReason: null,
      },
      include: { language: languageSelection },
    });
  },

  restore(id, client = prisma) {
    return client.word.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
        deletionReason: null,
        reviewState: REVIEW_STATES.PENDING,
        verified: false,
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
        removalRequestedAt: null,
        removalRequestedById: null,
        removalRequestReason: null,
      },
      include: { language: languageSelection },
    });
  },

  // A contributor moving their own draft to the private trash keeps the draft
  // state so it is never confused with admin-removed content.
  discardDraft(id, { deletedById, reason }, client = prisma) {
    return client.word.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: deletedById ?? null,
        deletionReason: reason ?? null,
        verified: false,
      },
      include: { language: languageSelection },
    });
  },

  restoreDraft(id, client = prisma) {
    return client.word.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
        deletionReason: null,
      },
      include: { language: languageSelection },
    });
  },

  setRemovalRequest(id, { actorId, reason }, client = prisma) {
    return client.word.update({
      where: { id },
      data: {
        removalRequestedAt: new Date(),
        removalRequestedById: actorId,
        removalRequestReason: reason ?? null,
      },
      include: { language: languageSelection },
    });
  },

  clearRemovalRequest(id, client = prisma) {
    return client.word.update({
      where: { id },
      data: {
        removalRequestedAt: null,
        removalRequestedById: null,
        removalRequestReason: null,
      },
      include: { language: languageSelection },
    });
  },
};
