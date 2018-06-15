#!/usr/bin/env node
"use strict";
const defaults = require("./defaults.json");
const fs = require("fs");
const http = require("http");
const https = require("https");
const requester = require("request");
const _ = require("lodash");

const express = require("express");
const bodyParser = require("body-parser");

const {
  getOptions,
  getHash,
  getRequestHash,
  getMockedResponse,
  getHelpText
} = require("./utils");
const myArgs = require("optimist").argv;
const server = express();

const help = getHelpText();
if (myArgs.h || myArgs.help) {
  console.log(help);
  process.exit(0);
}

const options = _.defaults(getOptions(myArgs), defaults);

const data = fs.existsSync(options.dataPath) ? require(options.dataPath) : {};

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

server.use((req, res, next) => {
  const host = options.targetUrl.split(":");
  const url = [options.targetUrl, req.originalUrl].join("");

  const reqObj = {
    url,
    method: req.method,
    body: JSON.stringify(req.body),
    headers: req.headers
  };

  const reqHash = getRequestHash(reqObj);

  if (options.mockOnly) {
    if (_.isEmpty(data)) {
      return res
        .status(404)
        .send(
          "ERROR: No mock data found \r\n First run this with working api or provide mock data"
        );
    }
    const mockRes =
      !options.refusedOnly || err.code === "ECONNREFUSED"
        ? getMockedResponse(reqHash, reqObj, data)
        : null;
    return mockRes
      ? res.status(mockRes.statusCode).send(mockRes.body)
      : res.send(err);
  }

  const agentOptions = {
    host: host[1].substring(2),
    port: host[2],
    path: req.originalUrl,
    rejectUnauthorized: false,
    headers: req.headers,
    keepAlive: true
  };

  const agent =
    host[0] == "https"
      ? new https.Agent(agentOptions)
      : http.Agent(agentOptions);
  requester(
    {
      uri: url,
      method: req.method,
      agent: agent,
      body: JSON.stringify(req.body),
      headers: agentOptions.headers
    },
    (err, response, body) => {
      res.setHeader("Content-Type", "application/json");

      if (err) {
        const mockRes = options.recordOnly
          ? null
          : getMockedResponse(reqHash, reqObj, data);
        return mockRes
          ? res.status(mockRes.statusCode).send(mockRes.body)
          : res.send(err);
      }

      const oldDataStr = JSON.stringify(data);
      reqHash.forEach(item => {
        const existing = data[item];
        const resObj = {
          statusCode: response.statusCode,
          body: response.body
        };

        const currentOutput = { req: reqObj, res: resObj };
        if (existing) {
          data[item] = _.uniqBy(
            _.concat(existing, currentOutput),
            JSON.stringify
          );
        } else {
          data[item] = [currentOutput];
        }
      });

      const newDataStr = JSON.stringify(data);
      if (oldDataStr !== newDataStr) {
        fs.writeFile(options.dataPath, newDataStr, () => {});
      }

      res.status(response.statusCode).send(response.body);
    }
  );
});

const app = server.listen(options.port, () => {
  const { port } = app.address();
  console.info(`\n\nServer listen at http://localhost:${port} \n`);
});
