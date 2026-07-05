import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.S3_REGION || "auto";
const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const bucketName = process.env.S3_BUCKET_NAME || "nexus-scan-reports-bucket";

const isConfigured = !!(accessKeyId && secretAccessKey);

if (!isConfigured) {
  console.warn("⚠️ Warning: S3 credentials are not fully configured in environment.");
}

// Initialize S3Client. Supports standard AWS S3 or custom endpoints like Cloudflare R2.
export const s3Client = new S3Client({
  region,
  ...(endpoint ? { endpoint } : {}),
  credentials: {
    accessKeyId: accessKeyId || "mockAccessKey",
    secretAccessKey: secretAccessKey || "mockSecretKey",
  },
  // Needed for many S3 compatible providers (like Cloudflare R2, MinIO)
  forcePathStyle: true,
});

/**
 * Uploads a report file (PDF or Excel buffer) to S3/R2 storage under a specific scan path
 */
export async function uploadReport(
  scanId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType = "application/octet-stream"
): Promise<string> {
  const key = `scans/${scanId}/${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

/**
 * Generates a pre-signed GET URL for downloading private reports from the bucket
 * @param expiration default is 3600 seconds (1 hour)
 */
export async function getPresignedUrl(
  scanId: string,
  fileName: string,
  expiration = 3600
): Promise<string> {
  const key = `scans/${scanId}/${fileName}`;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiration });
}

/**
 * Deletes a report file from storage
 */
export async function deleteReport(
  scanId: string,
  fileName: string
): Promise<void> {
  const key = `scans/${scanId}/${fileName}`;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
}
