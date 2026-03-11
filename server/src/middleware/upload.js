import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadRoot = path.resolve(__dirname, "../../uploads");

const uploadDirectories = {
  profilePicture: "profile-images",
  logo: "company-logos",
  cv: "cvs",
  attachment: "chat-attachments"
};

const imageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const cvMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const attachmentMimeTypes = new Set([
  ...imageMimeTypes,
  ...cvMimeTypes,
  "text/plain",
  "text/csv",
  "application/zip"
]);

const ensureUploadDirectory = (directory) => {
  fs.mkdirSync(path.join(uploadRoot, directory), { recursive: true });
};

const sanitizeFilename = (originalName) =>
  path
    .basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const directory = uploadDirectories[file.fieldname];

    if (!directory) {
      return callback(new Error("Unsupported upload field"));
    }

    ensureUploadDirectory(directory);
    return callback(null, path.join(uploadRoot, directory));
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = sanitizeFilename(file.originalname) || "file";
    const userId = req.user?._id?.toString() || "user";

    callback(null, `${userId}-${file.fieldname}-${Date.now()}-${safeName}${extension}`);
  }
});

const fileFilter = (req, file, callback) => {
  if (["profilePicture", "logo"].includes(file.fieldname)) {
    if (!imageMimeTypes.has(file.mimetype)) {
      return callback(new Error("Images must be JPG, PNG, WEBP, or GIF"));
    }

    return callback(null, true);
  }

  if (file.fieldname === "cv") {
    if (!cvMimeTypes.has(file.mimetype)) {
      return callback(new Error("CV must be a PDF, DOC, or DOCX file"));
    }

    return callback(null, true);
  }

  if (file.fieldname === "attachment") {
    if (!attachmentMimeTypes.has(file.mimetype)) {
      return callback(new Error("Attachment type not supported"));
    }

    return callback(null, true);
  }

  return callback(new Error("Unsupported upload field"));
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
}).fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "logo", maxCount: 1 },
  { name: "cv", maxCount: 1 }
]);

export const handleProfileUpload = (req, res, next) => {
  multerUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return next();
  });
};

const messageAttachmentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
}).single("attachment");

export const handleMessageAttachmentUpload = (req, res, next) => {
  messageAttachmentUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return next();
  });
};

export const toPublicUploadPath = (absoluteFilePath) => {
  const relativeFilePath = path.relative(uploadRoot, absoluteFilePath).replace(/\\/g, "/");
  return `/uploads/${relativeFilePath}`;
};