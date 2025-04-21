const path = require("path");

module.exports = {
  cacheDirectory: path.join(process.cwd(), ".cache", "puppeteer"),
};
