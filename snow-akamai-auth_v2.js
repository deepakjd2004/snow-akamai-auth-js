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
   * @param {string} queryString - Optional query string (e.g., accountSwitchKey=xxxx)
   * @returns {string} Authorization header value
   */
  getAuthHeader: function (method, path, body, queryString) {
    // Normalize method/body so signature generation is consistent.
    method = (method || "").toString().toUpperCase();
    body = body == null ? "" : body.toString();

    // Add query string to path if provided.
    // Use "&" if the path already contains a "?" to avoid a double-"?" URL
    // (e.g. path="/foo?zone=x" + queryString="accountSwitchKey=y" → "/foo?zone=x&accountSwitchKey=y").
    var fullPath = path;
    if (queryString && queryString.length > 0) {
      fullPath = path + (path.indexOf("?") !== -1 ? "&" : "?") + queryString;
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
      nonce,
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
      signature,
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

  // Max body size constant — matches official EdgeGrid library (helpers.js MAX_BODY = 131072).
  MAX_BODY: 131072,

  _generateSignatureData: function (
    method,
    host,
    path,
    body,
    clientToken,
    accessToken,
    timestamp,
    nonce,
  ) {
    var tab = String.fromCharCode(9); // Tab character

    // Build the unsigned auth header prefix — same value passed as the last
    // data-to-sign field in the official library's makeAuthHeader() / dataToSign().
    var authHeaderPrefix =
      "EG1-HMAC-SHA256 " +
      "client_token=" +
      clientToken +
      ";" +
      "access_token=" +
      accessToken +
      ";" +
      "timestamp=" +
      timestamp +
      ";" +
      "nonce=" +
      nonce +
      ";";

    // Content hash: only for POST with a non-empty body.
    // Official library guard: if (request.method === 'POST' && preparedBody.length > 0)
    // An empty POST body → contentHash is "" (empty string), not SHA256("").
    var contentHash = "";
    if (method === "POST" && body.length > 0) {
      // Truncate to MAX_BODY before hashing, matching official library behaviour.
      var bodyToHash =
        body.length > this.MAX_BODY ? body.substring(0, this.MAX_BODY) : body;
      contentHash = this.digest.getSHA256Base64(bodyToHash);
    }

    // Canonical data-to-sign field order (tab-separated), per official library dataToSign():
    //   method \t scheme \t host \t path+query \t canonHeaders \t contentHash \t authHeaderPrefix
    // canonHeaders is always empty here (no headersToSign), producing two consecutive tabs
    // between path and contentHash.
    var signatureData =
      method +
      tab +
      "https" +
      tab +
      host +
      tab +
      path +
      tab +
      tab + // empty canonicalized headers field
      contentHash +
      tab +
      authHeaderPrefix;

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
    signature,
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
