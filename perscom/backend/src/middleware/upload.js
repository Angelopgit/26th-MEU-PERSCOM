const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Optional image compression via sharp (graceful fallback if unavailable)
let sharp = null;
try { sharp = require('sharp'); } catch { console.warn('[COMPRESS] sharp not available — uploads will not be compressed'); }

async function compressImage(filePath) {
  if (!sharp) return;
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;
  try {
    const img = sharp(filePath).resize(1920, 1920, { fit: 'inside', withoutEnlargement: true });
    let buf;
    if (ext === '.png')        buf = await img.png({ compressionLevel: 9 }).toBuffer();
    else if (ext === '.webp')  buf = await img.webp({ quality: 80 }).toBuffer();
    else                       buf = await img.jpeg({ quality: 78, progressive: true, mozjpeg: true }).toBuffer();
    fs.writeFileSync(filePath, buf);
  } catch (e) {
    console.warn('[COMPRESS] Failed to compress', path.basename(filePath), '—', e.message);
  }
}

// Drop-in middleware: compress req.file after any multer handler
const compressUploadedFile = async (req, res, next) => {
  if (req.file) await compressImage(req.file.path);
  next();
};

// Rank icons: resize to max 64×64px (covers 2× retina) and compress tightly
async function compressRankIconFile(filePath) {
  if (!sharp) return;
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;
  try {
    const img = sharp(filePath).resize(64, 64, { fit: 'inside', withoutEnlargement: true });
    let buf;
    if (ext === '.png')       buf = await img.png({ compressionLevel: 9 }).toBuffer();
    else if (ext === '.webp') buf = await img.webp({ quality: 85 }).toBuffer();
    else                      buf = await img.jpeg({ quality: 82, progressive: true, mozjpeg: true }).toBuffer();
    fs.writeFileSync(filePath, buf);
  } catch (e) {
    console.warn('[COMPRESS] Failed to compress rank icon', path.basename(filePath), '—', e.message);
  }
}

const compressRankIcon = async (req, res, next) => {
  if (req.file) await compressRankIconFile(req.file.path);
  next();
};

const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `op-${req.params.id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const operationUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Logo upload — always saves as logo.<ext> (overwrites previous logo)
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo${ext}`);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Document image upload — saves as doc-<id>-<timestamp>.<ext>
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${req.params.id}-${Date.now()}${ext}`);
  },
});
const documentUpload = multer({
  storage: documentStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// PDF/DOCX document file upload — saves as docfile-<id>-<timestamp>.<ext>
const docFileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `docfile-${req.params.id}-${Date.now()}${ext}`);
  },
});
const docFileUpload = multer({
  storage: docFileStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are allowed'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// Monthly spotlight image upload
const spotlightStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `spotlight-${Date.now()}${ext}`);
  },
});
const spotlightUpload = multer({
  storage: spotlightStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Rank icon upload — saves as rank-icon-<id>-<timestamp>.<ext>
const rankIconStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `rank-icon-${req.params.id}-${Date.now()}${ext}`);
  },
});
const rankIconUpload = multer({
  storage: rankIconStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Default export stays backwards-compatible; named exports as properties
operationUpload.logoUpload = logoUpload;
operationUpload.documentUpload = documentUpload;
operationUpload.docFileUpload = docFileUpload;
operationUpload.spotlightUpload = spotlightUpload;
operationUpload.rankIconUpload = rankIconUpload;
operationUpload.compressUploadedFile = compressUploadedFile;
operationUpload.compressRankIcon = compressRankIcon;
module.exports = operationUpload;
