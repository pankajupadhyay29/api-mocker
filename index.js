#!/usr/bin/env node
"use strict";
const defaults = require("./defaults.json");
const fs = require("fs");
const _ = require("lodash");
const http = require("http");
const fetch = require("node-fetch");

const {
  getOptions,
  getHash,
  getRequestHash,
  getMockedResponse,
  getHelpText
} = require("./utils");
const myArgs = require("optimist").argv;

const help = getHelpText();
if (myArgs.h || myArgs.help) {
  console.log(help);
  process.exit(0);
}

const options = _.defaults(getOptions(myArgs), defaults);

const data = fs.existsSync(options.dataPath) ? require(options.dataPath) : {};
const server = http.createServer((req, res) => {
  const reqObj = {
    url: [options.targetUrl, _.trimEnd(req.url, "/")].join(""),
    method: req.method,
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const targetHost = options.targetUrl.split("://")[1];

  const reqHash = getRequestHash(reqObj);

  if (options.mockOnly) {
    return sendMockResponse(res, reqHash, reqObj);
  }

  const fetchOptions = {
    body: JSON.stringify(req.body),
    headers: { ...req.headers, host: targetHost }
  };

  fetch(reqObj.url, fetchOptions)
    .then(response => {
      const contentType = response.headers.get("Content-Type");
      if (contentType.indexOf("text") >= 0) {
        return response.text().then(textRes => {
          return {
            ok: response.ok,
            status: response.status,
            headers: { "Content-Type": contentType },
            body: textRes,
            isText: true
          };
        });
      } else {
        return response.json().then(jsonRes => {
          return {
            ok: response.ok,
            status: response.status,
            headers: { "Content-Type": contentType },
            body: jsonRes
          };
        });
      }
    })
    .then(response => {
      if (response.ok) {
        recordAndForwardResponse(reqHash, reqObj, res, response);
      } else {
        sendErrorResponse(response, reqHash, reqObj, res);
      }
    })
    .catch(err => {
      sendErrorResponse(
        { status: err.code, body: err.message },
        reqHash,
        reqObj,
        res
      );
    });
});

server.listen(options.port, () => {
  console.info(`\n\nServer listen at http://localhost:${options.port} \n`);
});

const sendMockResponse = (res, reqHash, reqObj) => {
  if (_.isEmpty(data)) {
    res.writeHead(404, { "Content-Type": "text/html" });
    return res.end(
      "ERROR: No mock data found \r\n First run this with working api or provide mock data"
    );
  }
  const mockRes = getMockedResponse(reqHash, reqObj, data);
  const headers = mockRes.headers || { "Content-Type": "application/json" };
  res.writeHead(mockRes.status, headers);
  return res.end(JSON.stringify(mockRes.body));
};

const sendErrorResponse = (err, reqHash, reqObj, res) => {
  const mockRes =
    options.recordOnly ||
    (options.errorCodes &&
      _.find(options.errorCodes, val => val == err.status) == null)
      ? null
      : getMockedResponse(reqHash, reqObj, data);
  if (mockRes) {
    const headers = mockRes.headers || { "Content-Type": "application/json" };
    res.writeHead(mockRes.status, headers);
    return res.end(JSON.stringify(mockRes.body));
  } else {
    return res.end(JSON.stringify(err));
  }
};

const recordAndForwardResponse = (reqHash, reqObj, res, apiRes) => {
  const oldDataStr = JSON.stringify(data);
  reqHash.forEach(item => {
    const existing = data[item];
    const resObj = {
      status: apiRes.status,
      body: apiRes.body,
      headers: apiRes.headers
    };

    const currentOutput = { req: reqObj, res: resObj };
    if (existing) {
      data[item] = _.uniqBy(_.concat(existing, currentOutput), JSON.stringify);
    } else {
      data[item] = [currentOutput];
    }
  });

  const newDataStr = JSON.stringify(data);
  if (oldDataStr !== newDataStr) {
    fs.writeFile(options.dataPath, newDataStr, () => {});
  }

  res.writeHead(apiRes.status, { ...apiRes.headers });

  res.end(apiRes.isText ? apiRes.body : JSON.stringify(apiRes.body));
};
