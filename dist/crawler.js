"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = __importDefault(require("request"));
const cheerio_1 = __importDefault(require("cheerio"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function formatRequestOptions(options) {
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
function crawlerResponse(options, statusCodeCriticism) {
    return __awaiter(this, void 0, void 0, function* () {
        let newOptions = formatRequestOptions(options);
        return yield new Promise((resolve, reject) => {
            request_1.default(newOptions, (error, response, body) => {
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
    });
}
exports.crawlerResponse = crawlerResponse;
// 返回文件大小
function crawlerFile(options, filePathName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!filePathName) {
            throw new Error("Empty filePath of crawlerFile API are invalid.");
        }
        let newOptions = formatRequestOptions(options);
        filePathName = path_1.default.resolve(filePathName);
        return yield new Promise((resolve, reject) => {
            let status = "pending";
            request_1.default(newOptions)
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
                .pipe(fs_1.default.createWriteStream(filePathName))
                .on("close", () => {
                if (status === "pending") {
                    try {
                        let stats = fs_1.default.statSync(filePathName);
                        resolve(stats.size);
                    }
                    catch (err) {
                        reject(err);
                    }
                }
            });
        });
    });
}
exports.crawlerFile = crawlerFile;
function crawlerStaticWebpageAndJQuery(options, rule) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!rule) {
            rule = {
                _: "html"
            };
        }
        let newOptions = formatRequestOptions(options);
        return yield new Promise((resolve, reject) => {
            request_1.default(newOptions, (error, response, body) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (response.statusCode !== 200) {
                    reject(`${response.statusCode} ${response.statusMessage}`);
                    return;
                }
                let rootElement = cheerio_1.default.load(body).root();
                resolve(parseElementByRule(rootElement, rule));
            });
        });
    });
}
exports.crawlerStaticWebpageAndJQuery = crawlerStaticWebpageAndJQuery;
function parseElementByFn(element, fn) {
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
                }
                else {
                    let findOne_firstDescendantElement = findOne_descendantElements.first();
                    return parseElementByRule(findOne_firstDescendantElement, findOne_cbRule);
                }
            case "find":
                let find_selector = fn[1];
                if (typeof find_selector !== "string") {
                    return null;
                }
                let find_cbRule = fn[2];
                let find_descendantElements = element.find(find_selector);
                let find_result = new Array(find_descendantElements.length);
                find_descendantElements.each(function (i, elem) {
                    let find_descendantElement = cheerio_1.default(elem);
                    find_result[i] = parseElementByRule(find_descendantElement, find_cbRule);
                });
                return find_result;
            default:
                return null;
        }
    }
    else if (fn instanceof Object) {
        return parseElementByRule(element, fn);
    }
    return null;
}
function parseElementByRule(element, rule) {
    let result = {};
    if (typeof rule === "object") {
        if (rule["_"]) {
            let fn = rule["_"];
            return parseElementByFn(element, fn);
        }
        else {
            for (let key of Object.keys(rule)) {
                let fn = rule[key];
                result[key] = parseElementByFn(element, fn);
            }
        }
    }
    return result;
}
