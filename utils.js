const crypto = require("crypto");
const epsilon = require("epsilonjs");
const _ = require("lodash");

const help = require("./help.json");

const getOptions = args => {
  const options = {};
  const mode = args.m || args.mode;

  options.port = args.p || args.port;
  options.targetUrl = args.t || args.targetUrl;
  options.errorCodes = args.e || args.errorCodes;

  options.mockOnly = mode === "mock";
  options.recordOnly = mode === "record";
  options.dataPath = args.d || args.dataPath;

  if (options.errorCodes && options.errorCodes.indexOf("*") == -1) {
    options.errorCodes = options.errorCodes.split(",");
  } else {
    options.errorCodes = null;
  }

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

  return data[Math.max(minIndex, 0)].res;
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
  return _
    .keys(help)
    .map(key => {
      const item = _.get(help, key);
      return `${key} or -${item.prefix}: (default:${item.default}) -\r\n\t${
        item.helpText
      }`;
    })
    .join("\r\n\r\n");
};

module.exports = {
  getOptions,
  getHash,
  getRequestHash,
  getMockedResponse,
  getHelpText
};
