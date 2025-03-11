// import multer from "multer";
// import { v2 as cloudinary } from "cloudinary";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import dotenv from "dotenv";
// dotenv.config(); // Load environment variables from .env file
// // Validate environment variables
// if (
//   !process.env.CLOUDINARY_CLOUD_NAME ||
//   !process.env.CLOUDINARY_API_KEY ||
//   !process.env.CLOUDINARY_API_SECRET
// ) {
//   throw new Error("Missing Cloudinary configuration in environment variables");
// }

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: (req, file) => ({
//     folder: `complaints/${req.user?.id || "anonymous"}`,
//     // resource_type: file.mimetype.startsWith("video/") ? "video" : "image",
//     resource_type: "auto",
//     allowed_formats: ["jpeg", "png", "jpg", "pdf", "mp4", "mov"],
//     format: (() => {
//       const ext = file.originalname.split(".").pop()?.toLowerCase();
//       return ["mp4", "mov"].includes(ext) ? undefined : ext;
//     })(),
//   }),
// });

// const parser = multer({
//   storage,
//   limits: {
//     fileSize: 100 * 1024 * 1024,
//     files: 5,
//   },
//   fileFilter: (req, file, cb) => {
//     const validTypes = [
//       "image/jpeg",
//       "image/png",
//       "image/jpg",
//       "application/pdf",
//       "video/mp4",
//       "video/quicktime",
//     ];

//     cb(null, validTypes.includes(file.mimetype));
//   },
// });

// export default parser;
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const commonParams = {
      folder: `complaints/${req.user?.id || "anonymous"}`,
      resource_type: "auto",
    };

    // For generating video thumbnails
    if (file.mimetype.startsWith("video/")) {
      return {
        ...commonParams,
        resource_type: "video",
        eager: [{ width: 300, height: 200, crop: "pad", format: "jpg" }],
      };
    }

    // For generating PDF thumbnails (first page)
    if (file.mimetype === "application/pdf") {
      return {
        ...commonParams,
        resource_type: "image",
        transformation: [{ flags: "attachment", page: 1 }],
        format: "jpg",
      };
    }

    // Default image handling
    return {
      ...commonParams,
      quality: "auto:best",
      transformation: [{ width: 1500, crop: "limit", quality: "auto:best" }],
    };
  },
});

const parser = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, cb) => cb(null, true), // Allow all file types
});

export default parser;
