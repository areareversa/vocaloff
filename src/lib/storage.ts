import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.R2_BUCKET ?? "";

export const storage = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

/** Upload direto do browser para o bucket (URL assinada de curta duração). */
export function presignUpload(key: string, contentType: string, expiresIn = 600) {
  return getSignedUrl(
    storage,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

/** Download/streaming de stem (URL assinada). Nunca exponha o bucket publicamente. */
export function presignDownload(key: string, expiresIn = 3600) {
  return getSignedUrl(storage, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export function deleteObject(key: string) {
  return storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function songSourceKey(userId: string, songId: string, ext: string) {
  return `users/${userId}/songs/${songId}/source.${ext}`;
}

export function stemKey(userId: string, songId: string, kind: string) {
  return `users/${userId}/songs/${songId}/stems/${kind}.wav`;
}
