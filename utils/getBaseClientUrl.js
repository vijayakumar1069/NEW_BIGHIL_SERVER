export const getBaseClientUrl = () => {
  return process.env.NODE_ENV === "development"
    ? process.env.CLIENT_DEV_URL
    : process.env.CLIENT_PROD_URL;
};
