/**
 * Purpose: Akamai EdgeGrid Authentication Script Include for ServiceNow
 *
 * This script provides authentication functionality for Akamai's EdgeGrid API authentication scheme.
 * It generates the required authorization headers by creating HMAC-SHA256 signatures with timestamps,
 * nonces, and request data. The class retrieves Akamai credentials from ServiceNow System Properties
 * and can be used by Business Rules or other server-side scripts to authenticate API calls to
 * Akamai services (DNS, CDN, WAF, etc.).
 *
 * Key features:
 * - EdgeGrid v1 HMAC-SHA256 authentication
 * - Support for GET, POST, PUT, DELETE methods
 * - Query string parameter handling (e.g., accountSwitchKey)
 * - Content hash generation for POST/PUT requests
 * This script uses HASHES https:/ /github.com/h2non/jshashes/blob/master/hashes.js library HMAC-SHA256 hashing. Make sure to include it in your ServiceNow instance.
 */

var AkamaiEdgeGridAuth = Class.create();
AkamaiEdgeGridAuth.prototype = {
  initialize: function () {
    // Get credentials from System Properties
    this.clientToken = gs.getProperty("akamai.client_token");
    this.clientSecret = gs.getProperty("akamai.client_secret");
    this.accessToken = gs.getProperty("akamai.access_token");
    this.host = gs.getProperty("akamai.host");
    this.digest = new GlideDigest();
  },

  /**
   * Generate EdgeGrid Authorization header
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} path - API path (e.g., /config-dns/v2/zones/example.com/names/test/types/A)
   * @param {string} body - Request body (empty string for GET)
   * @param {string} queryString - Optional query string (e.g., accountSwitchKey=B-C-1ED34DK)
   * @returns {string} Authorization header value
   */
  getAuthHeader: function (method, path, body, queryString) {
    // Add query string to path if provided
    var fullPath = path;
    if (queryString && queryString.length > 0) {
      fullPath = path + "?" + queryString;
    }

    // Generate timestamp
    var timestamp = this._getTimestamp();

    // Generate nonce (GUID)
    var nonce = this._generateNonce();

    // Generate signature data
    var signatureData = this._generateSignatureData(
      method,
      this.host,
      fullPath,
      body,
      this.clientToken,
      this.accessToken,
      timestamp,
      nonce
    );

    // Generate signing key
    var signingKey = this._generateHash(this.clientSecret, timestamp);

    // Generate signature
    var signature = this._generateHash(signingKey, signatureData);

    // Build authorization header
    var authHeader = this._generateAuthorizationHeader(
      this.clientToken,
      this.accessToken,
      timestamp,
      nonce,
      signature
    );

    return authHeader;
  },

  _getTimestamp: function () {
    var d = new Date();
    var month = d.getUTCMonth() + 1;

    // Helper function to zero-pad
    var zf = function (num, len) {
      var str = num.toString();
      while (str.length < len) {
        str = "0" + str;
      }
      return str;
    };

    // Format: 20231030T12:34:56+0000
    var timestamp =
      d.getUTCFullYear() +
      zf(month, 2) +
      zf(d.getUTCDate(), 2) +
      "T" +
      zf(d.getUTCHours(), 2) +
      ":" +
      zf(d.getUTCMinutes(), 2) +
      ":" +
      zf(d.getUTCSeconds(), 2) +
      "+0000";

    return timestamp;
  },

  _generateNonce: function () {
    // Generate GUID
    var s4 = function () {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };
    return (
      s4() +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      s4() +
      s4()
    );
  },

  _generateSignatureData: function (
    method,
    host,
    path,
    body,
    clientToken,
    accessToken,
    timestamp,
    nonce
  ) {
    var tab = String.fromCharCode(9); // Tab character
    var signatureData = "";

    if (method === "POST" || method === "PUT") {
      // For POST/PUT, include content hash
      var contentHash = this.digest.getSHA256Base64(body);

      signatureData = method + tab;
      signatureData += "https" + tab;
      signatureData += host + tab;
      signatureData += path + tab;
      signatureData += tab + contentHash + tab;
      signatureData += "EG1-HMAC-SHA256 ";
      signatureData += "client_token=" + clientToken + ";";
      signatureData += "access_token=" + accessToken + ";";
      signatureData += "timestamp=" + timestamp + ";";
      signatureData += "nonce=" + nonce + ";";
    } else {
      // For GET/DELETE, no content hash
      signatureData = method + tab;
      signatureData += "https" + tab;
      signatureData += host + tab;
      signatureData += path + tab + tab + tab;
      signatureData += "EG1-HMAC-SHA256 ";
      signatureData += "client_token=" + clientToken + ";";
      signatureData += "access_token=" + accessToken + ";";
      signatureData += "timestamp=" + timestamp + ";";
      signatureData += "nonce=" + nonce + ";";
    }

    return signatureData;
  },

  _generateHash: function (key, data) {
    // Using Hashes library for HMAC-SHA256
    var signature = new Hashes.SHA256().b64_hmac(key, data);
    return signature;
  },

  _generateAuthorizationHeader: function (
    clientToken,
    accessToken,
    timestamp,
    nonce,
    signature
  ) {
    var authHeader = "EG1-HMAC-SHA256 ";
    authHeader += "client_token=" + clientToken + ";";
    authHeader += "access_token=" + accessToken + ";";
    authHeader += "timestamp=" + timestamp + ";";
    authHeader += "nonce=" + nonce + ";";
    authHeader += "signature=" + signature;

    return authHeader;
  },

  type: "AkamaiEdgeGridAuth",
};
