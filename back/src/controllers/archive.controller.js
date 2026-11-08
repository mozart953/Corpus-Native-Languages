import { asyncHandler } from "../utils/async-handler.js";
import { archiveService } from "../services/archive.service.js";

export const archiveController = {
  list: asyncHandler(async (req, res) => {
    res.json(await archiveService.list(req.validated));
  }),
};
