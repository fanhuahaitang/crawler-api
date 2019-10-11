# crawler-api

Some crawler api,which are briefness and powerful.

## npm install

```shell
npm i crawler-api
```

## API

- crawlerResponse
  - get the response of a http request.
- crawlerFile
  - get and save the response file of a http request.
- crawlerStaticWebpageAndJQuery
  - get the webpage file of a http request, and use a jquery rule to get some info from the root element of the webpage.

```typescript
type requestOptions =
  | (request.UriOptions & request.CoreOptions)
  | (request.UrlOptions & request.CoreOptions);

interface crawlerResponse {
  (options: string | requestOptions, statusCodeCriticism?: boolean): Promise<
    request.Response
  >;
}

interface crawlerFile {
  (options: string | requestOptions, filePathName: string): Promise<number>; // The number is file size.
}

//Use a jquery rule to get some info from the root element of the webpage.
interface crawlerStaticWebpageAndJQuery {
  (options: string | requestOptions, rule?: Rule): Promise<any>;
}

// Each key represents that get one info from the element by a ruleItem.The rule will return a object merge these info at info's keys.
interface Rule {
  _?: RuleItem; // If exists a key "_",the rule will return the info from the element by the "_" key's ruleItem.
  [key: string]: RuleItem;
}

// RuleItem can get info from a html element,just like its name.
type RuleItem =
  | "text"
  | "value"
  | "html"
  | ["text" | "value" | "html"]
  | ["data" | "attr" | "prop" | "css", string]
  | ["findOne" | "find", string, Rule] // Get the info of the element's children elements；the string param is selector,example ".test","#app".
  | Rule;
```
