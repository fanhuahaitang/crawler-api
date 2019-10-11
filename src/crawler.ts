import request from "request";
import cheerio from "cheerio";
import path from "path";
import fs from "fs";

export type requestOptions =
  | (request.UriOptions & request.CoreOptions)
  | (request.UrlOptions & request.CoreOptions);

function formatRequestOptions(
  options: string | requestOptions
): requestOptions {
  if (!options) {
    throw new Error("Empty crawler options are invalid.");
  }
  return typeof options === "string"
    ? {
        method: "GET",
        url: options
      }
    : options;
}

export async function crawlerResponse(
  options: string | requestOptions,
  statusCodeCriticism?: boolean
): Promise<request.Response> {
  let newOptions = formatRequestOptions(options);
  return await new Promise((resolve, reject) => {
    request(newOptions, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      if (statusCodeCriticism && response.statusCode !== 200) {
        return reject(response.statusMessage);
      }
      response.body = body;
      resolve(response);
    });
  });
}

export async function crawlerFile(
  options: string | requestOptions,
  filePath: string
): Promise<number> {
  if (!filePath) {
    throw new Error("Empty filePath of crawlerFile API are invalid.");
  }
  let newOptions = formatRequestOptions(options);
  filePath = path.resolve(filePath);
  return new Promise((resolve, reject) => {
    let status = "pending";
    request(newOptions)
      .on("error", err => {
        if (err) {
          status = err.message;
          reject(err);
        }
      })
      .on("response", response => {
        if (response.statusCode !== 200) {
          status = response.statusMessage;
          reject(response.statusMessage);
        }
      })
      .pipe(fs.createWriteStream(filePath))
      .on("close", () => {
        if (status === "pending") {
          let stats = fs.statSync(filePath);
          resolve(stats.size);
        }
      });
  });
}

export type RuleFunction =
  | "text"
  | "value"
  | "html"
  | ["text" | "value" | "html"]
  | ["data" | "attr" | "prop" | "css", string]
  | ["findOne" | "find", string, Rule]
  | Rule;

export interface Rule {
  //操作元素的规则，需配合一个元素使用；规则操作元素的返回值默认是一个对象，对象的每个键x的值，是使用键x对应的获取元素数据的方法获取到的元素数据；当拥有键“_”时，规则的返回值替换为键“_”对饮的获取元素数据的方法获取到的元素数据
  _?: RuleFunction;
  [x: string]: RuleFunction;
}

export function crawlerStaticWebpageAndJQuery(
  options: string | requestOptions,
  rule?: Rule
): Promise<any> {
  if (!rule) {
    rule = {
      _: "html"
    };
  }
  let newOptions = formatRequestOptions(options);
  return new Promise((resolve, reject) => {
    request(newOptions, (error, response, body) => {
      if (error) {
        reject(error);
        return;
      }
      if (response.statusCode !== 200) {
        reject(`${response.statusCode} ${response.statusMessage}`);
        return;
      }
      let rootElement = cheerio.load(body).root();
      resolve(parseElementByRule(rootElement, rule));
    });
  });
}

function parseElementByFn(element: Cheerio, fn: RuleFunction): any {
  if (typeof fn === "string") {
    fn = [fn];
  }
  if (fn instanceof Array) {
    switch (fn[0]) {
      case "text":
        return element.text();

      case "value":
        return element.val();

      case "html":
        return element.html();

      case "css":
        let css_propName = fn[1];
        if (typeof css_propName !== "string") {
          return null;
        }
        return element.css(css_propName);

      case "data":
        let data_name = fn[1];
        if (typeof data_name !== "string") {
          return null;
        }
        return element.data(data_name);

      case "attr":
        let attr_name = fn[1];
        if (typeof attr_name !== "string") {
          return null;
        }
        return element.attr(attr_name);

      case "prop":
        let prop_name = fn[1];
        if (typeof prop_name !== "string") {
          return null;
        }
        return element.prop(prop_name);

      case "findOne":
        let findOne_selector = fn[1];
        if (typeof findOne_selector !== "string") {
          return null;
        }
        let findOne_cbRule = fn[2];
        let findOne_descendantElements = element.find(findOne_selector);
        if (findOne_descendantElements.length === 0) {
          return null;
        } else {
          let findOne_firstDescendantElement = findOne_descendantElements.first();
          return parseElementByRule(
            findOne_firstDescendantElement,
            findOne_cbRule
          );
        }

      case "find":
        let find_selector = fn[1];
        if (typeof find_selector !== "string") {
          return null;
        }
        let find_cbRule = fn[2];
        let find_descendantElements = element.find(find_selector);
        let find_result = new Array(find_descendantElements.length);
        find_descendantElements.each(function(i, elem) {
          let find_descendantElement = cheerio(elem);
          find_result[i] = parseElementByRule(
            find_descendantElement,
            find_cbRule
          );
        });
        return find_result;

      default:
        return null;
    }
  } else if (fn instanceof Object) {
    return parseElementByRule(element, fn);
  }
  return null;
}

function parseElementByRule(element: Cheerio, rule: Rule): any {
  let result = {} as { [x: string]: any };
  if (typeof rule === "object") {
    if (rule["_"]) {
      let fn = rule["_"];
      return parseElementByFn(element, fn);
    } else {
      for (let key of Object.keys(rule)) {
        let fn = rule[key];
        result[key] = parseElementByFn(element, fn);
      }
    }
  }
  return result;
}
