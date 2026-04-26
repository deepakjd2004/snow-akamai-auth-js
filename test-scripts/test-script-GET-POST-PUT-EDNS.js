/**
 * Test script for Akamai DNS Business Rule with PUT support
 * Run this in: System Definition → Scripts - Background
 *
 * This simulates the Business Rule execution without actually creating a record
 * Tests GET (check), POST (create), and PUT (update) operations
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
    ttl: 400, // TTL in seconds
    accountSwitchKey: "", // Optional - leave empty if not needed
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
      "Authorization Header Generated (first 100 chars): " +
        checkAuthHeader.substring(0, 100) +
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

    gs.info("✓ Check Response Status: " + checkStatus);
    gs.info("Check Response Body: " + checkBody);

    // ========================================
    // HANDLE RESPONSE BASED ON STATUS
    // ========================================
    if (checkStatus == 404) {
      // ========================================
      // CREATE DNS RECORD (POST)
      // ========================================
      gs.info("\n--- Step 3: Record Not Found - Creating New Record ---");

      var createPath =
        "/config-dns/v2/zones/" +
        testConfig.zone +
        "/names/" +
        testConfig.hostname +
        "/types/" +
        testConfig.recordType;

      var requestBody = JSON.stringify({
        name: testConfig.hostname,
        rdata: [testConfig.ipAddress],
        ttl: parseInt(testConfig.ttl),
        type: testConfig.recordType,
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
        "POST Authorization Header (first 100 chars): " +
          createAuthHeader.substring(0, 100) +
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

      gs.info("✓ Create Response Status: " + createStatus);
      gs.info("Create Response Body: " + createBody);

      if (createStatus == 201 || createStatus == 200) {
        gs.info("\n=== ✓ TEST PASSED: DNS Record Created Successfully ===");
      } else {
        gs.error(
          "\n=== ✗ TEST FAILED: Failed to create DNS record. Status: " +
            createStatus +
            " ==="
        );
      }
    } else if (checkStatus == 200) {
      // ========================================
      // RECORD EXISTS - CHECK IF UPDATE NEEDED
      // ========================================
      gs.info("\n--- Step 3: Record Exists - Checking if Update Needed ---");

      var existingRecord = JSON.parse(checkBody);
      var needsUpdate = false;

      gs.info("Existing Record Data:");
      gs.info("  Current rdata: " + JSON.stringify(existingRecord.rdata));
      gs.info("  Current TTL: " + existingRecord.ttl);
      gs.info("  Desired IP: " + testConfig.ipAddress);
      gs.info("  Desired TTL: " + testConfig.ttl);

      // Check if IP address or TTL needs updating
      if (
        !existingRecord.rdata ||
        existingRecord.rdata.indexOf(testConfig.ipAddress) === -1 ||
        existingRecord.ttl != testConfig.ttl
      ) {
        needsUpdate = true;
        gs.info("✓ Update needed - values differ");
      } else {
        gs.info("✓ No update needed - values match");
      }

      if (needsUpdate) {
        // ========================================
        // UPDATE DNS RECORD (PUT) - FIXED!
        // ========================================
        gs.info("\n--- Step 4: Updating DNS Record ---");

        var updatePath =
          "/config-dns/v2/zones/" +
          testConfig.zone +
          "/names/" +
          testConfig.hostname +
          "/types/" +
          testConfig.recordType;

        var updateBody = JSON.stringify({
          name: testConfig.hostname,
          rdata: [testConfig.ipAddress],
          ttl: parseInt(testConfig.ttl),
          type: testConfig.recordType,
        });

        gs.info("Update Path: " + updatePath);
        gs.info("Update Body: " + updateBody);

        // CRITICAL: PUT requests do NOT include content hash in signature
        // This is the key fix - AkamaiEdgeGridAuth now handles this correctly
        var updateAuthHeader = authHelper.getAuthHeader(
          "PUT",
          updatePath,
          updateBody,
          queryString
        );
        gs.info(
          "PUT Authorization Header (first 100 chars): " +
            updateAuthHeader.substring(0, 100) +
            "..."
        );

        var updateRequest = new sn_ws.RESTMessageV2(
          "Akamai DNS API",
          "updateDNSRecord"
        );

        // IMPORTANT: Explicitly set HTTP method to PUT
        updateRequest.setHttpMethod("put");

        updateRequest.setStringParameterNoEscape("zone", testConfig.zone);
        updateRequest.setStringParameterNoEscape(
          "hostname",
          testConfig.hostname
        );
        updateRequest.setStringParameterNoEscape(
          "recordType",
          testConfig.recordType
        );

        if (queryString) {
          updateRequest.setQueryParameter(
            "accountSwitchKey",
            testConfig.accountSwitchKey.trim()
          );
        }

        updateRequest.setRequestHeader("Authorization", updateAuthHeader);
        updateRequest.setRequestHeader("Content-Type", "application/json");
        updateRequest.setRequestHeader("Accept", "application/json");
        updateRequest.setRequestBody(updateBody);

        gs.info("Executing UPDATE request...");
        var updateResponse = updateRequest.execute();
        var updateStatus = updateResponse.getStatusCode();
        var updateResponseBody = updateResponse.getBody();

        gs.info("✓ Update Response Status: " + updateStatus);
        gs.info("Update Response Body: " + updateResponseBody);

        if (updateStatus == 200 || updateStatus == 201) {
          gs.info("\n=== ✓ TEST PASSED: DNS Record Updated Successfully ===");
        } else {
          gs.error(
            "\n=== ✗ TEST FAILED: Failed to update DNS record. Status: " +
              updateStatus +
              " ==="
          );
          gs.error("Response: " + updateResponseBody);
        }
      } else {
        gs.info(
          "\n=== ✓ TEST PASSED: DNS Record Exists with Correct Values ==="
        );
      }
    } else {
      gs.error(
        "\n=== ✗ TEST FAILED: Unexpected status code: " + checkStatus + " ==="
      );
      gs.error("Response: " + checkBody);
    }
  } catch (ex) {
    gs.error("\n=== ✗ TEST FAILED: Exception Occurred ===");
    gs.error("Error Message: " + ex.message);
    gs.error("Stack Trace: " + ex.stack);
  }

  gs.info("\n=== TEST COMPLETED ===");
})();
