#dango #security #specification

*The following content was generated from a comprehensive security and privacy audit of the codebase:*

---

### **Dango's Security & Privacy Model Analysis**

Dango's security and privacy architecture is built upon a fundamental design principle: **it is a pure client-side web application**. All computations, data processing, and state storage occur strictly within the user's local environment (the web browser). There is no centralized backend server, no application database, and no intermediate cloud processing involved in managing user data.

Based on this principle, we can examine Dango's technical implementation and security implications across several critical dimensions.

---

### **1. Data Persistence: Browser Local Storage**

*   **Implementation**: The application uses the browser's native `localStorage` API to persist canvas data (nodes, connectors, viewport transform state) and user preferences. All keys are scoped with the `cc-` prefix in the browser's storage sandbox.
*   **Security Implications**: `localStorage` is strictly governed by the browser's **Same-Origin Policy (SOP)**. Only scripts executing within the `dango.ink` origin can read or modify this data; no third-party site can access or tamper with it. The data remains strictly bound to the user's local browser instance, is never synced across devices without explicit user action, and is never transmitted to remote servers. Data cleanup is completely under the user's control and can be permanently removed via the browser's built-in "Clear Site Data" utility.

---

### **2. Data Sharing: URL Fragment Identifiers**

*   **Implementation**: When a user selects "Share", Dango compresses the full canvas data on the client side using the `lz-string` library and encodes it into the URL fragment (Hash), yielding a URL format like `...dango.ink/#<compressed_data>`.
*   **Security Implications**: According to the HTTP protocol specifications (RFC 3986), the fragment component following `#` is **never sent by the browser in HTTP request headers to the server**. It is strictly a client-side beacon used for in-page navigation and state management. Consequently, the generation, compression, and parsing of share links are executed entirely in the local browser. The data leaves the device only when the user deliberately sends the generated link to a recipient, bypassing any intermediary server or tracking service.

---

### **3. External Communication: Optional On-Demand Fonts**

*   **Implementation**: By default, Dango initiates zero outbound network requests after initial page load. The only exception occurs when a user explicitly enables the "Handwriting Style" option, which fetches font files from `fonts.googleapis.com`.
*   **Security Implications**: This is an explicit, optional, and single-purpose network request. It carries no user identity, canvas content, or tracking payloads. Users with strict offline requirements or privacy concerns regarding external CDN requests can simply leave this feature off, ensuring the application functions in a completely air-gapped, zero-network environment.

---

### **4. Deployment & Runtime: Static File Delivery**

*   **Implementation**: Dango's online deployment model is remarkably minimalist. It serves a pre-built static bundle via Nginx, with CSS and JavaScript assets optimized and delivered as plain static files.
*   **Security Implications**: The server does not execute dynamic backend runtimes (such as Node.js, Python, or PHP) and maintains no databases. As a result, traditional server-side attack vectors—such as SQL injection, server-side request forgery (SSRF), and remote code execution (RCE)—are fundamentally eliminated. The attack surface is reduced solely to standard static file hosting.

---

### **5. Browser Extension: Principle of Least Privilege**

*   **Implementation**: The companion extensions for Chromium and Firefox request the bare minimum permissions in `manifest.json`:
    *   `"permissions": ["tabs"]`: Used solely to detect or focus an existing Dango tab when the extension icon is clicked, preserving a seamless single-instance workflow.
    *   `"data_collection_permissions": {"required": ["none"]}`: Explicitly declaring to the browser store and users that zero data is collected.
*   **Security Implications**: Extension capabilities are strictly limited to basic tab management. It does not inspect page contents, monitor web traffic, or communicate with external telemetry endpoints. This commitment is verified during store audit processes.

---

### **6. Supply Chain Integrity: Minimalist Dependencies**

*   **Implementation**: In its runtime environment, Dango depends solely on one lightweight utility library, `lz-string.min.js`, for data compression. It avoids heavy runtime frontend frameworks (e.g., React, Angular, Vue), implementing its core rendering and interaction engine in clean, native JavaScript.
*   **Security Implications**: Minimizing dependencies directly reduces vulnerability to software supply chain attacks. `lz-string` is a battle-tested, single-purpose library with an auditable and predictable code footprint—in stark contrast to applications that bundle hundreds of unvetted packages.

---

### **Summary of Security Architecture**

| Dimension | Implementation | Security & Privacy Guarantee |
| :--- | :--- | :--- |
| **Data Storage** | Pure client-side via `localStorage` | Data never leaves the device; eliminates server breach risks |
| **Data Sharing** | Client-side URL Hash encoding | Transmitted peer-to-peer by user choice; zero server transit |
| **Network Traffic** | Zero outbound requests by default (optional fonts) | Minimal external surface; transparent, offline-capable |
| **Server Runtime** | Static file hosting (Nginx) | No backend execution or DB; zero server-side attack surface |
| **Dependencies** | Zero runtime framework; single utility library | Supply chain risk minimized to the highest feasible standard |

In conclusion, Dango's design philosophy embodies **defense-in-depth focused entirely on the client side**. By systematically removing reliance on centralized servers, it eliminates an entire class of security vulnerabilities and privacy risks. Users retain unconditional ownership and full sovereignty over their data.
