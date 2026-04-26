(function manageAkamaiChangeList() {
  gs.info("=== STARTING AKAMAI CHANGELIST MANAGEMENT ===");

  var config = {
    zone: "example.com", // Required: set to your zone
    accountSwitchKey: "", // Optional: set if using account switching
    comment:
      "Adding DNS record via ServiceNow automation " +
      new GlideDateTime().toString(),

    // DNS Record to add/change
    record: {
      op: "ADD", // "ADD", "EDIT", or "DELETE"
      name: "snow92.example.com", // Fully qualified record name
      type: "A", // Record type: A, CNAME, MX, TXT, etc.
      ttl: 300,
      rdata: ["10.0.0.1"], // Array of record data values
    },
  };

  // ── Helper: build query string ──────────────────────────────────────────────
  function buildQuery(params) {
    var parts = [];
    for (var k in params) {
      if (params[k]) parts.push(k + "=" + encodeURIComponent(params[k]));
    }
    return parts.join("&");
  }

  // ── Helper: sign + execute a REST call ─────────────────────────────────────
  function callAkamai(method, apiPath, queryString, bodyObj) {
    var authHelper = new AkamaiEdgeGridAuth();
    var host = gs.getProperty("akamai.host");

    var bodyStr = bodyObj ? JSON.stringify(bodyObj) : "";
    var authHeader = authHelper.getAuthHeader(
      method,
      apiPath,
      bodyStr,
      queryString,
    );

    var request = new sn_ws.RESTMessageV2("Akamai DNS API", "createChangeList");
    request.setEndpoint(
      "https://" + host + apiPath + (queryString ? "?" + queryString : ""),
    );
    request.setRequestHeader("Authorization", authHeader);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Accept", "application/json");
    request.setHttpMethod(method);
    request.setRequestBody(bodyStr);

    var response = request.execute();
    return {
      status: response.getStatusCode(),
      body: response.getBody(),
    };
  }

  // ── Helper: parse JSON safely ───────────────────────────────────────────────
  function parseJSON(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  try {
    var zone = config.zone;
    var accountSwitchKey = config.accountSwitchKey;

    // ── STEP 1: Create the changelist ─────────────────────────────────────────
    gs.info("--- Step 1: Creating changelist for zone: " + zone);

    var createQuery = buildQuery({
      accountSwitchKey: accountSwitchKey,
      zone: zone,
    });
    var createResp = callAkamai(
      "POST",
      "/config-dns/v2/changelists",
      createQuery,
      null,
    );

    gs.info("Create Status: " + createResp.status);
    gs.info("Create Body:   " + createResp.body);

    if (createResp.status != 201 && createResp.status != 200) {
      gs.error("✗ Failed to create changelist. Aborting.");
      return;
    }
    gs.info("✓ Changelist created.");

    // ── STEP 2: Add / change the DNS record ───────────────────────────────────
    gs.info("--- Step 2: Adding/changing record: " + config.record.name);

    var addQuery = buildQuery({ accountSwitchKey: accountSwitchKey });
    var addPath =
      "/config-dns/v2/changelists/" +
      encodeURIComponent(zone) +
      "/recordsets/add-change";
    var addResp = callAkamai("POST", addPath, addQuery, config.record);

    gs.info("Add-Change Status: " + addResp.status);
    gs.info("Add-Change Body:   " + (addResp.body || "(no content)"));

    // Akamai returns 204 No Content on success for this endpoint
    if (
      addResp.status != 204 &&
      addResp.status != 200 &&
      addResp.status != 201
    ) {
      gs.error(
        "✗ Failed to add/change record (status " +
          addResp.status +
          "). Aborting activation.",
      );
      return;
    }
    gs.info("✓ Record added/changed successfully.");

    // ── STEP 3: Activate (submit) the changelist ──────────────────────────────
    gs.info("--- Step 3: Activating changelist...");

    var submitQuery = buildQuery({
      accountSwitchKey: accountSwitchKey,
      comment: config.comment,
    });
    var submitPath =
      "/config-dns/v2/changelists/" + encodeURIComponent(zone) + "/submit";
    var submitResp = callAkamai("POST", submitPath, submitQuery, null);

    gs.info("Activate Status: " + submitResp.status);
    gs.info("Activate Body:   " + (submitResp.body || "(no content)"));

    // Akamai returns 204 on successful submission
    if (submitResp.status == 204) {
      gs.info("✓ Changelist activated successfully. DNS change is live.");
    } else if (submitResp.status == 200 || submitResp.status == 201) {
      gs.info("✓ Changelist activated. Response: " + submitResp.body);
    } else {
      gs.error(
        "✗ Activation failed (status " +
          submitResp.status +
          "): " +
          submitResp.body,
      );
    }
  } catch (ex) {
    gs.error("✗ Exception: " + ex.message);
  }
})();
