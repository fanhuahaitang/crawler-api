let { crawlerFile } = require("../dist/crawler");

crawlerFile(
  "https://raw.githubusercontent.com/wakhh/node-crawler2/master/README.md",
  "./test/readme.md"
)
  .then(console.info)
  .catch(console.error);
