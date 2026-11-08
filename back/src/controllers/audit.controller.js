import { asyncHandler } from "../utils/async-handler.js";
import { auditService } from "../services/audit.service.js";

export const auditController = {
  list: asyncHandler(async (req, res) => {
    res.json(await auditService.list(req.validated));
  }),
};
