import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getBucket } from "./firebase";
import { storagePath } from "./paths";

export async function uploadSessionFiles(sessionId: string, finalJpg: Blob, gif: Blob) {
  const bucket = getBucket();
  const imgRef = ref(bucket, storagePath(sessionId, "final.jpg"));
  const gifRef = ref(bucket, storagePath(sessionId, "animation.gif"));
  await Promise.all([
    uploadBytes(imgRef, finalJpg, { contentType: "image/jpeg", cacheControl: "public,max-age=31536000" }),
    uploadBytes(gifRef, gif, { contentType: "image/gif", cacheControl: "public,max-age=31536000" }),
  ]);
  const [imageUrl, gifUrl] = await Promise.all([getDownloadURL(imgRef), getDownloadURL(gifRef)]);
  return { imageUrl, gifUrl };
}
