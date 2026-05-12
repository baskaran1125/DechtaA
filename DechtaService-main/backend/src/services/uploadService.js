// src/services/uploadService.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function sanitizeSegment(value) {
  return String(value || '')
    .replace(/\.\./g, '')
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '');
}

function getResolvedPublicBaseUrl() {
  const fromEnv = String(process.env.PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  if (fromEnv && !/your-public-backend-url\.com/i.test(fromEnv)) {
    return fromEnv;
  }
  return `http://localhost:${process.env.PORT || 5003}`;
}

// ──────────────────────────────────────────────────────────────
// Upload a file buffer to local storage
// Returns the file path and public URL
// ──────────────────────────────────────────────────────────────
async function uploadFile({ bucket, folder, filename, buffer, mimetype }) {
  const ext = String(filename).split('.').pop().replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const uniqueName = `${uuidv4()}.${ext}`;
  const safeBucket = sanitizeSegment(bucket) || 'files';
  const safeFolder = sanitizeSegment(folder);
  
  // Create upload directory if it doesn't exist
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const bucketDir = path.join(uploadDir, safeBucket, safeFolder);
  
  if (!fs.existsSync(bucketDir)) {
    fs.mkdirSync(bucketDir, { recursive: true });
  }
  
  const filePath = path.join(bucketDir, uniqueName);
  
  try {
    fs.writeFileSync(filePath, buffer);
    
    // Generate relative path for storage
    const relativePath = path.join(safeBucket, safeFolder, uniqueName).replace(/\\/g, '/');
    const baseUrl = getResolvedPublicBaseUrl();
    
    return {
      path: relativePath,
      publicUrl: `${baseUrl}/uploads/${relativePath}`,
      bucket: safeBucket,
      filename: uniqueName,
    };
  } catch (err) {
    console.error('[Upload Error]', err);
    throw new Error(`Upload failed: ${err.message}`);
  }
}

// ──────────────────────────────────────────────────────────────
// Get a signed URL for private files (same as public for local storage)
// ──────────────────────────────────────────────────────────────
async function getSignedUrl(bucket, filePath, expiresInSeconds = 3600) {
  try {
    // For local storage, just return the public URL
    const baseUrl = getResolvedPublicBaseUrl();
    return `${baseUrl}/uploads/${filePath}`;
  } catch (err) {
    throw new Error(`Failed to get signed URL: ${err.message}`);
  }
}

// ──────────────────────────────────────────────────────────────
// Delete a file from local storage
// ──────────────────────────────────────────────────────────────
async function deleteFile(bucket, filePath) {
  try {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const fullPath = path.join(uploadDir, filePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('[Delete File Error]', err.message);
  }
}

module.exports = { uploadFile, getSignedUrl, deleteFile };
