module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1555145390910, function(require, module, exports) {
const storage = require("./src/storage");
const database = require("./src/db").Db;
const functions = require("./src/functions");
const wx = require("./src/wx");

function Tcb(config) {
  this.config = config ? config : this.config;
}

Tcb.prototype.init = function({
  secretId,
  secretKey,
  sessionToken,
  env,
  proxy,
  timeout,
  serviceUrl,
  isHttp
} = {}) {
  if ((secretId && !secretKey) || (!secretId && secretKey)) {
    throw Error("secretId and secretKey must be a pair");
  }

  this.config = {
    get secretId() {
      return this._secretId
        ? this._secretId
        : process.env.TENCENTCLOUD_SECRETID;
    },
    set secretId(id) {
      this._secretId = id;
    },
    get secretKey() {
      return this._secretKey
        ? this._secretKey
        : process.env.TENCENTCLOUD_SECRETKEY;
    },
    set secretKey(key) {
      this._secretKey = key;
    },
    get sessionToken() {
      if (this._sessionToken === undefined) {
        //默认临时密钥
        return process.env.TENCENTCLOUD_SESSIONTOKEN;
      } else if (this._sessionToken === false) {
        //固定秘钥
        return undefined;
      } else {
        //传入的临时密钥
        return this._sessionToken;
      }
    },
    set sessionToken(token) {
      this._sessionToken = token;
    },
    envName: env,
    proxy: proxy,
    isHttp
  };

  this.config.secretId = secretId;
  this.config.secretKey = secretKey;
  this.config.timeout = timeout || 15000;
  this.config.serviceUrl = serviceUrl;
  this.config.sessionToken = sessionToken
    ? sessionToken
    : secretId && secretKey
    ? false
    : undefined;

  return new Tcb(this.config);
};

Tcb.prototype.database = function(dbConfig) {
  return new database({ ...this, ...dbConfig });
};

function each(obj, fn) {
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      fn(obj[i], i);
    }
  }
}

function extend(target, source) {
  each(source, function(val, key) {
    target[key] = source[key];
  });
  return target;
}

extend(Tcb.prototype, functions);
extend(Tcb.prototype, storage);
extend(Tcb.prototype, wx);

module.exports = new Tcb();

}, function(modId) {var map = {"./src/storage":1555145390911,"./src/db":1555145390915,"./src/functions":1555145390945,"./src/wx":1555145390946}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390911, function(require, module, exports) {
const request = require("request");
const fs = require('fs');
const httpRequest = require("../utils/httpRequest");

/*
 * 上传文件
 * @param {string} cloudPath 上传后的文件路径
 * @param {fs.ReadStream} fileContent  上传文件的二进制流
 */
function uploadFile({ cloudPath, fileContent }, { onResponseReceived } = {}) {
  let params = {
    action: "storage.uploadFile",
    path: cloudPath,
    file: fileContent
  };

  return httpRequest({
    config: this.config,
    params,
    method: "post",
    headers: {
      // "content-type": "multipart/form-data"
    },
    callback: (response) => {
      onResponseReceived && typeof onResponseReceived === 'function' && onResponseReceived(response)
    }
  }).then((res) => {
    if (res.code) {
      return res;
    } else {
      return {
        fileID: res.data.fileID,
        requestId: res.requestId
      };
    }
  });
}

/**
 * 删除文件
 * @param {Array.<string>} fileList 文件id数组
 */
async function deleteFile({ fileList }) {
  if (!fileList || !Array.isArray(fileList)) {
    return {
      code: "INVALID_PARAM",
      message: "fileList必须是非空的数组"
    };
  }

  for (let file of fileList) {
    if (!file || typeof file != "string") {
      return {
        code: "INVALID_PARAM",
        message: "fileList的元素必须是非空的字符串"
      };
    }
  }

  let params = {
    action: "storage.batchDeleteFile",
    fileid_list: fileList
  };

  return httpRequest({
    config: this.config,
    params,
    method: "post",
    headers: {
      "content-type": "application/json"
    }
  }).then(res => {
    if (res.code) {
      return res;
    } else {
      return {
        fileList: res.data.delete_list,
        requestId: res.requestId
      };
    }
  });
}

/**
 * 获取文件下载链接
 * @param {Array.<Object>} fileList
 */
async function getTempFileURL({ fileList }) {
  if (!fileList || !Array.isArray(fileList)) {
    return {
      code: "INVALID_PARAM",
      message: "fileList必须是非空的数组"
    };
  }

  let file_list = [];
  for (let file of fileList) {
    if (typeof file === 'object') {
      if (
        !file.hasOwnProperty("fileID") ||
        !file.hasOwnProperty("maxAge")
      ) {
        return {
          code: "INVALID_PARAM",
          message: "fileList的元素必须是包含fileID和maxAge的对象"
        };
      }

      file_list.push({
        fileid: file.fileID,
        max_age: file.maxAge
      });
    } else if (typeof file === 'string') {
      file_list.push({
        fileid: file,
      });
    } else {
      return {
        code: "INVALID_PARAM",
        message: "fileList的元素必须是字符串"
      };
    }
  }

  let params = {
    action: "storage.batchGetDownloadUrl",
    file_list
  };
  // console.log(params);

  return httpRequest({
    config: this.config,
    params,
    method: "post",
    headers: {
      "content-type": "application/json"
    }
  }).then(res => {
    // console.log(res);
    if (res.code) {
      return res;
    } else {
      return {
        fileList: res.data.download_list,
        requestId: res.requestId
      };
    }
  });
}

async function downloadFile({ fileID, tempFilePath }) {
  let tmpUrl,
    self = this;
  try {
    const tmpUrlRes = await this.getTempFileURL({
      fileList: [
        {
          fileID,
          maxAge: 600
        }
      ]
    });
    // console.log(tmpUrlRes);
    const res = tmpUrlRes.fileList[0]

    if (
      res.code != 'SUCCESS'
    ) {
      return res;
    }

    tmpUrl = res.tempFileURL;
    tmpUrl = encodeURI(tmpUrl);
  } catch (e) {
    throw e
  }

  let req = request({
    url: tmpUrl,
    encoding: null,
    proxy: self.config.proxy
  });

  return new Promise((resolve, reject) => {
    let fileContent = Buffer.alloc(0)
    req.on('response', function (response) {
      if (response && +response.statusCode === 200) {
        if (tempFilePath) {
          response.pipe(fs.createWriteStream(tempFilePath));
        } else {
          response.on('data', (data) => {
            fileContent = Buffer.concat([fileContent, data])
          })
        }
        response.on('end', () => {
          resolve({
            fileContent: tempFilePath ? undefined : fileContent,
            message: '文件下载完成'
          })
        })
      } else {
        reject(response)
      }
    });
  });
}

exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
exports.getTempFileURL = getTempFileURL;
exports.downloadFile = downloadFile;

}, function(modId) { var map = {"../utils/httpRequest":1555145390912}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390912, function(require, module, exports) {
var request = require("request");
var auth = require("./auth.js");
const version = require("../../package.json").version;

module.exports = function(args) {
  var config = args.config,
    params = args.params,
    method = args.method || "get",
    protocol = config.isHttp === true ? "http" : "https";

  const eventId =
    new Date().valueOf() +
    "_" +
    Math.random()
      .toString()
      .substr(2, 5);

  params = Object.assign({}, params, {
    envName: config.envName,
    timestamp: new Date().valueOf(),
    eventId
  });

  for (let key in params) {
    if (params[key] === undefined) {
      delete params[key];
    }
  }
  // file 和 wx.openApi带的requestData 需避开签名
  let file = null;
  if (params.action === "storage.uploadFile") {
    file = params["file"];
    delete params["file"];
  }

  let requestData = null;
  if (params.action === "wx.openApi") {
    requestData = params["requestData"];
    delete params["requestData"];
  }

  if (!config.secretId || !config.secretKey) {
    if (process.env.TENCENTCLOUD_RUNENV === "SCF") {
      throw Error("missing authoration key, redeploy the function");
    }
    throw Error("missing secretId or secretKey of tencent cloud");
  }

  const authObj = {
    SecretId: config.secretId,
    SecretKey: config.secretKey,
    Method: method,
    pathname: "/admin",
    Query: params,
    Headers: Object.assign(
      {
        "user-agent": `tcb-admin-sdk/${version}`
      },
      args.headers || {}
    )
  };

  var authorization = auth.getAuth(authObj);

  params.authorization = authorization;

  file && (params.file = file);
  requestData && (params.requestData = requestData);
  config.sessionToken && (params.sessionToken = config.sessionToken);
  params.sdk_version = version;

  let url = protocol + "://tcb-admin.tencentcloudapi.com/admin";
  // url = 'http://localhost:8002/admin'

  if (process.env.TENCENTCLOUD_RUNENV === "SCF") {
    protocol = "http";
    url = protocol + "://tcb-admin.tencentyun.com/admin";
  }

  if (params.action === "wx.api" || params.action === "wx.openApi") {
    url = protocol + "://tcb-open.tencentcloudapi.com/admin";
    // url = "http://localhost:8002/admin";
  }

  var opts = {
    url: config.serviceUrl || url,
    method: args.method || "get",
    // 先取模块的timeout，没有则取sdk的timeout，还没有就使用默认值
    timeout: args.timeout || config.timeout || 15000,
    headers: authObj.Headers,
    proxy: config.proxy
  };

  opts.url = `${opts.url}?eventId=${eventId}`;

  if (params.action === "storage.uploadFile") {
    opts.formData = params;
    opts.formData.file = {
      value: params.file,
      options: {
        filename: params.path
      }
    };
  } else if (args.method == "post") {
    if (params.action === "wx.openApi") {
      opts.formData = params;
      opts.encoding = null;
    } else {
      opts.body = params;
      opts.json = true;
    }
  } else {
    opts.qs = params;
  }

  if (args.proxy) {
    opts.proxy = args.proxy;
  }
  // opts.proxy = "http://web-proxy.tencent.com:8080";
  // console.log(JSON.stringify(opts));
  return new Promise(function(resolve, reject) {
    request(opts, function(err, response, body) {
      args && args.callback && args.callback(response);

      if (err === null && response.statusCode == 200) {
        let res;
        try {
          res = typeof body === "string" ? JSON.parse(body) : body;
          // wx.openApi 调用时，需用content-type区分buffer or JSON
          if (params.action === "wx.openApi") {
            const { headers } = response;
            if (headers["content-type"] === "application/json; charset=utf-8") {
              res = JSON.parse(res.toString()); // JSON错误时buffer转JSON
            }
          }
        } catch (e) {
          res = body;
        }
        return resolve(res);
      } else {
        return reject(err);
      }
    });
  });
};

}, function(modId) { var map = {"./auth.js":1555145390913,"../../package.json":1555145390914}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390913, function(require, module, exports) {
var crypto = require("crypto");

function camSafeUrlEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}
function map(obj, fn) {
  var o = isArray(obj) ? [] : {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = fn(obj[i], i);
    }
  }
  return o;
}
function isArray(arr) {
  return arr instanceof Array;
}

function clone(obj) {
  return map(obj, function(v) {
    return typeof v === "object" && v !== undefined && v !== null
      ? clone(v)
      : v;
  });
}
//测试用的key后面可以去掉
var getAuth = function(opt) {
  //   console.log(opt);
  opt = opt || {};

  var SecretId = opt.SecretId;
  var SecretKey = opt.SecretKey;
  var method = (opt.method || opt.Method || "get").toLowerCase();
  var pathname = opt.pathname || "/";
  var queryParams = clone(opt.Query || opt.params || {});
  var headers = clone(opt.Headers || opt.headers || {});
  pathname.indexOf("/") !== 0 && (pathname = "/" + pathname);

  if (!SecretId) return console.error("missing param SecretId");
  if (!SecretKey) return console.error("missing param SecretKey");

  var getObjectKeys = function(obj) {
    var list = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] === undefined) {
          continue;
        }
        list.push(key);
      }
    }
    return list.sort();
  };

  var obj2str = function(obj) {
    var i, key, val;
    var list = [];
    var keyList = getObjectKeys(obj);
    for (i = 0; i < keyList.length; i++) {
      key = keyList[i];
      if (obj[key] === undefined) {
        continue;
      }
      val = obj[key] === null ? "" : obj[key];
      if (typeof val !== "string") {
        val = JSON.stringify(val);
      }
      key = key.toLowerCase();
      key = camSafeUrlEncode(key);
      val = camSafeUrlEncode(val) || "";
      list.push(key + "=" + val);
    }
    return list.join("&");
  };

  // 签名有效起止时间
  var now = parseInt(new Date().getTime() / 1000) - 1;
  var exp = now;

  var Expires = opt.Expires || opt.expires;
  if (Expires === undefined) {
    exp += 900; // 签名过期时间为当前 + 900s
  } else {
    exp += Expires * 1 || 0;
  }

  // 要用到的 Authorization 参数列表
  var qSignAlgorithm = "sha1";
  var qAk = SecretId;
  var qSignTime = now + ";" + exp;
  var qKeyTime = now + ";" + exp;
  var qHeaderList = getObjectKeys(headers)
    .join(";")
    .toLowerCase();
  var qUrlParamList = getObjectKeys(queryParams)
    .join(";")
    .toLowerCase();

  // 签名算法说明文档：https://www.qcloud.com/document/product/436/7778
  // 步骤一：计算 SignKey
  var signKey = crypto
    .createHmac("sha1", SecretKey)
    .update(qKeyTime)
    .digest("hex");

  // console.log("queryParams", queryParams);
  // console.log(obj2str(queryParams));

  // 步骤二：构成 FormatString
  var formatString = [
    method,
    pathname,
    obj2str(queryParams),
    obj2str(headers),
    ""
  ].join("\n");

  // console.log(formatString);
  formatString = Buffer.from(formatString, "utf8");

  // 步骤三：计算 StringToSign
  var sha1Algo = crypto.createHash("sha1");
  sha1Algo.update(formatString);
  var res = sha1Algo.digest("hex");
  var stringToSign = ["sha1", qSignTime, res, ""].join("\n");

  // console.log(stringToSign);
  // 步骤四：计算 Signature
  var qSignature = crypto
    .createHmac("sha1", signKey)
    .update(stringToSign)
    .digest("hex");

  // 步骤五：构造 Authorization
  var authorization = [
    "q-sign-algorithm=" + qSignAlgorithm,
    "q-ak=" + qAk,
    "q-sign-time=" + qSignTime,
    "q-key-time=" + qKeyTime,
    "q-header-list=" + qHeaderList,
    "q-url-param-list=" + qUrlParamList,
    "q-signature=" + qSignature
  ].join("&");

  return authorization;
};

