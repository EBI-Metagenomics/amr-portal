/**
 * This file should probably be extracted into a package of common utilities.
 * Consider whether the File System API might not be used instead.
 * 
 * Note also that if the server sends the file name,
 * it will be included in the 'content-disposition' header,
 * and can be accessed in a way similar to the following (regex might differ):
 * filename = response.headers.get("content-disposition");
*  filename = filename.match(/(?<=")(?:\\.|[^"\\])*(?=")/)[0]; 
 */

// should accept Blob or File objects generated elsewhere in the code
export const downloadBlobAsFile = async (blob: Blob, fileName: string) => {
  const blobUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = fileName;
  downloadLink.click();

  // Revoking object url should avoid memory leak;
  // and deferring it is said to be necessary for Firefox
  // (although unsure if this is still the case)
  const cleanupPromise = new Promise((resolve) => {
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      resolve(null);
    }, 100);
  });

  await cleanupPromise;
};