/**
 * Test script for Akamai DNS DELETE operation
 * Run this in: System Definition → Scripts - Background
 *
 * This tests the DELETE operation for DNS records
 * CAUTION: This will actually delete the DNS record!
 */

(function testAkamaiDNSDelete() {
  gs.info("=== STARTING AKAMAI DNS DELETE TEST ===");

  // ========================================
  // TEST CONFIGURATION - CHANGE THESE VALUES
  // ========================================
  var testConfig = {
    zone: "example.com", // Your zone
    hostname: "www.example.com", // Hostname to delete
    recordType: "A", // Record type
    accountSwitchKey: "", // Optional - leave empty if not needed
  };

  gs.info("Test Configuration:");
  gs.info("  Zone: " + testConfig.zone);
  gs.info("  Hostname: " + testConfig.hostname);
  gs.info("  Record Type: " + testConfig.recordType);
  gs.info("\n WARNING: This will DELETE the DNS record!");

  // ========================================
  // TEST DELETE OPERATION
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
    // CHECK IF DNS RECORD EXISTS (Optional)
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

    var checkAuthHeader = authHelper.getAuthHeader(
      "GET",
      checkPath,
      "",
      queryString
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

    if (checkStatus == 404) {
      gs.info(
        "\n=== ℹ️  SKIPPED: DNS Record does not exist, nothing to delete ==="
      );
      return;
    } else if (checkStatus == 200) {
      var existingRecord = JSON.parse(checkBody);
      gs.info("Found existing record:");
      gs.info("  IP Address: " + JSON.stringify(existingRecord.rdata));
      gs.info("  TTL: " + existingRecord.ttl);
    }

    // ========================================
    // DELETE DNS RECORD
    // ========================================
    gs.info("\n--- Step 3: Delete DNS Record ---");

    var deletePath =
      "/config-dns/v2/zones/" +
      testConfig.zone +
      "/names/" +
      testConfig.hostname +
      "/types/" +
      testConfig.recordType;

    gs.info("Delete Path: " + deletePath);

    // DELETE requests have no body, similar to GET
    var deleteAuthHeader = authHelper.getAuthHeader(
      "DELETE",
      deletePath,
      "",
      queryString
    );
    gs.info(
      "DELETE Authorization Header (first 100 chars): " +
        deleteAuthHeader.substring(0, 100) +
        "..."
    );

    var deleteRequest = new sn_ws.RESTMessageV2(
      "Akamai DNS API",
      "deleteDNSRecord"
    );

    // IMPORTANT: Explicitly set HTTP method to DELETE
    deleteRequest.setHttpMethod("delete");

    deleteRequest.setStringParameterNoEscape("zone", testConfig.zone);
    deleteRequest.setStringParameterNoEscape("name", testConfig.hostname);
    deleteRequest.setStringParameterNoEscape("type", testConfig.recordType);

    if (queryString) {
      deleteRequest.setQueryParameter(
        "accountSwitchKey",
        testConfig.accountSwitchKey.trim()
      );
    }

    deleteRequest.setRequestHeader("Authorization", deleteAuthHeader);
    deleteRequest.setRequestHeader("Content-Type", "application/json");
    deleteRequest.setRequestHeader("Accept", "application/json");

    gs.info("Executing DELETE request...");
    var deleteResponse = deleteRequest.execute();
    var deleteStatus = deleteResponse.getStatusCode();
    var deleteBody = deleteResponse.getBody();

    gs.info("✓ Delete Response Status: " + deleteStatus);
    gs.info("Delete Response Body: " + deleteBody);

    if (deleteStatus == 200 || deleteStatus == 204) {
      gs.info("\n=== ✓ TEST PASSED: DNS Record Deleted Successfully ===");
    } else {
      gs.error(
        "\n=== ✗ TEST FAILED: Failed to delete DNS record. Status: " +
          deleteStatus +
          " ==="
      );
      gs.error("Response: " + deleteBody);
    }

    // ========================================
    // VERIFY DELETION (Optional)
    // ========================================
    gs.info("\n--- Step 4: Verify Record is Deleted ---");

    var verifyAuthHeader = authHelper.getAuthHeader(
      "GET",
      checkPath,
      "",
      queryString
    );

    var verifyRequest = new sn_ws.RESTMessageV2(
      "Akamai DNS API",
      "checkDNSRecord"
    );
    verifyRequest.setStringParameterNoEscape("zone", testConfig.zone);
    verifyRequest.setStringParameterNoEscape("hostname", testConfig.hostname);
    verifyRequest.setStringParameterNoEscape(
      "recordType",
      testConfig.recordType
    );

    if (queryString) {
      verifyRequest.setQueryParameter(
        "accountSwitchKey",
        testConfig.accountSwitchKey.trim()
      );
    }

    verifyRequest.setRequestHeader("Authorization", verifyAuthHeader);
    verifyRequest.setRequestHeader("Content-Type", "application/json");

    var verifyResponse = verifyRequest.execute();
    var verifyStatus = verifyResponse.getStatusCode();

    gs.info("✓ Verification Status: " + verifyStatus);

    if (verifyStatus == 404) {
      gs.info("✓ Confirmed: Record no longer exists");
    } else {
      gs.warn(" Record still exists - may take time to propagate");
    }
  } catch (ex) {
    gs.error("\n=== ✗ TEST FAILED: Exception Occurred ===");
    gs.error("Error Message: " + ex.message);
    gs.error("Stack Trace: " + ex.stack);
  }

  gs.info("\n=== TEST COMPLETED ===");
})();
