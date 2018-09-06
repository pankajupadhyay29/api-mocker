const fs = require("fs");
const crypto = require("crypto");
const epsilon = require("epsilonjs");
const _ = require("lodash");

const help = require("./help.json");

const _getValueFromString = strVal => {
  try {
    return JSON.parse(strVal);
  } catch {
    return strVal;
  }
};

const getArgs = args => {
  const myArgs = {};
  for (i = 0; i < args.length; i++) {
    const currentArg = args[i];
    const nextArg = i < args.length - 1 ? args[i + 1] : null;

    if (currentArg.indexOf("-") === 0) {
      const key = _.trimStart(currentArg, "-");
      if (nextArg && nextArg.indexOf("-") !== 0) {
        const value = _getValueFromString(nextArg);
        myArgs[key] = value;
        i++;
      } else {
        myArgs[key] = true;
      }
    }
  }

  return myArgs;
};

const getOptions = args => {
  const options = {};
  const mode = args.m || args.mode;

  options.port = args.p || args.port;
  options.targetUrl = args.t || args.targetUrl;
  options.errorCodes = args.e || args.errorCodes;

  options.mockOnly = mode === "mock";
  options.recordOnly = mode === "record";
  options.dataPath = args.d || args.dataPath;
  options.isCors = args.cors;
  options.allowOrigin = args.allowOrigin;
  options.allowHeaders = args.allowHeaders;
  options.allowMethods = args.allowMethods;

  if (options.errorCodes && options.errorCodes.indexOf("*") == -1) {
    options.errorCodes = options.errorCodes.split(",");
  } else {
    options.errorCodes = null;
  }

  options.sslKey = args.sslKey;
  options.sslCert = args.sslCert;

  if (!options.sslKey && !!args.keyFile) {
    options.sslKey = fs.readFileSync(args.keyFile);
    options.sslCert = fs.readFileSync(args.certFile);
  }

  options.ssl = options.sslKey && options.sslCert;

  return options;
};

const getHash = obj => {
  opts = typeof opts === "undefined" ? {} : opts;

  if (typeof obj !== "object" || !obj) {
    return null;
  }

  try {
    var hash = crypto.createHash("sha1");

    hash.update(JSON.stringify(obj));
    return hash.digest("hex");
  } catch (err) {
    return null;
  }
};

const getRequestHash = req => {
  const fullHash = getHash(req);
  const withOutHeader = getHash({ ...req, headers: "" });
  const minHash = getHash({ ...req, headers: "", body: "" });
  return [fullHash, withOutHeader, minHash];
};

const findBestMatch = (data, matchObj) => {
  const diffIndex = data.map(item => {
    return epsilon.leven(JSON.stringify(matchObj), JSON.stringify(item.req));
  });
  const minIndex = diffIndex.indexOf(Math.min(...diffIndex));
  const mock = data[Math.max(minIndex, 0)];
  return (mock || {}).res;
};

const getMockedResponse = (reqHash, reqObj, data) => {
  for (let i = 0; i < reqHash.length; i++) {
    const item = reqHash[i];
    const existing = data[item];

    if (existing) {
      if (existing.length == 0) {
        return existing[0].res;
      }

      return findBestMatch(existing, reqObj);
    }
  }
  const flatData = _(data)
    .values()
    .flatten()
    .valueOf();

  return findBestMatch(flatData, reqObj);
};

const getHelpText = () => {
  return _.keys(help)
    .map(key => {
      const item = _.get(help, key);
      return `${key} or -${item.prefix}: (default:${item.default}) -\r\n\t${
        item.helpText
      }`;
    })
    .join("\r\n\r\n");
};

const getPrintableString = obj => {
  return _(obj)
    .keys()
    .map(key => {
      const item = _.get(obj, key);
      return item
        ? `${key}: ${_.isObjectLike(item) ? getPrintableString(item) : item}`
        : "";
    })
    .compact()
    .join("\r\n")
    .valueOf();
};

module.exports = {
  getArgs,
  getOptions,
  getHash,
  getRequestHash,
  getMockedResponse,
  getHelpText,
  getPrintableString
};
