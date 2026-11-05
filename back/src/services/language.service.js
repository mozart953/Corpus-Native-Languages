import { prisma } from "../config/database.js";
import { languageRepository } from "../repositories/language.repository.js";
import {
  LANGUAGE_STATUSES,
  LANGUAGE_SORT_FIELDS,
  REVIEW_STATES,
  toLanguageResponse,
} from "../models/language.model.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta } from "../utils/pagination.js";
import { slugify } from "../utils/slugify.js";
import { auditService } from "./audit.service.js";

const PUBLIC_WHERE = {
  reviewState: REVIEW_STATES.APPROVED,
  deletedAt: null,
};

function requireActor(actor) {
  if (!actor) throw ApiError.unauthorized();
}

function assertCanEdit(existing, actor) {
  if (actor.role === "admin" || actor.role === "reviewer") return;

  if (existing.createdById !== actor.id) {
    throw ApiError.forbidden(
      "Contributors can only edit entries they created. Ask a reviewer or admin to change this one.",
    );
  }
}

function orderByFrom({ sort, direction }) {
  const field = LANGUAGE_SORT_FIELDS[sort] ?? "name";
  return { [field]: direction === "desc" ? "desc" : "asc" };
}

export const languageService = {
  async listPublic({ page, limit, q, status, sort, direction } = {}) {
    const pagination = getPagination({ page, limit });
    const where = { ...PUBLIC_WHERE };

    if (status && LANGUAGE_STATUSES.includes(status)) where.status = status;

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { autonym: { contains: q } },
        { region: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      languageRepository.findMany({
        where,
        orderBy: orderByFrom({ sort, direction }),
        skip: pagination.skip,
        take: pagination.take,
      }),
      languageRepository.count(where),
    ]);

    return {
      data: rows.map(toLanguageResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async getPublic(id) {
    const language = await languageRepository.findById(id);
    if (
      !language ||
      language.deletedAt ||
      language.reviewState !== REVIEW_STATES.APPROVED
    ) {
      throw ApiError.notFound("Language not found.");
    }
    return { data: toLanguageResponse(language) };
  },

  async listMine(actor, { page, limit } = {}) {
    requireActor(actor);
    const pagination = getPagination({ page, limit });
    const where = { createdById: actor.id, deletedAt: null };

    const [rows, total] = await Promise.all([
      languageRepository.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      languageRepository.count(where),
    ]);

    return {
      data: rows.map(toLanguageResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async create(input, actor) {
    requireActor(actor);

    const id = input.id?.trim() || slugify(input.name);
    if (!id) throw ApiError.badRequest("A language id or name is required.");

    const existing = await languageRepository.findById(id);
    if (existing) {
      throw ApiError.conflict("A language with that id already exists.");
    }

    const isAdmin = actor.role === "admin";

    const created = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.create(
        {
          id,
          name: input.name,
          autonym: input.autonym,
          region: input.region,
          speakers: input.speakers,
          words: input.words ?? 0,
          status: input.status ?? "active",
          accent: input.accent ?? "#2f8bff",
          reviewState: isAdmin ? REVIEW_STATES.APPROVED : REVIEW_STATES.PENDING,
          verified: false,
          createdById: actor.id,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "language",
          entityId: language.id,
          action: isAdmin ? "created_approved" : "submitted",
          toState: language.reviewState,
          actor,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(created) };
  },

  async update(id, payload, actor) {
    requireActor(actor);

    const existing = await languageRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Language not found.");

    assertCanEdit(existing, actor);

    const isAdmin = actor.role === "admin";
    const nextState = isAdmin ? existing.reviewState : REVIEW_STATES.PENDING;

    const { id: _ignored, ...fields } = payload;

    const updated = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.update(
        id,
        {
          ...fields,
          reviewState: nextState,
          verified: isAdmin ? existing.verified : false,
          rejectionReason: isAdmin ? existing.rejectionReason : null,
          reviewedById: isAdmin ? existing.reviewedById : null,
          reviewedAt: isAdmin ? existing.reviewedAt : null,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "language",
          entityId: id,
          action: isAdmin ? "updated" : "updated_pending",
          fromState: existing.reviewState,
          toState: nextState,
          actor,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(updated) };
  },

  async review(id, { decision, comment }, actor) {
    requireActor(actor);

    if (!["reviewer", "admin"].includes(actor.role)) {
      throw ApiError.forbidden("Only reviewers and admins can review content.");
    }

    const existing = await languageRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Language not found.");

    const isAdmin = actor.role === "admin";

    if (!isAdmin && existing.reviewState === REVIEW_STATES.APPROVED) {
      throw ApiError.forbidden("Only an admin can unpublish approved content.");
    }

    let nextState;
    if (decision === "approve") {
      nextState = isAdmin ? REVIEW_STATES.APPROVED : REVIEW_STATES.REVIEWER_APPROVED;
    } else {
      nextState = REVIEW_STATES.REJECTED;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.update(
        id,
        {
          reviewState: nextState,
          verified: nextState === REVIEW_STATES.APPROVED,
          rejectionReason:
            decision === "reject" ? comment || "Rejected during review." : null,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "language",
          entityId: id,
          action:
            decision === "approve"
              ? isAdmin
                ? "approved"
                : "reviewer_approved"
              : "rejected",
          fromState: existing.reviewState,
          toState: nextState,
          actor,
          reason: comment,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(updated) };
  },

  async remove(id, { reason } = {}, actor) {
    requireActor(actor);
    if (actor.role !== "admin") {
      throw ApiError.forbidden("Only an admin can remove content.");
    }

    const existing = await languageRepository.findById(id);
    if (!existing) throw ApiError.notFound("Language not found.");
    if (existing.deletedAt) {
      throw ApiError.conflict("That language is already logically removed.");
    }

    const removed = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.softDelete(
        id,
        { deletedById: actor.id, reason },
        tx,
      );

      await auditService.record(
        {
          entityType: "language",
          entityId: id,
          action: "removed",
          fromState: existing.reviewState,
          toState: REVIEW_STATES.REMOVED,
          actor,
          reason,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(removed) };
  },

  async restore(id, actor) {
    requireActor(actor);
    if (actor.role !== "admin") {
      throw ApiError.forbidden("Only an admin can restore content.");
    }

    const existing = await languageRepository.findById(id);
    if (!existing) throw ApiError.notFound("Language not found.");
    if (!existing.deletedAt) {
      throw ApiError.conflict("That language is not removed.");
    }

    const restored = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.restore(id, tx);

      await auditService.record(
        {
          entityType: "language",
          entityId: id,
          action: "restored",
          fromState: REVIEW_STATES.REMOVED,
          toState: language.reviewState,
          actor,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(restored) };
  },
};
