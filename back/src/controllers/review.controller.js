import { asyncHandler } from "../utils/async-handler.js";
import { reviewService } from "../services/review.service.js";

export const reviewController = {
  queue: asyncHandler(async (req, res) => {
    res.json(await reviewService.queue(req.validated));
  }),

  history: asyncHandler(async (req, res) => {
    res.json(await reviewService.history(req.validated));
  }),
};
