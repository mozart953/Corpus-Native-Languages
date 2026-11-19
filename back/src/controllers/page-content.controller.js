import { asyncHandler } from "../utils/async-handler.js";
import { pageContentService } from "../services/page-content.service.js";

export const pageContentController = {
  getPublic: asyncHandler(async (req, res) => {
    res.json({ data: await pageContentService.getPublic(req.validated.locale) });
  }),

  getAdmin: asyncHandler(async (req, res) => {
    res.json({ data: await pageContentService.getAdmin(req.validated.locale) });
  }),

  save: asyncHandler(async (req, res) => {
    res.json({
      data: await pageContentService.save(
        req.validated.locale,
        req.validated.messages,
        req.user,
      ),
    });
  }),

  resetAll: asyncHandler(async (req, res) => {
    res.json({
      data: await pageContentService.resetAll(req.validated.locale, req.user),
    });
  }),

  resetKey: asyncHandler(async (req, res) => {
    res.json({
      data: await pageContentService.resetKey(
        req.validated.locale,
        req.validated.key,
        req.user,
      ),
    });
  }),
};
