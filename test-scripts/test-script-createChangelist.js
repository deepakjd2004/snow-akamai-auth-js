(function createAkamaiChangeList() {
  gs.info("=== STARTING AKAMAI CHANGELIST CREATION ===");

  var config = {
    zone: "example.com", // Required: set to your zone
    accountSwitchKey: "", // Optional: set if using account switching
  };

  try {
    var authHelper = new AkamaiEdgeGridAuth();
    var host = gs.getProperty("akamai.host"); // same property the auth helper uses
    var apiPath = "/config-dns/v2/changelists";

    // Build query string in a fixed, known order.
    var queryParts = [];
    if (config.accountSwitchKey) {
      queryParts.push(
        "accountSwitchKey=" + encodeURIComponent(config.accountSwitchKey),
      );
    }
    queryParts.push("zone=" + encodeURIComponent(config.zone));
    var queryString = queryParts.join("&");

    // Sign with the exact same path+query that will be sent.
    var authHeader = authHelper.getAuthHeader("POST", apiPath, "", queryString);

    var request = new sn_ws.RESTMessageV2("Akamai DNS API", "createChangeList");

    // Set the full endpoint URL directly — DO NOT use setQueryParameter()
    // because ServiceNow reorders params, breaking the signature.
    request.setEndpoint("https://" + host + apiPath + "?" + queryString);

    request.setRequestHeader("Authorization", authHeader);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestBody("");

    gs.info("Final Signing Path: " + apiPath + "?" + queryString);

    var response = request.execute();
    var statusCode = response.getStatusCode();
    var responseBody = response.getBody();

    gs.info("Response Status: " + statusCode);
    gs.info("Response Body: " + responseBody);

    if (statusCode == 201 || statusCode == 200) {
      gs.info("✓ Success: ChangeList created.");
    } else {
      gs.error("✗ Failed: Status " + statusCode);
    }
  } catch (ex) {
    gs.error("✗ Exception: " + ex.message);
  }
})();
