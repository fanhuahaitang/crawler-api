let { crawlerResponse } = require("../dist/crawler");

crawlerResponse({
  url: "https://api.github.com/repos/wakhh/node-crawler2?_=1570779698973",
  json: true,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36"
  }
})
  .then(res => {
    console.info(res.body);
  })
  .catch(console.error);
