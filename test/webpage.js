let { crawlerStaticWebpageAndJQuery } = require("../dist/crawler");

crawlerStaticWebpageAndJQuery(
  {
    url: "https://github.com/wakhh/node-crawler2",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36"
    }
  },
  {
    _: [
      "findOne",
      "span.author a.fn",
      {
        _: "text"
      }
    ]
  }
)
  .then(console.info)
  .catch(console.error);
