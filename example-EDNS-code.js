/**
 * Purpose: ServiceNow Business Rule for Akamai Edge DNS Record Management
 *
 * This script integrates with Akamai's Edge DNS API to automatically manage DNS records.
 * It checks if a DNS record exists for a given hostname, and if not, creates it with the
 * specified configuration (zone, record type, IP address, TTL). The script uses Akamai's
 * EdgeGrid authentication and supports multi-account management via accountSwitchKey. Use of acountSwitchKey is optional.
 *
 * The rule updates the current record's status and response message based on the API results.
 * It uses ServiceNow's RESTMessageV2 for API calls and handles errors gracefully.
 *
 * Note: Ensure that the Akamai EdgeGrid authentication helper i.e. AkamaiEdgeGridAuth() is properly configured in ServiceNow.
 * Code for AkamaiEdgeGridAuth() is presented in snow-akamai-auth.js file in this repo.
 *  */

(function executeRule(current, previous) {
  gs.info(
    "*** BUSINESS RULE FIRED for record: " + current.getValue("u_hostname")
  );

  // Get values from the current record
  var zone = current.getValue("u_zone");
  var hostname = current.getValue("u_hostname");
  var recordType = current.getValue("u_record_type") || "A";
  var ipAddress = current.getValue("u_ip_address");
  var ttl = current.getValue("u_ttl") || 300;
  var accountSwitchKey = current.getValue("u_account_switch_key") || "";

  gs.info("Processing DNS request for: " + hostname);

  try {
    var authHelper = new AkamaiEdgeGridAuth();

    // Build query string if accountSwitchKey is provided
    var queryString = "";
    if (accountSwitchKey && accountSwitchKey.trim().length > 0) {
      queryString =
        "accountSwitchKey=" + encodeURIComponent(accountSwitchKey.trim());
      gs.info("Using account switch key: " + accountSwitchKey);
    }

    // Step 1: Check if DNS record exists
    gs.info("Checking if DNS record exists: " + hostname);

    var checkPath =
      "/config-dns/v2/zones/" +
      zone +
      "/names/" +
      hostname +
      "/types/" +
      recordType;
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
    checkRequest.setStringParameterNoEscape("zone", zone);
    checkRequest.setStringParameterNoEscape("hostname", hostname);
    checkRequest.setStringParameterNoEscape("recordType", recordType);

    // Add query parameter if provided
    if (queryString) {
      checkRequest.setQueryParameter(
        "accountSwitchKey",
        accountSwitchKey.trim()
      );
    }

    checkRequest.setRequestHeader("Authorization", checkAuthHeader);
    checkRequest.setRequestHeader("Content-Type", "application/json");

    var checkResponse = checkRequest.execute();
    var checkStatus = checkResponse.getStatusCode();

    gs.info("Check DNS record status: " + checkStatus);

    // Step 2: If record doesn't exist (404), create it
    if (checkStatus == 404) {
      gs.info("Record does not exist. Creating new DNS record...");

      var createPath =
        "/config-dns/v2/zones/" +
        zone +
        "/names/" +
        hostname +
        "/types/" +
        recordType;
      gs.info("Request path: " + createPath);
      gs.info("Zone: " + zone);
      gs.info("Hostname: " + hostname);
      var requestBody = JSON.stringify({
        ttl: parseInt(ttl),
        name: hostname,
        type: recordType,
        rdata: [ipAddress],
      });

      gs.info("Request body being sent: " + requestBody);

      var createAuthHeader = authHelper.getAuthHeader(
        "POST",
        createPath,
        requestBody,
        queryString
      );

      var createRequest = new sn_ws.RESTMessageV2(
        "Akamai DNS API",
        "createDNSRecord"
      );
      createRequest.setStringParameterNoEscape("zone", zone);
      createRequest.setStringParameterNoEscape("hostname", hostname);
      createRequest.setStringParameterNoEscape("recordType", recordType);
      createRequest.setStringParameterNoEscape("ttl", ttl.toString());
      createRequest.setStringParameterNoEscape(
        "ipAddress",
        '"' + ipAddress + '"'
      );

      // Add query parameter if provided
      if (queryString) {
        createRequest.setQueryParameter(
          "accountSwitchKey",
          accountSwitchKey.trim()
        );
      }

      createRequest.setRequestHeader("Authorization", createAuthHeader);
      createRequest.setRequestHeader("Content-Type", "application/json");
      createRequest.setRequestBody(requestBody);

      var createResponse = createRequest.execute();
      var createStatus = createResponse.getStatusCode();
      var createBody = createResponse.getBody();

      gs.info("Create DNS record status: " + createStatus);
      gs.info("Create DNS record response: " + createBody);

      if (createStatus == 201 || createStatus == 200) {
        current.setValue("u_status", "success");
        current.setValue(
          "u_response_message",
          "DNS record created successfully"
        );
        current.update();
      } else {
        current.setValue("u_status", "failed");
        current.setValue(
          "u_response_message",
          "Failed to create DNS record. Status: " +
            createStatus +
            ". Error: " +
            createBody
        );
        current.update();
      }
    } else if (checkStatus == 200) {
      gs.info("Record already exists");
      current.setValue("u_status", "success");
      current.setValue("u_response_message", "DNS record already exists");
      current.update();
    } else {
      current.setValue("u_status", "failed");
      current.setValue(
        "u_response_message",
        "Unexpected status code: " +
          checkStatus +
          ". Response: " +
          checkResponse.getBody()
      );
      current.update();
    }
  } catch (ex) {
    var message = ex.message || ex.toString();
    gs.error("Error in Akamai DNS integration: " + message);
    current.setValue("u_status", "failed");
    current.setValue("u_response_message", "Exception occurred: " + message);
    current.update();
  }
})(current, previous);
