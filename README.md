# Akamai EdgeGrid Authentication for ServiceNow

This repository contains ServiceNow integration code for Akamai's EdgeGrid authentication and Edge DNS management.

While this repo has example code for Edge DNS management but same concept can be used for making call to other Akamai OPEN API's.

## Overview

This integration enables ServiceNow to interact with Akamai's APIs using EdgeGrid authentication, specifically for managing DNS records through the Akamai Edge DNS API. The solution consists of an authentication helper class and a business rule example for automated DNS record management.

## Components

### 1. `snow-akamai-auth_v2.js` - Script Include

The core authentication module that implements Akamai's EdgeGrid v1 HMAC-SHA256 authentication scheme.

**Dependencies:**

- Requires the **Hashes** library (jshashes) for HMAC-SHA256 cryptographic operations

**Features:**

- EdgeGrid v1 HMAC-SHA256 authentication
- Support for GET, POST, PUT, DELETE HTTP methods
- Query string parameter handling (e.g., accountSwitchKey for multi-account management)
- Content hash generation for POST/PUT requests
- Automatic timestamp and nonce generation

**Usage:**

```javascript
var authHelper = new AkamaiEdgeGridAuth();
var authHeader = authHelper.getAuthHeader(
  "GET",
  "/config-dns/v2/zones/example.com",
  "",
  ""
);
```

### 2. `example-EDNS-code.js` - Business Rule Example

A complete ServiceNow Business Rule that demonstrates how to use the authentication helper to manage Akamai DNS records.

**Functionality:**

- Checks if a DNS record exists for a given hostname
- Creates the DNS record if it doesn't exist
- Updates the ServiceNow record with status and response messages
- Supports multi-account operations via accountSwitchKey

## Prerequisites

### ServiceNow Setup

1. **System Properties** - Configure the following properties in ServiceNow:

   - `akamai.client_token` - Your Akamai API client token
   - `akamai.client_secret` - Your Akamai API client secret
   - `akamai.access_token` - Your Akamai API access token
   - `akamai.host` - Your Akamai API host (e.g., `akab-xxxxx.luna.akamaiapis.net`)

2. **REST Message** - Create an outbound REST message named "Akamai DNS API" with the following methods:

   - `checkDNSRecord` - GET method to check if DNS record exists
   - `createDNSRecord` - POST method to create DNS records

3. **Custom Table Fields** (for the Business Rule example):
   - `u_zone` - DNS zone
   - `u_hostname` - Hostname/FQDN
   - `u_record_type` - DNS record type (A, CNAME, etc.)
   - `u_ip_address` - IP address or target
   - `u_ttl` - Time to live
   - `u_account_switch_key` - Optional account switch key
   - `u_status` - Status field (success/failed)
   - `u_response_message` - Response message field

### Akamai Setup

1. Create API credentials in Akamai Control Center
2. Ensure credentials have appropriate permissions for DNS management
3. Note your API host endpoint

## Installation

### Step 1: Install Hashes Library (Required Dependency)

The `AkamaiEdgeGridAuth` script depends on the Hashes library for HMAC-SHA256 operations.

1. Navigate to **System Definition > Script Includes**
2. Click **New** to create a new Script Include
3. Configure the following settings:
   - **Name:** `Hashes`
   - **API Name:** `global.Hashes` (auto-fills)
   - **Application:** Global (or your custom app)
   - **Accessible from:** All application scopes ✓
   - **Active:** ✓ (checked)
4. Copy the script content from: https://github.com/h2non/jshashes/blob/master/hashes.js
5. Paste the entire content into the Script field
6. Click **Submit**

### Step 2: Install AkamaiEdgeGridAuth Script Include

1. Navigate to **System Definition > Script Includes**
2. Click **New** to create a new Script Include
3. Configure the following settings:
   - **Name:** `AkamaiEdgeGridAuth`
   - **API Name:** `global.AkamaiEdgeGridAuth` (auto-fills)
   - **Application:** Global (or your custom app)
   - **Active:** ✓ (checked)
4. Copy the contents of `snow-akamai-auth_v2.js` from this repository
5. Paste into the Script field
6. Click **Submit**

### Step 3: Configure System Properties

- Navigate to **System Properties > System Properties**
- Create the required Akamai properties listed above
- Enter your Akamai API credentials

### Step 4: Create REST Message

1. Navigate to **System Web Services > Outbound > REST Message**
2. Click **New** to create a new REST Message
3. Set **Name:** `Akamai DNS API`
4. Configure the base endpoint and authentication as needed
5. Create the following HTTP Methods:
   - **checkDNSRecord** (GET method)
   - **createDNSRecord** (POST method)
6. Click **Submit**

### Step 5: Implement Business Rule (Optional)

1. Use `example-EDNS-code.js` as a template
2. Create a Business Rule on your custom table
3. Customize for your specific requirements
4. Ensure all custom table fields (u_zone, u_hostname, etc.) exist

## API Endpoints

The integration supports Akamai's Edge DNS API v2 endpoints:

- **Check DNS Record:** `GET /config-dns/v2/zones/{zone}/names/{hostname}/types/{recordType}`
- **Create DNS Record:** `POST /config-dns/v2/zones/{zone}/names/{hostname}/types/{recordType}`

## Authentication Flow

1. Retrieve credentials from System Properties
2. Generate timestamp
3. Generate unique nonce
4. Build signature data string with request details
5. Create HMAC-SHA256 hash using client secret and timestamp
6. Generate signature using the signing key
7. Build EdgeGrid authorization header

## Error Handling

The business rule example includes comprehensive error handling:

- HTTP status code validation
- Exception catching and logging
- ServiceNow record updates with error details
- Detailed logging via `gs.info()` and `gs.error()`

## Multi-Account Support

The integration supports Akamai's account switching feature for managing DNS across multiple accounts:

```javascript
var queryString = "accountSwitchKey=" + encodeURIComponent(accountSwitchKey);
var authHeader = authHelper.getAuthHeader("GET", path, "", queryString);
```

## Security Considerations

- Store all Akamai credentials in ServiceNow System Properties (encrypted if possible)
- Never hardcode credentials in scripts
- Use ACLs to restrict access to the Script Include and related records
- Implement appropriate ServiceNow security roles

## Troubleshooting

### Authentication Errors

- Verify credentials are correct in System Properties
- Check that the API host is properly formatted
- Ensure timestamps are in correct UTC format

### DNS Operation Failures

- Confirm API credentials have DNS management permissions
- Verify zone exists and is accessible
- Check accountSwitchKey if using multi-account features

### Logging

The example code includes extensive logging. Check ServiceNow logs:

- Navigate to System Logs > System Log > All
- Filter for "Akamai" to see related log entries

## Dependencies

- **jshashes** - JavaScript library for cryptographic hash functions
  - GitHub: https://github.com/h2non/jshashes
  - Used for HMAC-SHA256 signature generation in EdgeGrid authentication

## References

- [Akamai EdgeGrid Authentication](https://techdocs.akamai.com/developer/docs/edgegrid)
- [Akamai Edge DNS API](https://techdocs.akamai.com/edge-dns/reference/edge-dns-api)
- [ServiceNow REST API Documentation](https://www.servicenow.com/docs/bundle/zurich-api-reference/page/integrate/outbound-rest/concept/c_OutboundRESTWebService.html)
- [jshashes Library](https://github.com/h2non/jshashes)
