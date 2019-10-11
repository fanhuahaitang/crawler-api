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

// 返回文件大小
export async function crawlerFile(
  options: string | requestOptions,
  filePathName: string
): Promise<number> {
  if (!filePathName) {
    throw new Error("Empty filePath of crawlerFile API are invalid.");
  }
  let newOptions = formatRequestOptions(options);
  filePathName = path.resolve(filePathName);
  return await new Promise((resolve, reject) => {
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
      .pipe(fs.createWriteStream(filePathName))
      .on("close", () => {
        if (status === "pending") {
          try {
            let stats = fs.statSync(filePathName);
            resolve(stats.size);
          } catch (err) {
            reject(err);
          }
        }
      });
  });
}

export interface Rule {
  _?: RuleItem;
  [x: string]: RuleItem;
}

// 处理html的一个标签对应元素的规则项，通过声明式的方式使用函数处理标签对应元素，获得返回值
export type RuleItem =
  // 此规则项处理元素，返回值为元素的文本、输入值、或网页内容；规则项为输入值时返回值不确定类型，为其他时返回值为字符串类型
  | "text"
  | "value"
  | "html"
  // 上述三个规则项的别名写法，数组内，首个值为规则项
  | ["text" | "value" | "html"]
  // 此规则项的返回值为元素，依据传入的string参数指定的某个数据属性，特性或状态
  | ["data" | "attr" | "prop" | "css", string]
  /**
   * 此规则项，会将第一个string参数当做css选择器，提取元素的子元素(html标签的内标签),再使用第二个参数作为传入的规则对象参数处理子元素
   *
   * findOne表示只提取首个符合css选择器的子元素，此时返回值为使用传入的规则对象参数处理此子元素的返回值
   * find表示提取所有符合css选择器的子元素，此时返回值为使用传入的规则对象参数依次处理每个提取到的子元素的返回值组成的数组
   */
  | ["findOne" | "find", string, Rule]
  // 规则项是一个规则对象，返回值为此规则对象处理元素的返回值
  | Rule;

export async function crawlerStaticWebpageAndJQuery(
  options: string | requestOptions,
  rule?: Rule
): Promise<any> {
  if (!rule) {
    rule = {
      _: "html"
    };
  }
  let newOptions = formatRequestOptions(options);
  return await new Promise((resolve, reject) => {
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

function parseElementByFn(element: Cheerio, fn: RuleItem): any {
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