exports.getAuth = getAuth;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390914, function(require, module, exports) {
module.exports = {
  "_from": "tcb-admin-node@1.4.6",
  "_id": "tcb-admin-node@1.4.6",
  "_inBundle": false,
  "_integrity": "sha1-UHZwXV/L7QL7tyBGn/UYxQ2Pkw4=",
  "_location": "/tcb-admin-node",
  "_phantomChildren": {},
  "_requested": {
    "type": "version",
    "registry": true,
    "raw": "tcb-admin-node@1.4.6",
    "name": "tcb-admin-node",
    "escapedName": "tcb-admin-node",
    "rawSpec": "1.4.6",
    "saveSpec": null,
    "fetchSpec": "1.4.6"
  },
  "_requiredBy": [
    "/wx-server-sdk"
  ],
  "_resolved": "http://r.cnpmjs.org/tcb-admin-node/download/tcb-admin-node-1.4.6.tgz",
  "_shasum": "5076705d5fcbed02fbb720469ff518c50d8f930e",
  "_spec": "tcb-admin-node@1.4.6",
  "_where": "C:\\Users\\duanw\\Music\\微信小程序开发\\云函数\\trueFinish\\miniprogram\\node_modules\\wx-server-sdk",
  "author": {
    "name": "jimmyzhang"
  },
  "bugs": {
    "url": "https://github.com/TencentCloudBase/tcb-admin-node/issues"
  },
  "bundleDependencies": false,
  "dependencies": {
    "is-regex": "^1.0.4",
    "lodash.merge": "^4.6.1",
    "request": "^2.87.0"
  },
  "deprecated": false,
  "description": "tencent cloud base admin sdk for node.js",
  "devDependencies": {
    "@types/jest": "^23.1.4",
    "@types/mocha": "^5.2.4",
    "@types/node": "^10.12.12",
    "dumper.js": "^1.3.0",
    "espower-typescript": "^8.1.4",
    "jest": "^23.3.0",
    "mocha": "^5.2.0",
    "power-assert": "^1.5.0",
    "ts-jest": "^23.10.4",
    "tslib": "^1.7.1",
    "typescript": "^2.3.4"
  },
  "engines": {
    "node": ">=8.6.0"
  },
  "homepage": "https://github.com/TencentCloudBase/tcb-admin-node#readme",
  "keywords": [
    "tcb-admin"
  ],
  "license": "MIT",
  "main": "index.js",
  "name": "tcb-admin-node",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/TencentCloudBase/tcb-admin-node.git"
  },
  "scripts": {
    "coverage": "jest --verbose false --coverage",
    "test": "jest --verbose false -i",
    "tsc": "tsc -p tsconfig.json",
    "tsc:w": "tsc -p tsconfig.json -w",
    "tstest": "mocha --require espower-typescript/guess test/**/*.test.ts"
  },
  "version": "1.4.6"
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390915, function(require, module, exports) {
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./db"));

}, function(modId) { var map = {"./db":1555145390916}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390916, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Geo = require("./geo");
const collection_1 = require("./collection");
const command_1 = require("./command");
const serverDate_1 = require("./serverDate");
const request_1 = require("./request");
const regexp_1 = require("./regexp");
class Db {
    constructor(config) {
        this.config = config;
        this.Geo = Geo;
        this.serverDate = serverDate_1.ServerDateConstructor;
        this.command = command_1.Command;
        this.RegExp = regexp_1.RegExpConstructor;
    }
    collection(collName) {
        if (!collName) {
            throw new Error("Collection name is required");
        }
        return new collection_1.CollectionReference(this, collName);
    }
    createCollection(collName) {
        let request = new request_1.Request(this);
        const params = {
            collectionName: collName
        };
        return request.send("addCollection", params);
    }
}
exports.Db = Db;

}, function(modId) { var map = {"./geo":1555145390917,"./collection":1555145390931,"./command":1555145390943,"./serverDate":1555145390922,"./request":1555145390933,"./regexp":1555145390944}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390917, function(require, module, exports) {
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./point"));
__export(require("./lineString"));
__export(require("./polygon"));
__export(require("./multiPoint"));
__export(require("./multiLineString"));
__export(require("./multiPolygon"));

}, function(modId) { var map = {"./point":1555145390918,"./lineString":1555145390926,"./polygon":1555145390927,"./multiPoint":1555145390928,"./multiLineString":1555145390929,"./multiPolygon":1555145390930}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390918, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validate_1 = require("../validate");
const symbol_1 = require("../helper/symbol");
const type_1 = require("../utils/type");
class Point {
    constructor(longitude, latitude) {
        validate_1.Validate.isGeopoint("longitude", longitude);
        validate_1.Validate.isGeopoint("latitude", latitude);
        this.longitude = longitude;
        this.latitude = latitude;
    }
    parse(key) {
        return {
            [key]: {
                type: 'Point',
                coordinates: [this.longitude, this.latitude]
            }
        };
    }
    toJSON() {
        return {
            type: 'Point',
            coordinates: [
                this.longitude,
                this.latitude,
            ],
        };
    }
    toReadableString() {
        return `[${this.longitude},${this.latitude}]`;
    }
    static validate(point) {
        return point.type === 'Point' &&
            type_1.isArray(point.coordinates) &&
            validate_1.Validate.isGeopoint('longitude', point.coordinates[0]) &&
            validate_1.Validate.isGeopoint('latitude', point.coordinates[1]);
    }
    get _internalType() {
        return symbol_1.SYMBOL_GEO_POINT;
    }
}
exports.Point = Point;

}, function(modId) { var map = {"../validate":1555145390919,"../helper/symbol":1555145390923,"../utils/type":1555145390925}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390919, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constant_1 = require("./constant");
const util_1 = require("./util");
class Validate {
    static isGeopoint(point, degree) {
        if (util_1.Util.whichType(degree) !== constant_1.FieldType.Number) {
            throw new Error("Geo Point must be number type");
        }
        const degreeAbs = Math.abs(degree);
        if (point === "latitude" && degreeAbs > 90) {
            throw new Error("latitude should be a number ranges from -90 to 90");
        }
        else if (point === "longitude" && degreeAbs > 180) {
            throw new Error("longitude should be a number ranges from -180 to 180");
        }
        return true;
    }
    static isInteger(param, num) {
        if (!Number.isInteger(num)) {
            throw new Error(param + constant_1.ErrorCode.IntergerError);
        }
        return true;
    }
    static isFieldOrder(direction) {
        if (constant_1.OrderDirectionList.indexOf(direction) === -1) {
            throw new Error(constant_1.ErrorCode.DirectionError);
        }
        return true;
    }
    static isFieldPath(path) {
        if (!/^[a-zA-Z0-9-_\.]/.test(path)) {
            throw new Error();
        }
        return true;
    }
    static isOperator(op) {
        if (constant_1.WhereFilterOpList.indexOf(op) === -1) {
            throw new Error(constant_1.ErrorCode.OpStrError);
        }
        return true;
    }
    static isCollName(name) {
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-_]){1,32}$/.test(name)) {
            throw new Error(constant_1.ErrorCode.CollNameError);
        }
        return true;
    }
    static isDocID(docId) {
        if (!/^([a-fA-F0-9]){24}$/.test(docId)) {
            throw new Error(constant_1.ErrorCode.DocIDError);
        }
        return true;
    }
}
exports.Validate = Validate;

}, function(modId) { var map = {"./constant":1555145390920,"./util":1555145390921}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390920, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["DocIDError"] = "\u6587\u6863ID\u4E0D\u5408\u6CD5";
    ErrorCode["CollNameError"] = "\u96C6\u5408\u540D\u79F0\u4E0D\u5408\u6CD5";
    ErrorCode["OpStrError"] = "\u64CD\u4F5C\u7B26\u4E0D\u5408\u6CD5";
    ErrorCode["DirectionError"] = "\u6392\u5E8F\u5B57\u7B26\u4E0D\u5408\u6CD5";
    ErrorCode["IntergerError"] = "must be integer";
})(ErrorCode || (ErrorCode = {}));
exports.ErrorCode = ErrorCode;
const FieldType = {
    String: "String",
    Number: "Number",
    Object: "Object",
    Array: "Array",
    Boolean: "Boolean",
    Null: "Null",
    GeoPoint: "GeoPoint",
    GeoLineString: "GeoLineString",
    GeoPolygon: "GeoPolygon",
    GeoMultiPoint: "GeoMultiPoint",
    GeoMultiLineString: "GeoMultiLineString",
    GeoMultiPolygon: "GeoMultiPolygon",
    Timestamp: "Date",
    Command: "Command",
    ServerDate: "ServerDate"
};
exports.FieldType = FieldType;
const OrderDirectionList = ["desc", "asc"];
exports.OrderDirectionList = OrderDirectionList;
const WhereFilterOpList = ["<", "<=", "==", ">=", ">"];
exports.WhereFilterOpList = WhereFilterOpList;
var Opeartor;
(function (Opeartor) {
    Opeartor["lt"] = "<";
    Opeartor["gt"] = ">";
    Opeartor["lte"] = "<=";
    Opeartor["gte"] = ">=";
    Opeartor["eq"] = "==";
})(Opeartor || (Opeartor = {}));
exports.Opeartor = Opeartor;
const OperatorMap = {
    [Opeartor.eq]: "$eq",
    [Opeartor.lt]: "$lt",
    [Opeartor.lte]: "$lte",
    [Opeartor.gt]: "$gt",
    [Opeartor.gte]: "$gte"
};
exports.OperatorMap = OperatorMap;
const UpdateOperatorList = [
    "$set",
    "$inc",
    "$mul",
    "$unset",
    "$push",
    "$pop",
    "$unshift",
    "$shift",
    "$currentDate",
    "$each",
    "$position"
];
exports.UpdateOperatorList = UpdateOperatorList;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390921, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constant_1 = require("./constant");
const geo_1 = require("./geo");
const serverDate_1 = require("./serverDate");
class Util {
}
Util.formatResDocumentData = (documents) => {
    return documents.map(document => {
        return Util.formatField(document);
    });
};
Util.formatField = document => {
    const keys = Object.keys(document);
    let protoField = {};
    if (Array.isArray(document)) {
        protoField = [];
    }
    keys.forEach(key => {
        const item = document[key];
        const type = Util.whichType(item);
        let realValue;
        switch (type) {
            case constant_1.FieldType.GeoPoint:
                realValue = new geo_1.Point(item.coordinates[0], item.coordinates[1]);
                break;
            case constant_1.FieldType.GeoLineString:
                realValue = new geo_1.LineString(item.coordinates.map(point => new geo_1.Point(point[0], point[1])));
                break;
            case constant_1.FieldType.GeoPolygon:
                realValue = new geo_1.Polygon(item.coordinates.map(line => new geo_1.LineString(line.map(([lng, lat]) => new geo_1.Point(lng, lat)))));
                break;
            case constant_1.FieldType.GeoMultiPoint:
                realValue = new geo_1.MultiPoint(item.coordinates.map(point => new geo_1.Point(point[0], point[1])));
                break;
            case constant_1.FieldType.GeoMultiLineString:
                realValue = new geo_1.MultiLineString(item.coordinates.map(line => new geo_1.LineString(line.map(([lng, lat]) => new geo_1.Point(lng, lat)))));
                break;
            case constant_1.FieldType.GeoMultiPolygon:
                realValue = new geo_1.MultiPolygon(item.coordinates.map(polygon => new geo_1.Polygon(polygon.map(line => new geo_1.LineString(line.map(([lng, lat]) => new geo_1.Point(lng, lat)))))));
                break;
            case constant_1.FieldType.Timestamp:
                realValue = new Date(item.$timestamp * 1000);
                break;
            case constant_1.FieldType.Object:
            case constant_1.FieldType.Array:
                realValue = Util.formatField(item);
                break;
            case constant_1.FieldType.ServerDate:
                realValue = new Date(item.$date);
                break;
            default:
                realValue = item;
        }
        if (Array.isArray(protoField)) {
            protoField.push(realValue);
        }
        else {
            protoField[key] = realValue;
        }
    });
    return protoField;
};
Util.whichType = (obj) => {
    let type = Object.prototype.toString.call(obj).slice(8, -1);
    if (type === constant_1.FieldType.Object) {
        if (obj instanceof geo_1.Point) {
            return constant_1.FieldType.GeoPoint;
        }
        else if (obj instanceof Date) {
            return constant_1.FieldType.Timestamp;
        }
        else if (obj instanceof serverDate_1.ServerDate) {
            return constant_1.FieldType.ServerDate;
        }
        if (obj.$timestamp) {
            type = constant_1.FieldType.Timestamp;
        }
        else if (obj.$date) {
            type = constant_1.FieldType.ServerDate;
        }
        else if (geo_1.Point.validate(obj)) {
            type = constant_1.FieldType.GeoPoint;
        }
        else if (geo_1.LineString.validate(obj)) {
            type = constant_1.FieldType.GeoLineString;
        }
        else if (geo_1.Polygon.validate(obj)) {
            type = constant_1.FieldType.GeoPolygon;
        }
        else if (geo_1.MultiPoint.validate(obj)) {
            type = constant_1.FieldType.GeoMultiPoint;
        }
        else if (geo_1.MultiLineString.validate(obj)) {
            type = constant_1.FieldType.GeoMultiLineString;
        }
        else if (geo_1.MultiPolygon.validate(obj)) {
            type = constant_1.FieldType.GeoMultiPolygon;
        }
    }
    return type;
};
Util.generateDocId = () => {
    let chars = "ABCDEFabcdef0123456789";
    let autoId = "";
    for (let i = 0; i < 24; i++) {
        autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
};
exports.Util = Util;

}, function(modId) { var map = {"./constant":1555145390920,"./geo":1555145390917,"./serverDate":1555145390922}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390922, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
class ServerDate {
    constructor({ offset = 0 } = {}) {
        this.offset = offset;
    }
    get _internalType() {
        return symbol_1.SYMBOL_SERVER_DATE;
    }
    parse() {
        return {
            $date: {
                offset: this.offset
            }
        };
    }
}
exports.ServerDate = ServerDate;
function ServerDateConstructor(opt) {
    return new ServerDate(opt);
}
exports.ServerDateConstructor = ServerDateConstructor;

}, function(modId) { var map = {"../helper/symbol":1555145390923}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390923, function(require, module, exports) {
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../utils/symbol");
__export(require("../utils/symbol"));
exports.SYMBOL_UNSET_FIELD_NAME = symbol_1.default.for('UNSET_FIELD_NAME');
exports.SYMBOL_UPDATE_COMMAND = symbol_1.default.for('UPDATE_COMMAND');
exports.SYMBOL_QUERY_COMMAND = symbol_1.default.for('QUERY_COMMAND');
exports.SYMBOL_LOGIC_COMMAND = symbol_1.default.for('LOGIC_COMMAND');
exports.SYMBOL_GEO_POINT = symbol_1.default.for('GEO_POINT');
exports.SYMBOL_GEO_LINE_STRING = symbol_1.default.for('SYMBOL_GEO_LINE_STRING');
exports.SYMBOL_GEO_POLYGON = symbol_1.default.for('SYMBOL_GEO_POLYGON');
exports.SYMBOL_GEO_MULTI_POINT = symbol_1.default.for('SYMBOL_GEO_MULTI_POINT');
exports.SYMBOL_GEO_MULTI_LINE_STRING = symbol_1.default.for('SYMBOL_GEO_MULTI_LINE_STRING');
exports.SYMBOL_GEO_MULTI_POLYGON = symbol_1.default.for('SYMBOL_GEO_MULTI_POLYGON');
exports.SYMBOL_SERVER_DATE = symbol_1.default.for('SERVER_DATE');
exports.SYMBOL_REGEXP = symbol_1.default.for('REGEXP');

}, function(modId) { var map = {"../utils/symbol":1555145390924}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390924, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _symbols = [];
const __internalMark__ = {};
class HiddenSymbol {
    constructor(target) {
        Object.defineProperties(this, {
            target: {
                enumerable: false,
                writable: false,
                configurable: false,
                value: target,
            },
        });
    }
}
class InternalSymbol extends HiddenSymbol {
    constructor(target, __mark__) {
        if (__mark__ !== __internalMark__) {
            throw new TypeError('InternalSymbol cannot be constructed with new operator');
        }
        super(target);
    }
    static for(target) {
        for (let i = 0, len = _symbols.length; i < len; i++) {
            if (_symbols[i].target === target) {
                return _symbols[i].instance;
            }
        }
        const symbol = new InternalSymbol(target, __internalMark__);
        _symbols.push({
            target,
            instance: symbol,
        });
        return symbol;
    }
}
exports.InternalSymbol = InternalSymbol;
exports.default = InternalSymbol;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390925, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("./symbol");
exports.getType = (x) => Object.prototype.toString.call(x).slice(8, -1).toLowerCase();
exports.isObject = (x) => exports.getType(x) === 'object';
exports.isString = (x) => exports.getType(x) === 'string';
exports.isNumber = (x) => exports.getType(x) === 'number';
exports.isPromise = (x) => exports.getType(x) === 'promise';
exports.isFunction = (x) => typeof x === 'function';
exports.isArray = (x) => Array.isArray(x);
exports.isDate = (x) => exports.getType(x) === 'date';
exports.isRegExp = (x) => exports.getType(x) === 'regexp';
exports.isInternalObject = (x) => x && (x._internalType instanceof symbol_1.InternalSymbol);
exports.isPlainObject = (obj) => {
    if (typeof obj !== 'object' || obj === null)
        return false;
    let proto = obj;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(obj) === proto;
};

}, function(modId) { var map = {"./symbol":1555145390924}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390926, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
const point_1 = require("./point");
const type_1 = require("../utils/type");
class LineString {
    constructor(points) {
        if (!type_1.isArray(points)) {
            throw new TypeError(`"points" must be of type Point[]. Received type ${typeof points}`);
        }
        if (points.length < 2) {
            throw new Error(`"points" must contain 2 points at least`);
        }
        points.forEach(point => {
            if (!(point instanceof point_1.Point)) {
                throw new TypeError(`"points" must be of type Point[]. Received type ${typeof point}[]`);
            }
        });
        this.points = points;
    }
    parse(key) {
        return {
            [key]: {
                type: 'LineString',
                coordinates: this.points.map(point => point.toJSON().coordinates)
            }
        };
    }
    toJSON() {
        return {
            type: 'LineString',
            coordinates: this.points.map(point => point.toJSON().coordinates)
        };
    }
    static validate(lineString) {
        if (lineString.type !== 'LineString' || !type_1.isArray(lineString.coordinates)) {
            return false;
        }
        for (let point of lineString.coordinates) {
            if (!type_1.isNumber(point[0]) || !type_1.isNumber(point[1])) {
                return false;
            }
        }
        return true;
    }
    static isClosed(lineString) {
        const firstPoint = lineString.points[0];
        const lastPoint = lineString.points[lineString.points.length - 1];
        if (firstPoint.latitude === lastPoint.latitude && firstPoint.longitude === lastPoint.longitude) {
            return true;
        }
    }
    get _internalType() {
        return symbol_1.SYMBOL_GEO_LINE_STRING;
    }
}
exports.LineString = LineString;

}, function(modId) { var map = {"../helper/symbol":1555145390923,"./point":1555145390918,"../utils/type":1555145390925}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390927, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
const type_1 = require("../utils/type");
const lineString_1 = require("./lineString");
class Polygon {
    constructor(lines) {
        if (!type_1.isArray(lines)) {
            throw new TypeError(`"lines" must be of type LineString[]. Received type ${typeof lines}`);
        }
        if (lines.length === 0) {
            throw new Error("Polygon must contain 1 linestring at least");
        }
        lines.forEach(line => {
            if (!(line instanceof lineString_1.LineString)) {
                throw new TypeError(`"lines" must be of type LineString[]. Received type ${typeof line}[]`);
            }
            if (!lineString_1.LineString.isClosed(line)) {
                throw new Error(`LineString ${line.points.map(p => p.toReadableString())} is not a closed cycle`);
            }
        });
        this.lines = lines;
    }
    parse(key) {
        return {
            [key]: {
                type: 'Polygon',
                coordinates: this.lines.map(line => {
                    return line.points.map(point => [point.longitude, point.latitude]);
                })
            }
        };
    }
    toJSON() {
        return {
            type: 'Polygon',
            coordinates: this.lines.map(line => {
                return line.points.map(point => [point.longitude, point.latitude]);
            })
        };
    }
    static validate(polygon) {
        if (polygon.type !== 'Polygon' || !type_1.isArray(polygon.coordinates)) {
            return false;
        }
        for (let line of polygon.coordinates) {
            if (!this.isCloseLineString(line)) {
                return false;
            }
            for (let point of line) {
                if (!type_1.isNumber(point[0]) || !type_1.isNumber(point[1])) {
                    return false;
                }
            }
        }
        return true;
    }
    static isCloseLineString(lineString) {
        const firstPoint = lineString[0];
        const lastPoint = lineString[lineString.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            return false;
        }
        return true;
    }
    get _internalType() {
        return symbol_1.SYMBOL_GEO_MULTI_POLYGON;
    }
}
exports.Polygon = Polygon;

}, function(modId) { var map = {"../helper/symbol":1555145390923,"../utils/type":1555145390925,"./lineString":1555145390926}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390928, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
const point_1 = require("./point");
const type_1 = require("../utils/type");
class MultiPoint {
    constructor(points) {
        if (!type_1.isArray(points)) {
            throw new TypeError(`"points" must be of type Point[]. Received type ${typeof points}`);
        }
        if (points.length === 0) {
            throw new Error(`"points" must contain 1 point at least`);
        }
        points.forEach(point => {
            if (!(point instanceof point_1.Point)) {
                throw new TypeError(`"points" must be of type Point[]. Received type ${typeof point}[]`);
            }
        });
        this.points = points;
    }
    parse(key) {
        return {
            [key]: {
                type: 'MultiPoint',
                coordinates: this.points.map(point => point.toJSON().coordinates)
            }
        };
    }
    toJSON() {
        return {
            type: 'MultiPoint',
            coordinates: this.points.map(point => point.toJSON().coordinates)
        };
    }
    static validate(multiPoint) {
        if (multiPoint.type !== 'MultiPoint' || !type_1.isArray(multiPoint.coordinates)) {
            return false;
        }
        for (let point of multiPoint.coordinates) {
            if (!type_1.isNumber(point[0]) || !type_1.isNumber(point[1])) {
                return false;
            }
        }
        return true;
    }
    get _internalType() {
        return symbol_1.SYMBOL_GEO_MULTI_POINT;
    }
}
exports.MultiPoint = MultiPoint;

}, function(modId) { var map = {"../helper/symbol":1555145390923,"./point":1555145390918,"../utils/type":1555145390925}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390929, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
const type_1 = require("../utils/type");
const lineString_1 = require("./lineString");
class MultiLineString {
    constructor(lines) {
        if (!type_1.isArray(lines)) {
            throw new TypeError(`"lines" must be of type LineString[]. Received type ${typeof lines}`);
        }
        if (lines.length === 0) {
            throw new Error("Polygon must contain 1 linestring at least");
        }
        lines.forEach(line => {
            if (!(line instanceof lineString_1.LineString)) {
                throw new TypeError(`"lines" must be of type LineString[]. Received type ${typeof line}[]`);
            }
        });
        this.lines = lines;
    }
    parse(key) {
        return {
            [key]: {
                type: 'MultiLineString',
                coordinates: this.lines.map(line => {
                    return line.points.map(point => [point.longitude, point.latitude]);
                })
            }
        };
    }
    toJSON() {
        return {
            type: 'MultiLineString',
            coordinates: this.lines.map(line => {
                return line.points.map(point => [point.longitude, point.latitude]);
            })
        };
    }
    static validate(multiLineString) {
        if (multiLineString.type !== 'MultiLineString' || !type_1.isArray(multiLineString.coordinates)) {
            return false;
        }
        for (let line of multiLineString.coordinates) {
            for (let point of line) {
                if (!type_1.isNumber(point[0]) || !type_1.isNumber(point[1])) {
                    return false;
                }
            }
        }
        return true;
    }
    get _internalType() {
        return symbol_1.SYMBOL_GEO_MULTI_LINE_STRING;
    }
}
exports.MultiLineString = MultiLineString;

}, function(modId) { var map = {"../helper/symbol":1555145390923,"../utils/type":1555145390925,"./lineString":1555145390926}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390930, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
const type_1 = require("../utils/type");
const polygon_1 = require("./polygon");
class MultiPolygon {
    constructor(polygons) {
        if (!type_1.isArray(polygons)) {
            throw new TypeError(`"polygons" must be of type Polygon[]. Received type ${typeof polygons}`);
        }
        if (polygons.length === 0) {
            throw new Error("MultiPolygon must contain 1 polygon at least");
        }
        for (let polygon of polygons) {
            if (!(polygon instanceof polygon_1.Polygon)) {
                throw new TypeError(`"polygon" must be of type Polygon[]. Received type ${typeof polygon}[]`);
            }
        }
        this.polygons = polygons;
    }
    parse(key) {
        return {
            [key]: {
                type: 'MultiPolygon',
                coordinates: this.polygons.map(polygon => {
                    return polygon.lines.map(line => {
                        return line.points.map(point => [point.longitude, point.latitude]);
                    });
                })
            }
        };
    }
    toJSON() {
        return {
            type: 'MultiPolygon',
            coordinates: this.polygons.map(polygon => {
                return polygon.lines.map(line => {
                    return line.points.map(point => [point.longitude, point.latitude]);
                });
            })
        };
    }
    static validate(multiPolygon) {
        if (multiPolygon.type !== 'MultiPolygon' || !type_1.isArray(multiPolygon.coordinates)) {
            return false;
        }
        for (let polygon of multiPolygon.coordinates) {
            for (let line of polygon) {
                for (let point of line) {
                    if (!type_1.isNumber(point[0]) || !type_1.isNumber(point[1])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    get _internalType() {
        return symbol_1.SYMBOL_GEO_POLYGON;
    }
}
exports.MultiPolygon = MultiPolygon;

}, function(modId) { var map = {"../helper/symbol":1555145390923,"../utils/type":1555145390925,"./polygon":1555145390927}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390931, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const document_1 = require("./document");
const query_1 = require("./query");
class CollectionReference extends query_1.Query {
    constructor(db, coll) {
        super(db, coll);
    }
    get name() {
        return this._coll;
    }
    doc(docID) {
        return new document_1.DocumentReference(this._db, this._coll, docID);
    }
    add(data) {
        let docRef = this.doc();
        return docRef.create(data);
    }
}
exports.CollectionReference = CollectionReference;

}, function(modId) { var map = {"./document":1555145390932,"./query":1555145390941}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390932, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("./request");
const util_1 = require("./util");
const update_1 = require("./serializer/update");
const datatype_1 = require("./serializer/datatype");
const update_2 = require("./commands/update");
class DocumentReference {
    constructor(db, coll, docID, projection = {}) {
        this._db = db;
        this._coll = coll;
        this.id = docID;
        this.request = new request_1.Request(this._db);
        this.projection = projection;
    }
    create(data) {
        let params = {
            collectionName: this._coll,
            data: datatype_1.serialize(data)
        };
        if (this.id) {
            params["_id"] = this.id;
        }
        return new Promise(resolve => {
            this.request.send("addDocument", params).then(res => {
                if (res.code) {
                    resolve(res);
                    return;
                }
                else {
                    resolve({
                        id: res.data._id,
                        requestId: res.requestId
                    });
                }
            });
        });
    }
    set(data) {
        if (!data || typeof data !== "object") {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '参数必需是非空对象'
            });
        }
        if (data.hasOwnProperty('_id')) {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '不能更新_id的值'
            });
        }
        let hasOperator = false;
        const checkMixed = (objs) => {
            if (typeof objs === 'object') {
                for (let key in objs) {
                    if (objs[key] instanceof update_2.UpdateCommand) {
                        hasOperator = true;
                    }
                    else if (typeof objs[key] === 'object') {
                        checkMixed(objs[key]);
                    }
                }
            }
        };
        checkMixed(data);
        if (hasOperator) {
            return Promise.resolve({
                code: 'DATABASE_REQUEST_FAILED',
                message: 'update operator complicit'
            });
        }
        const merge = false;
        let param = {
            collectionName: this._coll,
            data: datatype_1.serialize(data),
            multi: false,
            merge,
            upsert: true
        };
        if (this.id) {
            param["query"] = { _id: this.id };
        }
        return new Promise(resolve => {
            this.request.send("updateDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        updated: res.data.updated,
                        upsertedId: res.data.upserted_id,
                        requestId: res.requestId
                    });
                }
            });
        });
    }
    update(data) {
        if (!data || typeof data !== "object") {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '参数必需是非空对象'
            });
        }
        if (data.hasOwnProperty('_id')) {
            return Promise.resolve({
                code: 'INVALID_PARAM',
                message: '不能更新_id的值'
            });
        }
        const query = { _id: this.id };
        const merge = true;
        const param = {
            collectionName: this._coll,
            data: update_1.UpdateSerializer.encode(data),
            query: query,
            multi: false,
            merge,
            upsert: false
        };
        return new Promise(resolve => {
            this.request.send("updateDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        updated: res.data.updated,
                        upsertedId: res.data.upserted_id,
                        requestId: res.requestId
                    });
                }
            });
        });
    }
    remove() {
        const query = { _id: this.id };
        const param = {
            collectionName: this._coll,
            query: query,
            multi: false
        };
        return new Promise(resolve => {
            this.request.send("deleteDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        deleted: res.data.deleted,
                        requestId: res.requestId
                    });
                }
            });
        });
    }
    get() {
        const query = { _id: this.id };
        const param = {
            collectionName: this._coll,
            query: query,
            multi: false,
            projection: this.projection
        };
        return new Promise(resolve => {
            this.request.send("queryDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    const documents = util_1.Util.formatResDocumentData(res.data.list);
                    resolve({
                        data: documents,
                        requestId: res.requestId,
                        total: res.TotalCount,
                        limit: res.Limit,
                        offset: res.Offset
                    });
                }
            });
        });
    }
    field(projection) {
        for (let k in projection) {
            if (projection[k]) {
                projection[k] = 1;
            }
            else {
                projection[k] = 0;
            }
        }
        return new DocumentReference(this._db, this._coll, this.id, projection);
    }
}
exports.DocumentReference = DocumentReference;

}, function(modId) { var map = {"./request":1555145390933,"./util":1555145390921,"./serializer/update":1555145390934,"./serializer/datatype":1555145390940,"./commands/update":1555145390935}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390933, function(require, module, exports) {
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const requestHandler = require("../utils/httpRequest");
class Request {
    constructor(db) {
        this.db = db;
    }
    send(api, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = Object.assign({}, data, {
                action: `database.${api}`
            });
            const slowQueryWarning = setTimeout(() => {
                console.warn('Database operation is longer than 3s. Please check query performance and your network environment.');
            }, 3000);
            try {
                return yield requestHandler({
                    timeout: this.db.config.timeout,
                    config: this.db.config.config,
                    params,
                    method: "post",
                    headers: {
                        "content-type": "application/json"
                    }
                });
            }
            finally {
                clearTimeout(slowQueryWarning);
            }
        });
    }
}
exports.Request = Request;

}, function(modId) { var map = {"../utils/httpRequest":1555145390912}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390934, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const update_1 = require("../commands/update");
const symbol_1 = require("../helper/symbol");
const type_1 = require("../utils/type");
const operator_map_1 = require("../operator-map");
const common_1 = require("./common");
class UpdateSerializer {
    constructor() {
    }
    static encode(query) {
        const stringifier = new UpdateSerializer();
        return stringifier.encodeUpdate(query);
    }
    encodeUpdate(query) {
        if (update_1.isUpdateCommand(query)) {
            return this.encodeUpdateCommand(query);
        }
        else if (type_1.getType(query) === 'object') {
            return this.encodeUpdateObject(query);
        }
        else {
            return query;
        }
    }
    encodeUpdateCommand(query) {
        if (query.fieldName === symbol_1.SYMBOL_UNSET_FIELD_NAME) {
            throw new Error(`Cannot encode a comparison command with unset field name`);
        }
        switch (query.operator) {
            case update_1.UPDATE_COMMANDS_LITERAL.SET:
            case update_1.UPDATE_COMMANDS_LITERAL.REMOVE:
            case update_1.UPDATE_COMMANDS_LITERAL.INC:
            case update_1.UPDATE_COMMANDS_LITERAL.MUL: {
                return this.encodeFieldUpdateCommand(query);
            }
            case update_1.UPDATE_COMMANDS_LITERAL.PUSH:
            case update_1.UPDATE_COMMANDS_LITERAL.POP:
            case update_1.UPDATE_COMMANDS_LITERAL.SHIFT:
            case update_1.UPDATE_COMMANDS_LITERAL.UNSHIFT: {
                return this.encodeArrayUpdateCommand(query);
            }
            default: {
                return this.encodeFieldUpdateCommand(query);
            }
        }
    }
    encodeFieldUpdateCommand(query) {
        const $op = operator_map_1.operatorToString(query.operator);
        switch (query.operator) {
            case update_1.UPDATE_COMMANDS_LITERAL.REMOVE: {
                return {
                    [$op]: {
                        [query.fieldName]: '',
                    },
                };
            }
            case update_1.UPDATE_COMMANDS_LITERAL.SET:
            case update_1.UPDATE_COMMANDS_LITERAL.INC:
            case update_1.UPDATE_COMMANDS_LITERAL.MUL:
            default: {
                return {
                    [$op]: {
                        [query.fieldName]: query.operands[0],
                    },
                };
            }
        }
    }
    encodeArrayUpdateCommand(query) {
        const $op = operator_map_1.operatorToString(query.operator);
        switch (query.operator) {
            case update_1.UPDATE_COMMANDS_LITERAL.PUSH: {
                const modifiers = {
                    $each: query.operands.map(common_1.encodeInternalDataType),
                };
                return {
                    [$op]: {
                        [query.fieldName]: modifiers,
                    },
                };
            }
            case update_1.UPDATE_COMMANDS_LITERAL.UNSHIFT: {
                const modifiers = {
                    $each: query.operands.map(common_1.encodeInternalDataType),
                    $position: 0,
                };
                return {
                    [$op]: {
                        [query.fieldName]: modifiers,
                    },
                };
            }
            case update_1.UPDATE_COMMANDS_LITERAL.POP: {
                return {
                    [$op]: {
                        [query.fieldName]: 1,
                    },
                };
            }
            case update_1.UPDATE_COMMANDS_LITERAL.SHIFT: {
                return {
                    [$op]: {
                        [query.fieldName]: -1,
                    },
                };
            }
            default: {
                return {
                    [$op]: {
                        [query.fieldName]: common_1.encodeInternalDataType(query.operands),
                    },
                };
            }
        }
    }
    encodeUpdateObject(query) {
        const flattened = common_1.flattenQueryObject(query);
        for (const key in flattened) {
            if (/^\$/.test(key))
                continue;
            let val = flattened[key];
            if (update_1.isUpdateCommand(val)) {
                flattened[key] = val._setFieldName(key);
                const condition = this.encodeUpdateCommand(flattened[key]);
                common_1.mergeConditionAfterEncode(flattened, condition, key);
            }
            else {
                flattened[key] = val = common_1.encodeInternalDataType(val);
                const $setCommand = new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.SET, [val], key);
                const condition = this.encodeUpdateCommand($setCommand);
                common_1.mergeConditionAfterEncode(flattened, condition, key);
            }
        }
        return flattened;
    }
}
exports.UpdateSerializer = UpdateSerializer;

}, function(modId) { var map = {"../commands/update":1555145390935,"../helper/symbol":1555145390923,"../utils/type":1555145390925,"../operator-map":1555145390936,"./common":1555145390939}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390935, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
exports.SET = 'set';
exports.REMOVE = 'remove';
exports.INC = 'inc';
exports.MUL = 'mul';
exports.PUSH = 'push';
exports.POP = 'pop';
exports.SHIFT = 'shift';
exports.UNSHIFT = 'unshift';
var UPDATE_COMMANDS_LITERAL;
(function (UPDATE_COMMANDS_LITERAL) {
    UPDATE_COMMANDS_LITERAL["SET"] = "set";
    UPDATE_COMMANDS_LITERAL["REMOVE"] = "remove";
    UPDATE_COMMANDS_LITERAL["INC"] = "inc";
    UPDATE_COMMANDS_LITERAL["MUL"] = "mul";
    UPDATE_COMMANDS_LITERAL["PUSH"] = "push";
    UPDATE_COMMANDS_LITERAL["POP"] = "pop";
    UPDATE_COMMANDS_LITERAL["SHIFT"] = "shift";
    UPDATE_COMMANDS_LITERAL["UNSHIFT"] = "unshift";
})(UPDATE_COMMANDS_LITERAL = exports.UPDATE_COMMANDS_LITERAL || (exports.UPDATE_COMMANDS_LITERAL = {}));
class UpdateCommand {
    constructor(operator, operands, fieldName) {
        this._internalType = symbol_1.SYMBOL_UPDATE_COMMAND;
        Object.defineProperties(this, {
            _internalType: {
                enumerable: false,
                configurable: false,
            },
        });
        this.operator = operator;
        this.operands = operands;
        this.fieldName = fieldName || symbol_1.SYMBOL_UNSET_FIELD_NAME;
    }
    _setFieldName(fieldName) {
        const command = new UpdateCommand(this.operator, this.operands, fieldName);
        return command;
    }
}
exports.UpdateCommand = UpdateCommand;
function isUpdateCommand(object) {
    return object && (object instanceof UpdateCommand) && (object._internalType === symbol_1.SYMBOL_UPDATE_COMMAND);
}
exports.isUpdateCommand = isUpdateCommand;
function isKnownUpdateCommand(object) {
    return isUpdateCommand(object) && (object.operator.toUpperCase() in UPDATE_COMMANDS_LITERAL);
}
exports.isKnownUpdateCommand = isKnownUpdateCommand;
exports.default = UpdateCommand;

}, function(modId) { var map = {"../helper/symbol":1555145390923}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390936, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("./commands/query");
const logic_1 = require("./commands/logic");
const update_1 = require("./commands/update");
exports.OperatorMap = {};
for (const key in query_1.QUERY_COMMANDS_LITERAL) {
    exports.OperatorMap[key] = `$${key.toLowerCase()}`;
}
for (const key in logic_1.LOGIC_COMMANDS_LITERAL) {
    exports.OperatorMap[key] = `$${key.toLowerCase()}`;
}
for (const key in update_1.UPDATE_COMMANDS_LITERAL) {
    exports.OperatorMap[key] = `$${key.toLowerCase()}`;
}
exports.OperatorMap[query_1.QUERY_COMMANDS_LITERAL.NEQ] = '$ne';
exports.OperatorMap[update_1.UPDATE_COMMANDS_LITERAL.REMOVE] = '$unset';
exports.OperatorMap[update_1.UPDATE_COMMANDS_LITERAL.SHIFT] = '$pop';
exports.OperatorMap[update_1.UPDATE_COMMANDS_LITERAL.UNSHIFT] = '$push';
function operatorToString(operator) {
    return exports.OperatorMap[operator] || `$${operator.toLowerCase()}`;
}
exports.operatorToString = operatorToString;

}, function(modId) { var map = {"./commands/query":1555145390937,"./commands/logic":1555145390938,"./commands/update":1555145390935}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390937, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logic_1 = require("./logic");
const symbol_1 = require("../helper/symbol");
const geo_1 = require("../geo");
const type_1 = require("../utils/type");
exports.EQ = 'eq';
exports.NEQ = 'neq';
exports.GT = 'gt';
exports.GTE = 'gte';
exports.LT = 'lt';
exports.LTE = 'lte';
exports.IN = 'in';
exports.NIN = 'nin';
var QUERY_COMMANDS_LITERAL;
(function (QUERY_COMMANDS_LITERAL) {
    QUERY_COMMANDS_LITERAL["EQ"] = "eq";
    QUERY_COMMANDS_LITERAL["NEQ"] = "neq";
    QUERY_COMMANDS_LITERAL["GT"] = "gt";
    QUERY_COMMANDS_LITERAL["GTE"] = "gte";
    QUERY_COMMANDS_LITERAL["LT"] = "lt";
    QUERY_COMMANDS_LITERAL["LTE"] = "lte";
    QUERY_COMMANDS_LITERAL["IN"] = "in";
    QUERY_COMMANDS_LITERAL["NIN"] = "nin";
    QUERY_COMMANDS_LITERAL["GEO_NEAR"] = "geoNear";
    QUERY_COMMANDS_LITERAL["GEO_WITHIN"] = "geoWithin";
    QUERY_COMMANDS_LITERAL["GEO_INTERSECTS"] = "geoIntersects";
})(QUERY_COMMANDS_LITERAL = exports.QUERY_COMMANDS_LITERAL || (exports.QUERY_COMMANDS_LITERAL = {}));
class QueryCommand extends logic_1.LogicCommand {
    constructor(operator, operands, fieldName) {
        super(operator, operands, fieldName);
        this.operator = operator;
        this._internalType = symbol_1.SYMBOL_QUERY_COMMAND;
    }
    _setFieldName(fieldName) {
        const command = new QueryCommand(this.operator, this.operands, fieldName);
        return command;
    }
    eq(val) {
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.EQ, [val], this.fieldName);
        return this.and(command);
    }
    neq(val) {
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.NEQ, [val], this.fieldName);
        return this.and(command);
    }
    gt(val) {
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.GT, [val], this.fieldName);
        return this.and(command);
    }
    gte(val) {
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.GTE, [val], this.fieldName);
        return this.and(command);
    }
    lt(val) {
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.LT, [val], this.fieldName);
        return this.and(command);
    }
    lte(val) {
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.LTE, [val], this.fieldName);
        return this.and(command);
    }
    in(list) {
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.IN, list, this.fieldName);
        return this.and(command);
    }
    nin(list) {
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.NIN, list, this.fieldName);
        return this.and(command);
    }
    geoNear(val) {
        if (!(val.geometry instanceof geo_1.Point)) {
            throw new TypeError(`"geometry" must be of type Point. Received type ${typeof val.geometry}`);
        }
        if (val.maxDistance !== undefined && !type_1.isNumber(val.maxDistance)) {
            throw new TypeError(`"maxDistance" must be of type Number. Received type ${typeof val.maxDistance}`);
        }
        if (val.minDistance !== undefined && !type_1.isNumber(val.minDistance)) {
            throw new TypeError(`"minDistance" must be of type Number. Received type ${typeof val.minDistance}`);
        }
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.GEO_NEAR, [val], this.fieldName);
        return this.and(command);
    }
    geoWithin(val) {
        if (!(val.geometry instanceof geo_1.MultiPolygon) && !(val.geometry instanceof geo_1.Polygon)) {
            throw new TypeError(`"geometry" must be of type Polygon or MultiPolygon. Received type ${typeof val.geometry}`);
        }
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.GEO_WITHIN, [val], this.fieldName);
        return this.and(command);
    }
    geoIntersects(val) {
        if (!(val.geometry instanceof geo_1.Point) &&
            !(val.geometry instanceof geo_1.LineString) &&
            !(val.geometry instanceof geo_1.Polygon) &&
            !(val.geometry instanceof geo_1.MultiPoint) &&
            !(val.geometry instanceof geo_1.MultiLineString) &&
            !(val.geometry instanceof geo_1.MultiPolygon)) {
            throw new TypeError(`"geometry" must be of type Point, LineString, Polygon, MultiPoint, MultiLineString or MultiPolygon. Received type ${typeof val.geometry}`);
        }
        const command = new QueryCommand(QUERY_COMMANDS_LITERAL.GEO_INTERSECTS, [val], this.fieldName);
        return this.and(command);
    }
}
exports.QueryCommand = QueryCommand;
function isQueryCommand(object) {
    return object && (object instanceof QueryCommand) && (object._internalType === symbol_1.SYMBOL_QUERY_COMMAND);
}
exports.isQueryCommand = isQueryCommand;
function isKnownQueryCommand(object) {
    return isQueryCommand(object) && (object.operator.toUpperCase() in QUERY_COMMANDS_LITERAL);
}
exports.isKnownQueryCommand = isKnownQueryCommand;
function isComparisonCommand(object) {
    return isQueryCommand(object);
}
exports.isComparisonCommand = isComparisonCommand;
exports.default = QueryCommand;

}, function(modId) { var map = {"./logic":1555145390938,"../helper/symbol":1555145390923,"../geo":1555145390917,"../utils/type":1555145390925}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390938, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
const query_1 = require("./query");
exports.AND = 'and';
exports.OR = 'or';
exports.NOT = 'not';
exports.NOR = 'nor';
var LOGIC_COMMANDS_LITERAL;
(function (LOGIC_COMMANDS_LITERAL) {
    LOGIC_COMMANDS_LITERAL["AND"] = "and";
    LOGIC_COMMANDS_LITERAL["OR"] = "or";
    LOGIC_COMMANDS_LITERAL["NOT"] = "not";
    LOGIC_COMMANDS_LITERAL["NOR"] = "nor";
})(LOGIC_COMMANDS_LITERAL = exports.LOGIC_COMMANDS_LITERAL || (exports.LOGIC_COMMANDS_LITERAL = {}));
class LogicCommand {
    constructor(operator, operands, fieldName) {
        this._internalType = symbol_1.SYMBOL_LOGIC_COMMAND;
        Object.defineProperties(this, {
            _internalType: {
                enumerable: false,
                configurable: false,
            },
        });
        this.operator = operator;
        this.operands = operands;
        this.fieldName = fieldName || symbol_1.SYMBOL_UNSET_FIELD_NAME;
        if (this.fieldName !== symbol_1.SYMBOL_UNSET_FIELD_NAME) {
            operands = operands.slice();
            this.operands = operands;
            for (let i = 0, len = operands.length; i < len; i++) {
                const query = operands[i];
                if (isLogicCommand(query) || query_1.isQueryCommand(query)) {
                    operands[i] = query._setFieldName(this.fieldName);
                }
            }
        }
    }
    _setFieldName(fieldName) {
        const operands = this.operands.map(operand => {
            if (operand instanceof LogicCommand) {
                return operand._setFieldName(fieldName);
            }
            else {
                return operand;
            }
        });
        const command = new LogicCommand(this.operator, operands, fieldName);
        return command;
    }
    and(...__expressions__) {
        const expressions = Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);
        expressions.unshift(this);
        return new LogicCommand(LOGIC_COMMANDS_LITERAL.AND, expressions, this.fieldName);
    }
    or(...__expressions__) {
        const expressions = Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);
        expressions.unshift(this);
        return new LogicCommand(LOGIC_COMMANDS_LITERAL.OR, expressions, this.fieldName);
    }
}
exports.LogicCommand = LogicCommand;
function isLogicCommand(object) {
    return object && (object instanceof LogicCommand) && (object._internalType === symbol_1.SYMBOL_LOGIC_COMMAND);
}
exports.isLogicCommand = isLogicCommand;
function isKnownLogicCommand(object) {
    return isLogicCommand && (object.operator.toUpperCase() in LOGIC_COMMANDS_LITERAL);
}
exports.isKnownLogicCommand = isKnownLogicCommand;
exports.default = LogicCommand;

}, function(modId) { var map = {"../helper/symbol":1555145390923,"./query":1555145390937}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390939, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const type_1 = require("../utils/type");
const datatype_1 = require("./datatype");
function flatten(query, shouldPreserverObject, parents, visited) {
    const cloned = Object.assign({}, query);
    for (const key in query) {
        if (/^\$/.test(key))
            continue;
        const value = query[key];
        if (!value)
            continue;
        if (type_1.isObject(value) && !shouldPreserverObject(value)) {
            if (visited.indexOf(value) > -1) {
                throw new Error(`Cannot convert circular structure to JSON`);
            }
            const newParents = [
                ...parents,
                key,
            ];
            const newVisited = [
                ...visited,
                value,
            ];
            const flattenedChild = flatten(value, shouldPreserverObject, newParents, newVisited);
            cloned[key] = flattenedChild;
            let hasKeyNotCombined = false;
            for (const childKey in flattenedChild) {
                if (!/^\$/.test(childKey)) {
                    cloned[`${key}.${childKey}`] = flattenedChild[childKey];
                    delete cloned[key][childKey];
                }
                else {
                    hasKeyNotCombined = true;
                }
            }
            if (!hasKeyNotCombined) {
                delete cloned[key];
            }
        }
    }
    return cloned;
}
function flattenQueryObject(query) {
    return flatten(query, isConversionRequired, [], [query]);
}
exports.flattenQueryObject = flattenQueryObject;
function flattenObject(object) {
    return flatten(object, (_) => false, [], [object]);
}
exports.flattenObject = flattenObject;
function mergeConditionAfterEncode(query, condition, key) {
    if (!condition[key]) {
        delete query[key];
    }
    for (const conditionKey in condition) {
        if (query[conditionKey]) {
            if (type_1.isArray(query[conditionKey])) {
                query[conditionKey].push(condition[conditionKey]);
            }
            else if (type_1.isObject(query[conditionKey])) {
                if (type_1.isObject(condition[conditionKey])) {
                    Object.assign(query[conditionKey], condition[conditionKey]);
                }
                else {
                    console.warn(`unmergable condition, query is object but condition is ${type_1.getType(condition)}, can only overwrite`, condition, key);
                    query[conditionKey] = condition[conditionKey];
                }
            }
            else {
                console.warn(`to-merge query is of type ${type_1.getType(query)}, can only overwrite`, query, condition, key);
                query[conditionKey] = condition[conditionKey];
            }
        }
        else {
            query[conditionKey] = condition[conditionKey];
        }
    }
}
exports.mergeConditionAfterEncode = mergeConditionAfterEncode;
function isConversionRequired(val) {
    return type_1.isInternalObject(val) || type_1.isDate(val) || type_1.isRegExp(val);
}
exports.isConversionRequired = isConversionRequired;
function encodeInternalDataType(val) {
    return datatype_1.serialize(val);
}
exports.encodeInternalDataType = encodeInternalDataType;

}, function(modId) { var map = {"../utils/type":1555145390925,"./datatype":1555145390940}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390940, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
const type_1 = require("../utils/type");
function serialize(val) {
    return serializeHelper(val, [val]);
}
exports.serialize = serialize;
function serializeHelper(val, visited) {
    if (type_1.isInternalObject(val)) {
        switch (val._internalType) {
            case symbol_1.SYMBOL_GEO_POINT: {
                return val.toJSON();
            }
            case symbol_1.SYMBOL_SERVER_DATE: {
                return val.parse();
            }
            case symbol_1.SYMBOL_REGEXP: {
                return val.parse();
            }
            default: {
                return val.toJSON ? val.toJSON() : val;
            }
        }
    }
    else if (type_1.isDate(val)) {
        return {
            $date: +val,
        };
    }
    else if (type_1.isRegExp(val)) {
        return {
            $regex: val.source,
            $options: val.flags,
        };
    }
    else if (type_1.isArray(val)) {
        return val.map(item => {
            if (visited.indexOf(item) > -1) {
                throw new Error(`Cannot convert circular structure to JSON`);
            }
            return serializeHelper(item, [
                ...visited,
                item,
            ]);
        });
    }
    else if (type_1.isObject(val)) {
        const ret = Object.assign({}, val);
        for (const key in ret) {
            if (visited.indexOf(ret[key]) > -1) {
                throw new Error(`Cannot convert circular structure to JSON`);
            }
            ret[key] = serializeHelper(ret[key], [
                ...visited,
                ret[key],
            ]);
        }
        return ret;
    }
    else {
        return val;
    }
}

}, function(modId) { var map = {"../helper/symbol":1555145390923,"../utils/type":1555145390925}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390941, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("./request");
const validate_1 = require("./validate");
const util_1 = require("./util");
const query_1 = require("./serializer/query");
const update_1 = require("./serializer/update");
class Query {
    constructor(db, coll, fieldFilters, fieldOrders, queryOptions) {
        this._db = db;
        this._coll = coll;
        this._fieldFilters = fieldFilters;
        this._fieldOrders = fieldOrders || [];
        this._queryOptions = queryOptions || {};
        this._request = new request_1.Request(this._db);
    }
    get() {
        let newOder = [];
        if (this._fieldOrders) {
            this._fieldOrders.forEach(order => {
                newOder.push(order);
            });
        }
        let param = {
            collectionName: this._coll
        };
        if (this._fieldFilters) {
            param.query = this._fieldFilters;
        }
        if (newOder.length > 0) {
            param.order = newOder;
        }
        if (this._queryOptions.offset) {
            param.offset = this._queryOptions.offset;
        }
        if (this._queryOptions.limit) {
            param.limit =
                this._queryOptions.limit < 100 ? this._queryOptions.limit : 100;
        }
        else {
            param.limit = 100;
        }
        if (this._queryOptions.projection) {
            param.projection = this._queryOptions.projection;
        }
        return new Promise(resolve => {
            this._request.send("queryDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    const documents = util_1.Util.formatResDocumentData(res.data.list);
                    const result = {
                        data: documents,
                        requestId: res.requestId
                    };
                    if (res.TotalCount)
                        result.total = res.TotalCount;
                    if (res.Limit)
                        result.limit = res.Limit;
                    if (res.Offset)
                        result.offset = res.Offset;
                    resolve(result);
                }
            });
        });
    }
    count() {
        let param = {
            collectionName: this._coll
        };
        if (this._fieldFilters) {
            param.query = this._fieldFilters;
        }
        return new Promise(resolve => {
            this._request.send("countDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        requestId: res.requestId,
                        total: res.data.total
                    });
                }
            });
        });
    }
    where(query) {
        return new Query(this._db, this._coll, query_1.QuerySerializer.encode(query), this._fieldOrders, this._queryOptions);
    }
    orderBy(fieldPath, directionStr) {
        validate_1.Validate.isFieldPath(fieldPath);
        validate_1.Validate.isFieldOrder(directionStr);
        const newOrder = {
            field: fieldPath,
            direction: directionStr
        };
        const combinedOrders = this._fieldOrders.concat(newOrder);
        return new Query(this._db, this._coll, this._fieldFilters, combinedOrders, this._queryOptions);
    }
    limit(limit) {
        validate_1.Validate.isInteger("limit", limit);
        let option = Object.assign({}, this._queryOptions);
        option.limit = limit;
        return new Query(this._db, this._coll, this._fieldFilters, this._fieldOrders, option);
    }
    skip(offset) {
        validate_1.Validate.isInteger("offset", offset);
        let option = Object.assign({}, this._queryOptions);
        option.offset = offset;
        return new Query(this._db, this._coll, this._fieldFilters, this._fieldOrders, option);
    }
    update(data) {
        if (!data || typeof data !== "object") {
            return Promise.resolve({
                code: "INVALID_PARAM",
                message: "参数必需是非空对象"
            });
        }
        if (data.hasOwnProperty("_id")) {
            return Promise.resolve({
                code: "INVALID_PARAM",
                message: "不能更新_id的值"
            });
        }
        let param = {
            collectionName: this._coll,
            query: this._fieldFilters,
            multi: true,
            merge: true,
            upsert: false,
            data: update_1.UpdateSerializer.encode(data)
        };
        return new Promise(resolve => {
            this._request.send("updateDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        requestId: res.requestId,
                        updated: res.data.updated,
                        upsertId: res.data.upsert_id
                    });
                }
            });
        });
    }
    field(projection) {
        for (let k in projection) {
            if (projection[k]) {
                projection[k] = 1;
            }
            else {
                projection[k] = 0;
            }
        }
        let option = Object.assign({}, this._queryOptions);
        option.projection = projection;
        return new Query(this._db, this._coll, this._fieldFilters, this._fieldOrders, option);
    }
    remove() {
        if (Object.keys(this._queryOptions).length > 0) {
            console.warn('`offset`, `limit` and `projection` are not supported in remove() operation');
        }
        if (this._fieldOrders.length > 0) {
            console.warn('`orderBy` is not supported in remove() operation');
        }
        const param = {
            collectionName: this._coll,
            query: query_1.QuerySerializer.encode(this._fieldFilters),
            multi: true
        };
        return new Promise(resolve => {
            this._request.send("deleteDocument", param).then(res => {
                if (res.code) {
                    resolve(res);
                }
                else {
                    resolve({
                        requestId: res.requestId,
                        deleted: res.data.deleted
                    });
                }
            });
        });
    }
}
exports.Query = Query;

}, function(modId) { var map = {"./request":1555145390933,"./validate":1555145390919,"./util":1555145390921,"./serializer/query":1555145390942,"./serializer/update":1555145390934}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390942, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("../commands/query");
const logic_1 = require("../commands/logic");
const symbol_1 = require("../helper/symbol");
const type_1 = require("../utils/type");
const operator_map_1 = require("../operator-map");
const common_1 = require("./common");
class QuerySerializer {
    constructor() {
    }
    static encode(query) {
        const encoder = new QueryEncoder();
        return encoder.encodeQuery(query);
    }
}
exports.QuerySerializer = QuerySerializer;
class QueryEncoder {
    encodeQuery(query, key) {
        if (common_1.isConversionRequired(query)) {
            if (logic_1.isLogicCommand(query)) {
                return this.encodeLogicCommand(query);
            }
            else if (query_1.isQueryCommand(query)) {
                return this.encodeQueryCommand(query);
            }
            else {
                return { [key]: this.encodeQueryObject(query) };
            }
        }
        else {
            if (type_1.isObject(query)) {
                return this.encodeQueryObject(query);
            }
            else {
                return query;
            }
        }
    }
    encodeLogicCommand(query) {
        switch (query.operator) {
            case logic_1.LOGIC_COMMANDS_LITERAL.AND:
            case logic_1.LOGIC_COMMANDS_LITERAL.OR: {
                const $op = operator_map_1.operatorToString(query.operator);
                const subqueries = query.operands.map((oprand) => this.encodeQuery(oprand, query.fieldName));
                return {
                    [$op]: subqueries,
                };
            }
            default: {
                const $op = operator_map_1.operatorToString(query.operator);
                if (query.operands.length === 1) {
                    const subquery = this.encodeQuery(query.operands[0]);
                    return {
                        [$op]: subquery,
                    };
                }
                else {
                    const subqueries = query.operands.map(this.encodeQuery.bind(this));
                    return {
                        [$op]: subqueries,
                    };
                }
            }
        }
    }
    encodeQueryCommand(query) {
        if (query_1.isComparisonCommand(query)) {
            return this.encodeComparisonCommand(query);
        }
        else {
            return this.encodeComparisonCommand(query);
        }
    }
    encodeComparisonCommand(query) {
        if (query.fieldName === symbol_1.SYMBOL_UNSET_FIELD_NAME) {
            throw new Error(`Cannot encode a comparison command with unset field name`);
        }
        const $op = operator_map_1.operatorToString(query.operator);
        switch (query.operator) {
            case query_1.QUERY_COMMANDS_LITERAL.EQ:
            case query_1.QUERY_COMMANDS_LITERAL.NEQ:
            case query_1.QUERY_COMMANDS_LITERAL.LT:
            case query_1.QUERY_COMMANDS_LITERAL.LTE:
            case query_1.QUERY_COMMANDS_LITERAL.GT:
            case query_1.QUERY_COMMANDS_LITERAL.GTE: {
                return {
                    [query.fieldName]: {
                        [$op]: common_1.encodeInternalDataType(query.operands[0]),
                    },
                };
            }
            case query_1.QUERY_COMMANDS_LITERAL.IN:
            case query_1.QUERY_COMMANDS_LITERAL.NIN: {
                return {
                    [query.fieldName]: {
                        [$op]: common_1.encodeInternalDataType(query.operands),
                    },
                };
            }
            case query_1.QUERY_COMMANDS_LITERAL.GEO_NEAR: {
                const options = query.operands[0];
                return {
                    [query.fieldName]: {
                        $nearSphere: {
                            $geometry: options.geometry.toJSON(),
                            $maxDistance: options.maxDistance,
                            $minDistance: options.minDistance
                        }
                    }
                };
            }
            case query_1.QUERY_COMMANDS_LITERAL.GEO_WITHIN: {
                const options = query.operands[0];
                return {
                    [query.fieldName]: {
                        $geoWithin: {
                            $geometry: options.geometry.toJSON()
                        }
                    }
                };
            }
            case query_1.QUERY_COMMANDS_LITERAL.GEO_INTERSECTS: {
                const options = query.operands[0];
                return {
                    [query.fieldName]: {
                        $geoIntersects: {
                            $geometry: options.geometry.toJSON()
                        }
                    }
                };
            }
            default: {
                return {
                    [query.fieldName]: {
                        [$op]: common_1.encodeInternalDataType(query.operands[0]),
                    },
                };
            }
        }
    }
    encodeQueryObject(query) {
        const flattened = common_1.flattenQueryObject(query);
        for (const key in flattened) {
            const val = flattened[key];
            if (logic_1.isLogicCommand(val)) {
                flattened[key] = val._setFieldName(key);
                const condition = this.encodeLogicCommand(flattened[key]);
                this.mergeConditionAfterEncode(flattened, condition, key);
            }
            else if (query_1.isComparisonCommand(val)) {
                flattened[key] = val._setFieldName(key);
                const condition = this.encodeComparisonCommand(flattened[key]);
                this.mergeConditionAfterEncode(flattened, condition, key);
            }
            else if (common_1.isConversionRequired(val)) {
                flattened[key] = common_1.encodeInternalDataType(val);
            }
        }
        return flattened;
    }
    mergeConditionAfterEncode(query, condition, key) {
        if (!condition[key]) {
            delete query[key];
        }
        for (const conditionKey in condition) {
            if (query[conditionKey]) {
                if (type_1.isArray(query[conditionKey])) {
                    query[conditionKey].push(condition[conditionKey]);
                }
                else if (type_1.isObject(query[conditionKey])) {
                    if (type_1.isObject(condition[conditionKey])) {
                        Object.assign(query, condition);
                    }
                    else {
                        console.warn(`unmergable condition, query is object but condition is ${type_1.getType(condition)}, can only overwrite`, condition, key);
                        query[conditionKey] = condition[conditionKey];
                    }
                }
                else {
                    console.warn(`to-merge query is of type ${type_1.getType(query)}, can only overwrite`, query, condition, key);
                    query[conditionKey] = condition[conditionKey];
                }
            }
            else {
                query[conditionKey] = condition[conditionKey];
            }
        }
    }
}

}, function(modId) { var map = {"../commands/query":1555145390937,"../commands/logic":1555145390938,"../helper/symbol":1555145390923,"../utils/type":1555145390925,"../operator-map":1555145390936,"./common":1555145390939}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390943, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("./commands/query");
const logic_1 = require("./commands/logic");
const update_1 = require("./commands/update");
const type_1 = require("./utils/type");
exports.Command = {
    eq(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.EQ, [val]);
    },
    neq(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.NEQ, [val]);
    },
    lt(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.LT, [val]);
    },
    lte(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.LTE, [val]);
    },
    gt(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.GT, [val]);
    },
    gte(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.GTE, [val]);
    },
    in(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.IN, val);
    },
    nin(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.NIN, val);
    },
    geoNear(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.GEO_NEAR, [val]);
    },
    geoWithin(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.GEO_WITHIN, [val]);
    },
    geoIntersects(val) {
        return new query_1.QueryCommand(query_1.QUERY_COMMANDS_LITERAL.GEO_INTERSECTS, [val]);
    },
    and(...__expressions__) {
        const expressions = type_1.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);
        return new logic_1.LogicCommand(logic_1.LOGIC_COMMANDS_LITERAL.AND, expressions);
    },
    or(...__expressions__) {
        const expressions = type_1.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);
        return new logic_1.LogicCommand(logic_1.LOGIC_COMMANDS_LITERAL.OR, expressions);
    },
    set(val) {
        return new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.SET, [val]);
    },
    remove() {
        return new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.REMOVE, []);
    },
    inc(val) {
        return new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.INC, [val]);
    },
    mul(val) {
        return new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.MUL, [val]);
    },
    push(...__values__) {
        const values = type_1.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);
        return new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.PUSH, values);
    },
    pop() {
        return new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.POP, []);
    },
    shift() {
        return new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.SHIFT, []);
    },
    unshift(...__values__) {
        const values = type_1.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);
        return new update_1.UpdateCommand(update_1.UPDATE_COMMANDS_LITERAL.UNSHIFT, values);
    },
};
exports.default = exports.Command;

}, function(modId) { var map = {"./commands/query":1555145390937,"./commands/logic":1555145390938,"./commands/update":1555145390935,"./utils/type":1555145390925}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390944, function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const symbol_1 = require("../helper/symbol");
class RegExp {
    constructor({ regexp, options }) {
        if (!regexp) {
            throw new TypeError("regexp must be a string");
        }
        this.$regex = regexp;
        this.$options = options;
    }
    parse() {
        return {
            $regex: this.$regex,
            $options: this.$options
        };
    }
    get _internalType() {
        return symbol_1.SYMBOL_REGEXP;
    }
}
exports.RegExp = RegExp;
function RegExpConstructor(param) {
    return new RegExp(param);
}
exports.RegExpConstructor = RegExpConstructor;

}, function(modId) { var map = {"../helper/symbol":1555145390923}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390945, function(require, module, exports) {
const httpRequest = require("../utils/httpRequest");

/**
 * 调用云函数
 * @param {String} name  函数名
 * @param {Object} functionParam 函数参数
 * @return {Promise}
 */
function callFunction({ name, data }) {
  try {
    data = data ? JSON.stringify(data) : "";
  } catch (e) {
    return Promise.reject(e);
  }
  if (!name) {
    return Promise.reject(
      new Error({
        message: "函数名不能为空"
      })
    );
  }

  const wxCloudApiToken = process.env.WX_API_TOKEN || "";

  let params = {
    action: "functions.invokeFunction",
    function_name: name,
    request_data: data,
    wxCloudApiToken
  };

  return httpRequest({
    config: this.config,
    params,
    method: "post",
    headers: {
      "content-type": "application/json"
    }
  }).then(res => {
    // console.log(res);
    if (res.code) {
      return res;
    } else {
      let result = res.data.response_data;
      try {
        result = JSON.parse(res.data.response_data);
      } catch (e) {}
      return {
        result,
        requestId: res.requestId
      };
    }
  });
}

exports.callFunction = callFunction;

}, function(modId) { var map = {"../utils/httpRequest":1555145390912}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1555145390946, function(require, module, exports) {
const httpRequest = require("../utils/httpRequest");

exports.callWxOpenApi = function({ apiName, requestData } = {}) {
  try {
    requestData = requestData ? JSON.stringify(requestData) : "";
  } catch (e) {
    throw Error(e);
  }

  const wxCloudApiToken = process.env.WX_API_TOKEN || "";

  let params = {
    action: "wx.api",
    apiName,
    requestData,
    wxCloudApiToken
  };

  return httpRequest({
    config: this.config,
    params,
    method: "post",
    headers: {
      "content-type": "application/json"
    }
  }).then(res => {
    if (res.code) {
      return res;
    } else {
      let result = res.data.responseData;
      try {
        result = JSON.parse(res.data.responseData);
      } catch (e) {}
      return {
        result,
        requestId: res.requestId
      };
    }
  });
};

/**
 * 调用wxopenAPi
 * @param {String} apiName  接口名
 * @param {Buffer} requestData
 * @return {Promise} 正常内容为buffer，报错为json {code:'', message:'', resquestId:''}
 */
exports.callCompatibleWxOpenApi = function({ apiName, requestData } = {}) {
  const wxCloudApiToken = process.env.WX_API_TOKEN || "";

  let params = {
    action: "wx.openApi",
    apiName,
    requestData,
    wxCloudApiToken
  };

  return httpRequest({
    config: this.config,
    params,
    method: "post",
    headers: {}
  }).then(res => res);
};

}, function(modId) { var map = {"../utils/httpRequest":1555145390912}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1555145390910);
})()
//# sourceMappingURL=index.js.map