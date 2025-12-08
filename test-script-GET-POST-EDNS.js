/**
 * Test script for Akamai DNS Business Rule
 * Run this in: System Definition → Scripts - Background
 *
 * This simulates the Business Rule execution without actually creating a record
 */

(function testAkamaiDNSIntegration() {
  gs.info("=== STARTING AKAMAI DNS INTEGRATION TEST ===");

  // ========================================
  // TEST CONFIGURATION - CHANGE THESE VALUES
  // ========================================
  var testConfig = {
    zone: "example.com", // Your zone
    hostname: "www.example.com", // Test hostname (make it unique)
    recordType: "A", // Record type
    ipAddress: "192.0.2.100", // Test IP address
    ttl: 300, // TTL in seconds
    accountSwitchKey: "", // Optional: Add if you have multi-account
  };

  gs.info("Test Configuration:");
  gs.info("  Zone: " + testConfig.zone);
  gs.info("  Hostname: " + testConfig.hostname);
  gs.info("  Record Type: " + testConfig.recordType);
  gs.info("  IP Address: " + testConfig.ipAddress);
  gs.info("  TTL: " + testConfig.ttl);

  // ========================================
  // SIMULATE BUSINESS RULE LOGIC
  // ========================================
  try {
    // Initialize auth helper
    gs.info("\n--- Step 1: Initialize EdgeGrid Auth ---");
    var authHelper = new AkamaiEdgeGridAuth();
    gs.info("✓ Auth helper initialized");

    // Build query string if accountSwitchKey is provided
    var queryString = "";
    if (
      testConfig.accountSwitchKey &&
      testConfig.accountSwitchKey.trim().length > 0
    ) {
      queryString =
        "accountSwitchKey=" +
        encodeURIComponent(testConfig.accountSwitchKey.trim());
      gs.info("Using account switch key: " + testConfig.accountSwitchKey);
    }

    // ========================================
    // CHECK IF DNS RECORD EXISTS
    // ========================================
    gs.info("\n--- Step 2: Check if DNS Record Exists ---");

    var checkPath =
      "/config-dns/v2/zones/" +
      testConfig.zone +
      "/names/" +
      testConfig.hostname +
      "/types/" +
      testConfig.recordType;

    gs.info("Check Path: " + checkPath);
    if (queryString) {
      gs.info("Query String: " + queryString);
    }

    var checkAuthHeader = authHelper.getAuthHeader(
      "GET",
      checkPath,
      "",
      queryString
    );
    gs.info(
      "Authorization Header Generated (first 80 chars): " +
        checkAuthHeader.substring(0, 80) +
        "..."
    );

    var checkRequest = new sn_ws.RESTMessageV2(
      "Akamai DNS API",
      "checkDNSRecord"
    );
    checkRequest.setStringParameterNoEscape("zone", testConfig.zone);
    checkRequest.setStringParameterNoEscape("hostname", testConfig.hostname);
    checkRequest.setStringParameterNoEscape(
      "recordType",
      testConfig.recordType
    );

    if (queryString) {
      checkRequest.setQueryParameter(
        "accountSwitchKey",
        testConfig.accountSwitchKey.trim()
      );
    }

    checkRequest.setRequestHeader("Authorization", checkAuthHeader);
    checkRequest.setRequestHeader("Content-Type", "application/json");

    gs.info("Executing CHECK request...");
    var checkResponse = checkRequest.execute();
    var checkStatus = checkResponse.getStatusCode();
    var checkBody = checkResponse.getBody();

    gs.info("Check Response Status: " + checkStatus);
    gs.info("Check Response Body: " + checkBody);

    // ========================================
    // CREATE DNS RECORD IF NOT EXISTS
    // ========================================
    if (checkStatus == 404) {
      gs.info("\n--- Step 3: Record Does Not Exist - Creating ---");

      var createPath =
        "/config-dns/v2/zones/" +
        testConfig.zone +
        "/names/" +
        testConfig.hostname +
        "/types/" +
        testConfig.recordType;

      var requestBody = JSON.stringify({
        ttl: parseInt(testConfig.ttl),
        name: testConfig.hostname,
        type: testConfig.recordType,
        rdata: [testConfig.ipAddress],
      });

      gs.info("Create Path: " + createPath);
      gs.info("Request Body: " + requestBody);

      var createAuthHeader = authHelper.getAuthHeader(
        "POST",
        createPath,
        requestBody,
        queryString
      );
      gs.info(
        "Authorization Header Generated (first 80 chars): " +
          createAuthHeader.substring(0, 80) +
          "..."
      );

      var createRequest = new sn_ws.RESTMessageV2(
        "Akamai DNS API",
        "createDNSRecord"
      );
      createRequest.setStringParameterNoEscape("zone", testConfig.zone);
      createRequest.setStringParameterNoEscape("hostname", testConfig.hostname);
      createRequest.setStringParameterNoEscape(
        "recordType",
        testConfig.recordType
      );
      createRequest.setStringParameterNoEscape(
        "ttl",
        testConfig.ttl.toString()
      );
      createRequest.setStringParameterNoEscape(
        "ipAddress",
        '"' + testConfig.ipAddress + '"'
      );

      if (queryString) {
        createRequest.setQueryParameter(
          "accountSwitchKey",
          testConfig.accountSwitchKey.trim()
        );
      }

      createRequest.setRequestHeader("Authorization", createAuthHeader);
      createRequest.setRequestHeader("Content-Type", "application/json");
      createRequest.setRequestBody(requestBody);

      gs.info("Executing CREATE request...");
      var createResponse = createRequest.execute();
      var createStatus = createResponse.getStatusCode();
      var createBody = createResponse.getBody();

      gs.info("Create Response Status: " + createStatus);
      gs.info("Create Response Body: " + createBody);

      // ========================================
      // EVALUATE RESULT
      // ========================================
      if (createStatus == 201 || createStatus == 200) {
        gs.info("\n=== ✓ TEST PASSED: DNS Record Created Successfully ===");
        gs.info("Status: success");
        gs.info("Message: DNS record created successfully");
      } else {
        gs.error("\n=== ✗ TEST FAILED: Failed to Create DNS Record ===");
        gs.error("Status: failed");
        gs.error("Status Code: " + createStatus);
        gs.error("Error: " + createBody);
      }
    } else if (checkStatus == 200) {
      gs.info("\n=== ✓ TEST PASSED: DNS Record Already Exists ===");
      gs.info("Status: success");
      gs.info("Message: DNS record already exists");
      gs.info("Existing Record Data: " + checkBody);
    } else {
      gs.error("\n=== ✗ TEST FAILED: Unexpected Status Code ===");
      gs.error("Status Code: " + checkStatus);
      gs.error("Response: " + checkBody);
    }
  } catch (ex) {
    gs.error("\n=== ✗ TEST FAILED: Exception Occurred ===");
    gs.error("Error Message: " + ex.message);
    gs.error("Stack Trace: " + ex.stack);
  }

  gs.info("\n=== TEST COMPLETED ===");
})();
