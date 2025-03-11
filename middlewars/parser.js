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
// import multer from "multer";
// import { v2 as cloudinary } from "cloudinary";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import dotenv from "dotenv";

// dotenv.config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: (req, file) => {
//     const commonParams = {
//       folder: `complaints/${req.user?.id || "anonymous"}`,
//       resource_type: "auto",
//     };

//     // For generating video thumbnails
//     if (file.mimetype.startsWith("video/")) {
//       return {
//         ...commonParams,
//         resource_type: "video",
//         eager: [{ width: 300, height: 200, crop: "pad", format: "jpg" }],
//       };
//     }

//     // For generating PDF thumbnails (first page)
//     if (file.mimetype === "application/pdf") {
//       return {
//         ...commonParams,
//         resource_type: "image",
//         transformation: [{ flags: "attachment", page: 1 }],
//         format: "jpg",
//       };
//     }

//     // Default image handling
//     return {
//       ...commonParams,
//       quality: "auto:best",
//       transformation: [{ width: 1500, crop: "limit", quality: "auto:best" }],
//     };
//   },
// });

// const parser = multer({
//   storage,
//   limits: {
//     fileSize: 100 * 1024 * 1024,
//     files: 5,
//   },
//   fileFilter: (req, file, cb) => cb(null, true), // Allow all file types
// });

// export default parser;

// import multer from "multer";
// import { v2 as cloudinary } from "cloudinary";
// // import { Request, Response, NextFunction } from "express";
// import dotenv from "dotenv";
// import fs from "fs";

// dotenv.config();

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Configure Multer for temporary storage
// const upload = multer({
//   dest: "uploads/", // Temp folder to store files before uploading to Cloudinary
//   limits: { fileSize: 100 * 1024 * 1024, files: 5 }, // 100 MB Max, max 5 files
//   fileFilter: (req, file, cb) => {
//     // Optionally filter based on the file type if needed
//     cb(null, true); // Allow all files
//   },
// }).array("files"); // You can also use `.single()` for single file uploads

// // Middleware for uploading and handling Cloudinary logic
// const uploadToCloudinary = (folder) => async (req, res, next) => {
//   try {
//     // Use multer to handle file uploads
//     upload(req, res, async (err) => {
//       if (err) {
//         return res.status(400).json({ error: err.message });
//       }

//       if (!req.files) {
//         return res.status(400).json({ error: "No files uploaded" });
//       }

//       const uploadedFiles = await Promise.all(
//         req.files.map(async (file) => {
//           let uploadResult;

//           // Handle specific file types differently
//           if (file.mimetype.startsWith("video/")) {
//             // Video thumbnail generation
//             uploadResult = await cloudinary.uploader.upload(file.path, {
//               folder: folder || "default",
//               resource_type: "video",
//               eager: [{ width: 300, height: 200, crop: "pad", format: "jpg" }],
//             });
//           } else if (file.mimetype === "application/pdf") {
//             // PDF thumbnail generation for first page
//             uploadResult = await cloudinary.uploader.upload(file.path, {
//               folder: folder || "default",
//               resource_type: "image",
//               page: 1,
//               format: "jpg",
//               transformation: [{ flags: "attachment" }],
//             });
//           } else {
//             // Default image or other file handling
//             uploadResult = await cloudinary.uploader.upload(file.path, {
//               folder: folder || "default",
//               resource_type: "auto",
//               transformation: [
//                 { width: 1500, crop: "limit", quality: "auto:best" },
//               ],
//             });
//           }

//           // Remove the temporary file from the server
//           fs.unlinkSync(file.path);

//           // Return the uploaded file's details
//           return {
//             originalname: file.originalname,
//             url: uploadResult.secure_url,
//             public_id: uploadResult.public_id,
//             type: uploadResult.resource_type,
//           };
//         })
//       );

//       req.uploadedFiles = uploadedFiles; // Add uploaded file data to request
//       next();
//     });
//   } catch (error) {
//     console.error("Error uploading to Cloudinary:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// export default uploadToCloudinary;
