// utils/imagePath.js
export function getImagePath(filename = "/b6.svg") {
  const baseURL =
    process.env.NODE_DEV == "development"
      ? process.env.SERVER_DEVELPMENT_URL
      : process.env.SERVER_PRODUCTION_URL;

  return `${baseURL}/assets/${filename}`;
}
