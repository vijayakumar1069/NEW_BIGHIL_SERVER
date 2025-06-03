import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
import { promisify } from "util";

dotenv.config();

const unlinkAsync = promisify(fs.unlink);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create a flexible upload function that accepts different field names
const createUpload = (fieldName = "files") =>
  multer({
    dest: "uploads/",
    limits: { fileSize: 100 * 1024 * 1024, files: 5 },
    fileFilter: (req, file, cb) => cb(null, true),
  }).array(fieldName);

const uploadToCloudinary =
  (folderBase = "default", fieldName = "files") =>
  async (req, res, next) => {
    try {
      // Create upload middleware with the specified field name
      const upload = createUpload(fieldName);

      // Handle multer upload first
      await new Promise((resolve, reject) => {
        upload(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!req.files?.length) {
        return next();
      }

      // Process files in parallel
      const processedFiles = await Promise.all(
        req.files.map(async (file) => {
          try {
            const folder = `${folderBase}/${req.user?.id || "anonymous"}`;
            const options = {
              folder,
              public_id: `${Date.now()}-${file.originalname}`,
              overwrite: false,
            };

            // Configure resource type and transformations based on file type
            if (file.mimetype.startsWith("video/")) {
              options.resource_type = "video";
              options.eager = [
                {
                  width: 300,
                  height: 200,
                  crop: "pad",
                  format: "jpg",
                  quality: "auto",
                },
              ];
            } else if (file.mimetype.startsWith("image/")) {
              options.resource_type = "image";
              options.quality = "auto:best";
              options.transformation = [{ width: 1500, crop: "limit" }];
            } else {
              // For all other file types (PDF, DOC, DOCX, XLS, XLSX, TXT, etc.)
              options.resource_type = "raw"; // This preserves the original format
              // Remove any transformations for raw files
              delete options.quality;
              delete options.transformation;
              delete options.format;
            }

            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(file.path, options);

            // Cleanup temp file
            await unlinkAsync(file.path);

            return {
              originalname: file.originalname,
              url: result.secure_url,
              public_id: result.public_id,
              resource_type: result.resource_type,
              format: result.format,
              bytes: result.bytes,
              thumbnail: result.eager?.[0]?.secure_url || null, // Only for videos
              mimetype: file.mimetype, // Preserve original mimetype
            };
          } catch (error) {
            await unlinkAsync(file.path);
            throw error;
          }
        })
      );

      // Attach processed files to request
      req.cloudinaryFiles = processedFiles;
      next();
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        error: "File processing failed",
        details: error.message,
      });
    }
  };

export default uploadToCloudinary;
