import { BadRequestException, Logger } from "@nestjs/common";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import path from "path";

/**
 * Multer config chỉ dành cho JSON (.json)
 */
export const multerJsonOptions = (): MulterOptions => {
  const logger = new Logger("MulterJSON");

  return {
    limits: { fileSize: 5 * 1024 * 1024 }, // giới hạn 5MB
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const okMime = file.mimetype === "application/json";
      const okExt = ext === ".json";

      if (okMime || okExt) {
        logger.log(`✅ Chấp nhận file JSON: ${file.originalname}`);
        return cb(null, true);
      }

      logger.warn(
        `❌ Từ chối file ${file.originalname} (mimetype: ${file.mimetype}).`
      );
      return cb(
        new BadRequestException("Chỉ chấp nhận file .json (application/json)"),
        false
      );
    },
  };
};
