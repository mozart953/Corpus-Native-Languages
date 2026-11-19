import { asyncHandler } from "../utils/async-handler.js";
import { siteImageService } from "../services/site-image.service.js";

export const siteImageController = {
  getHomeImage: asyncHandler(async (_req, res) => {
    res.json({ data: await siteImageService.getHomeImage() });
  }),

  uploadHomeImage: asyncHandler(async (req, res) => {
    const image = await siteImageService.saveHomeImage({
      file: req.file,
      alt: req.body?.alt,
      actor: req.user,
    });

    res.status(req.file ? 201 : 200).json({ data: image });
  }),

  removeHomeImage: asyncHandler(async (req, res) => {
    const result = await siteImageService.removeHomeImage({ actor: req.user });
    res.json({ data: result });
  }),
};
