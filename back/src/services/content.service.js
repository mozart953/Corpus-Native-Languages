import { prisma } from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta } from "../utils/pagination.js";
import {
  REVIEW_STATES,
  REMOVAL_STATUSES,
} from "../models/content.model.js";
import { auditService } from "./audit.service.js";
import { contentHistory } from "./content-history.service.js";
import { removalRequestRepository } from "../repositories/removal-request.repository.js";
import {
  requireActor,
  isAdmin,
  isModerator,
  assertCanEdit,
  creationState,
  creationAction,
  stateAfterEdit,
  reviewStateFor,
  reviewActionFor,
} from "./content-workflow.js";

/**
 * Builds the service for one content entity (language or word).
 *
 * The factory owns the shared moderation workflow: listing, drafts, submit,
 * review, soft delete/restore and removal requests. Entity-specific concerns
 * (nested writes, validation, public visibility, search) are injected through
 * the config so both services stay small and consistent.
 */
export function createContentService({
  entityType,
  entityLabel,
  repository,
  presenter,
  sortFields,
  defaultSortField = "createdAt",
  buildPublicWhere = () => ({}),
  buildPublicFilters = () => ({}),
  buildSearch,
  buildRemovedSearch = buildSearch,
  prepareCreate,
  buildCreateData,
  prepareUpdate,
  buildUpdateData,
  isPubliclyVisible = () => true,
  removalRequestEntityFilter,
  queueLanguageFilter,
  resolveId = (input) => input.id?.trim() || null,
  assertCanSubmit,
}) {
  const label = entityLabel.toLowerCase();
  const notFound = () => ApiError.notFound(`${entityLabel} not found.`);

  function orderByFrom({ sort, direction } = {}) {
    const field = sortFields[sort] ?? defaultSortField;
    return { [field]: direction === "desc" ? "desc" : "asc" };
  }

  async function presentRows(rows, client, { locale } = {}) {
    const decorated = await contentHistory.decorate(entityType, rows, client);
    return decorated.map((row) => presenter(row, { locale }));
  }

  async function presentOne(row, client, { locale } = {}) {
    const decorated = await contentHistory.decorateOne(entityType, row, client);
    return presenter(decorated, { locale });
  }

  async function listWithWhere({ where, orderBy, page, limit, locale }) {
    const pagination = getPagination({ page, limit });
    const [rows, total] = await Promise.all([
      repository.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      repository.count(where),
    ]);

    return {
      data: await presentRows(rows, undefined, { locale }),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  }

  function recordDecision(entityId, { stateCode, reviewerId = null, comment = null }, client) {
    return contentHistory.recordDecision(
      { entityType, entityId, stateCode, reviewerId, comment },
      client,
    );
  }

  return {
    async listPublic({ page, limit, q, sort, direction, locale, ...filters } = {}) {
      const where = {
        reviewStateCode: REVIEW_STATES.APPROVED,
        deletedAt: null,
        ...buildPublicWhere(filters),
        ...buildPublicFilters(filters),
      };

      if (q && buildSearch) where.OR = buildSearch(q, filters);

      return listWithWhere({
        where,
        orderBy: orderByFrom({ sort, direction }),
        page,
        limit,
        locale,
      });
    },

    async getPublic(id, { locale } = {}) {
      const row = await repository.findById(id);
      if (
        !row ||
        row.deletedAt ||
        row.reviewStateCode !== REVIEW_STATES.APPROVED ||
        !isPubliclyVisible(row)
      ) {
        throw notFound();
      }
      return { data: await presentOne(row, undefined, { locale }) };
    },

    async listMine(actor, { page, limit } = {}) {
      requireActor(actor);
      return listWithWhere({
        where: { createdById: actor.id, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        page,
        limit,
      });
    },

    async listTrash(actor, { page, limit } = {}) {
      requireActor(actor);
      return listWithWhere({
        where: {
          createdById: actor.id,
          deletedAt: { not: null },
          reviewStateCode: REVIEW_STATES.DRAFT,
        },
        orderBy: { deletedAt: "desc" },
        page,
        limit,
      });
    },

    async listRemoved({ page, limit, q } = {}) {
      const where = {
        deletedAt: { not: null },
        reviewStateCode: REVIEW_STATES.REMOVED,
      };
      if (q && buildRemovedSearch) where.OR = buildRemovedSearch(q);

      return listWithWhere({
        where,
        orderBy: { deletedAt: "desc" },
        page,
        limit,
      });
    },

    async listForQueue({ page, limit, languageId } = {}) {
      const where = {
        deletedAt: null,
        reviewStateCode: {
          in: [REVIEW_STATES.PENDING, REVIEW_STATES.REVIEWER_APPROVED],
        },
      };
      if (languageId && queueLanguageFilter) queueLanguageFilter(where, languageId);

      return listWithWhere({
        where,
        orderBy: { createdAt: "asc" },
        page,
        limit,
      });
    },

    async listRemovalRequests({ page, limit, languageId } = {}) {
      const pagination = getPagination({ page, limit });
      const where = {
        entityType,
        statusCode: REMOVAL_STATUSES.PENDING,
      };

      if (languageId && removalRequestEntityFilter) {
        Object.assign(where, await removalRequestEntityFilter({ languageId }));
      }

      const [requests, total] = await Promise.all([
        removalRequestRepository.findMany({
          where,
          orderBy: { createdAt: "asc" },
          skip: pagination.skip,
          take: pagination.take,
        }),
        removalRequestRepository.count(where),
      ]);

      const rows = await repository.findByIds(requests.map((request) => request.entityId));
      const rowById = new Map(rows.map((row) => [row.id, row]));
      const ordered = requests
        .map((request) => rowById.get(request.entityId))
        .filter(Boolean);

      return {
        data: await presentRows(ordered),
        meta: buildMeta({
          page: pagination.page,
          limit: pagination.limit,
          total,
        }),
      };
    },

    async create(input, actor) {
      requireActor(actor);

      const id = resolveId(input);
      if (id) {
        const existing = await repository.findById(id);
        if (existing) {
          throw ApiError.conflict(`A ${label} with that id already exists.`);
        }
      }

      const reviewState = creationState(actor);

      const created = await prisma.$transaction(async (tx) => {
        const context = prepareCreate ? await prepareCreate(input, tx) : {};
        const row = await repository.create(
          {
            ...(id ? { id } : {}),
            ...buildCreateData(input, { id, actor, context }),
            reviewStateCode: reviewState,
            createdById: actor.id,
          },
          tx,
        );

        await recordDecision(row.id, { stateCode: reviewState }, tx);
        await auditService.record(
          {
            entityType,
            entityId: row.id,
            action: creationAction(reviewState),
            toState: reviewState,
            actor,
            snapshot: row,
          },
          tx,
        );

        return row;
      });

      return { data: await presentOne(created) };
    },

    async update(id, payload, actor) {
      requireActor(actor);

      const existing = await repository.findById(id);
      if (!existing || existing.deletedAt) throw notFound();

      assertCanEdit(existing, actor);

      const admin = isAdmin(actor);
      const nextState = stateAfterEdit(existing, actor);
      const { id: _ignored, ...input } = payload;

      const updated = await prisma.$transaction(async (tx) => {
        const context = prepareUpdate
          ? await prepareUpdate(input, existing, tx)
          : {};

        const row = await repository.update(
          id,
          {
            ...buildUpdateData(input, existing, { actor, admin, context }),
            reviewStateCode: nextState,
          },
          tx,
        );

        if (nextState !== existing.reviewStateCode) {
          await recordDecision(
            id,
            {
              stateCode: nextState,
              reviewerId: isModerator(actor) ? actor.id : null,
            },
            tx,
          );
        }

        await auditService.record(
          {
            entityType,
            entityId: id,
            action: admin ? "updated" : "updated_pending",
            fromState: existing.reviewStateCode,
            toState: nextState,
            actor,
            snapshot: row,
          },
          tx,
        );

        return row;
      });

      return { data: await presentOne(updated) };
    },

    /** Contributor moves their own draft into the review queue. */
    async submit(id, actor) {
      requireActor(actor);

      const existing = await repository.findById(id);
      if (!existing || existing.deletedAt) throw notFound();

      if (!isAdmin(actor) && existing.createdById !== actor.id) {
        throw ApiError.forbidden("You can only submit entries you created.");
      }
      if (existing.reviewStateCode !== REVIEW_STATES.DRAFT) {
        throw ApiError.conflict("Only drafts can be submitted for review.");
      }
      if (assertCanSubmit) await assertCanSubmit(existing);

      const updated = await prisma.$transaction(async (tx) => {
        const row = await repository.update(
          id,
          { reviewStateCode: REVIEW_STATES.PENDING },
          tx,
        );

        await recordDecision(id, { stateCode: REVIEW_STATES.PENDING }, tx);
        await auditService.record(
          {
            entityType,
            entityId: id,
            action: "submitted",
            fromState: REVIEW_STATES.DRAFT,
            toState: REVIEW_STATES.PENDING,
            actor,
            snapshot: row,
          },
          tx,
        );

        return row;
      });

      return { data: await presentOne(updated) };
    },

    async review(id, { decision, comment }, actor) {
      requireActor(actor);

      if (!isModerator(actor)) {
        throw ApiError.forbidden("Only reviewers and admins can review content.");
      }

      const existing = await repository.findById(id);
      if (!existing || existing.deletedAt) throw notFound();

      if (existing.reviewStateCode === REVIEW_STATES.DRAFT) {
        throw ApiError.conflict("Submit the draft before reviewing it.");
      }

      if (!isAdmin(actor) && existing.reviewStateCode === REVIEW_STATES.APPROVED) {
        throw ApiError.forbidden("Only an admin can unpublish approved content.");
      }

      const nextState = reviewStateFor(decision, actor);
      const rejectionReason =
        decision === "reject" ? comment || "Rejected during review." : null;

      const updated = await prisma.$transaction(async (tx) => {
        const row = await repository.update(
          id,
          { reviewStateCode: nextState },
          tx,
        );

        await recordDecision(
          id,
          {
            stateCode: nextState,
            reviewerId: actor.id,
            comment: rejectionReason,
          },
          tx,
        );

        await auditService.record(
          {
            entityType,
            entityId: id,
            action: reviewActionFor(decision, actor),
            fromState: existing.reviewStateCode,
            toState: nextState,
            actor,
            reason: comment,
            snapshot: row,
          },
          tx,
        );

        return row;
      });

      return { data: await presentOne(updated) };
    },

    /**
     * Admin: logical removal. Contributor: move an unpublished draft to the
     * private trash. Reviewers cannot delete; they raise a removal request.
     */
    async remove(id, { reason } = {}, actor) {
      requireActor(actor);

      const existing = await repository.findById(id);
      if (!existing) throw notFound();
      if (existing.deletedAt) {
        throw ApiError.conflict(`That ${label} is already logically removed.`);
      }

      if (!isAdmin(actor)) {
        if (
          existing.createdById !== actor.id ||
          existing.reviewStateCode !== REVIEW_STATES.DRAFT
        ) {
          throw ApiError.forbidden(
            "Only drafts can be discarded. Ask a reviewer to request removal of submitted content.",
          );
        }

        const discarded = await prisma.$transaction(async (tx) => {
          const row = await repository.discardDraft(
            id,
            { deletedById: actor.id, reason },
            tx,
          );

          await auditService.record(
            {
              entityType,
              entityId: id,
              action: "draft_discarded",
              fromState: REVIEW_STATES.DRAFT,
              toState: REVIEW_STATES.DRAFT,
              actor,
              reason,
              snapshot: row,
            },
            tx,
          );

          return row;
        });

        return { data: await presentOne(discarded) };
      }

      const removed = await prisma.$transaction(async (tx) => {
        const row = await repository.softDelete(
          id,
          { deletedById: actor.id, reason },
          tx,
        );

        await removalRequestRepository.resolvePending(
          entityType,
          id,
          { statusCode: REMOVAL_STATUSES.COMPLETED, resolvedById: actor.id },
          tx,
        );

        await recordDecision(
          id,
          {
            stateCode: REVIEW_STATES.REMOVED,
            reviewerId: actor.id,
            comment: reason ?? null,
          },
          tx,
        );

        await auditService.record(
          {
            entityType,
            entityId: id,
            action: "removed",
            fromState: existing.reviewStateCode,
            toState: REVIEW_STATES.REMOVED,
            actor,
            reason,
            snapshot: row,
          },
          tx,
        );

        return row;
      });

      return { data: await presentOne(removed) };
    },

    async restore(id, actor) {
      requireActor(actor);

      const existing = await repository.findById(id);
      if (!existing) throw notFound();
      if (!existing.deletedAt) {
        throw ApiError.conflict(`That ${label} is not removed.`);
      }

      const admin = isAdmin(actor);
      const isOwnDraft =
        existing.createdById === actor.id &&
        existing.reviewStateCode === REVIEW_STATES.DRAFT;

      if (!admin && !isOwnDraft) {
        throw ApiError.forbidden("Only admins can restore removed content.");
      }

      const restoringRemoved = admin && existing.reviewStateCode === REVIEW_STATES.REMOVED;

      const restored = await prisma.$transaction(async (tx) => {
        const row = restoringRemoved
          ? await repository.restore(id, tx)
          : await repository.restoreDraft(id, tx);

        if (restoringRemoved) {
          await recordDecision(
            id,
            { stateCode: REVIEW_STATES.PENDING, reviewerId: actor.id },
            tx,
          );
        }

        await auditService.record(
          {
            entityType,
            entityId: id,
            action: isOwnDraft ? "draft_restored" : "restored",
            fromState: existing.reviewStateCode,
            toState: row.reviewStateCode,
            actor,
            snapshot: row,
          },
          tx,
        );

        return row;
      });

      return { data: await presentOne(restored) };
    },

    async requestRemoval(id, { reason } = {}, actor) {
      requireActor(actor);
      if (!isModerator(actor)) {
        throw ApiError.forbidden("Only reviewers and admins can request removal.");
      }

      const existing = await repository.findById(id);
      if (!existing || existing.deletedAt) throw notFound();

      if (existing.reviewStateCode === REVIEW_STATES.DRAFT) {
        throw ApiError.conflict(
          "Drafts are not published; ask the contributor to discard it.",
        );
      }

      const pending = await removalRequestRepository.findPendingForEntity(
        entityType,
        id,
      );
      if (pending) {
        throw ApiError.conflict(`A removal request already exists for this ${label}.`);
      }

      await prisma.$transaction(async (tx) => {
        await removalRequestRepository.create(
          {
            entityType,
            entityId: id,
            reason: reason ?? null,
            requestedById: actor.id,
          },
          tx,
        );

        await auditService.record(
          {
            entityType,
            entityId: id,
            action: "removal_requested",
            fromState: existing.reviewStateCode,
            toState: existing.reviewStateCode,
            actor,
            reason,
            snapshot: existing,
          },
          tx,
        );
      });

      return { data: await presentOne(existing) };
    },

    async cancelRemovalRequest(id, actor) {
      requireActor(actor);
      if (!isModerator(actor)) {
        throw ApiError.forbidden(
          "Only reviewers and admins can cancel removal requests.",
        );
      }

      const existing = await repository.findById(id);
      if (!existing || existing.deletedAt) throw notFound();

      const pending = await removalRequestRepository.findPendingForEntity(
        entityType,
        id,
      );
      if (!pending) {
        throw ApiError.conflict(`There is no removal request for this ${label}.`);
      }

      await prisma.$transaction(async (tx) => {
        await removalRequestRepository.resolvePending(
          entityType,
          id,
          { statusCode: REMOVAL_STATUSES.CANCELLED, resolvedById: actor.id },
          tx,
        );

        await auditService.record(
          {
            entityType,
            entityId: id,
            action: "removal_request_cancelled",
            fromState: existing.reviewStateCode,
            toState: existing.reviewStateCode,
            actor,
            snapshot: existing,
          },
          tx,
        );
      });

      return { data: await presentOne(existing) };
    },
  };
}
