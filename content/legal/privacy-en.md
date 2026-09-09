# Dango Privacy Policy

**Effective Date**: September 1, 2026  
**Last Updated**: September 9, 2026  

Dango ("we", "us", or "our") is an open-source visual thinking and diagramming tool maintained by independent creators. We are firmly committed to a pure product philosophy: **"Local-First, Zero-Tracking, and Total User Data Ownership."**

This Privacy Policy objectively and transparently describes how Dango operates, how data is processed, and why your information remains private and secure when using our tool.

---

### 1. Core Architecture: Client-Side Execution & Zero-Server Storage

1. **No Accounts & Zero Personal Information Collection**
   - Dango does not offer or require account registration. We do not collect, request, store, or process any Personally Identifiable Information (PII), such as your name, email address, phone number, physical address, or unique device identifiers.

2. **Local-First & No Backend Database (Zero-Server Storage)**
   - Dango is a purely client-side Single Page Application (SPA) executed entirely within your web browser.
   - All text content, node layouts, diagram connections, notes, grouping structures, and custom configuration settings that you create remain strictly within your browser's local storage (`localStorage`) or within local `.dango` files exported by you.
   - **We operate no backend databases or application servers to receive, store, analyze, or synchronize your canvas content.** Your creative thoughts and intellectual notes never leave your personal device.

---

### 2. Network Infrastructure & Third-Party Services

1. **Cloudflare Infrastructure & Technical Network Access Logs**
   - The official hosted web application (e.g., `dango.ink` and `blog.dango.ink`) is hosted and delivered via the Cloudflare platform (Cloudflare Pages / CDN).
   - When your browser connects to our web application to download static assets (HTML, JavaScript, CSS, icons, etc.), Cloudflare, as an infrastructure and CDN provider, may automatically record standard HTTP/HTTPS technical request logs for the purposes of security defense (e.g., mitigating DDoS attacks), network routing, traffic management, and system reliability.
   - These technical access logs typically include: visitor IP addresses, browser User-Agent strings, requested URLs, referring URLs (Referer), and access timestamps.
   - These logs are processed and governed under the [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/). **The developers of Dango do not and cannot correlate these network infrastructure logs with any specific diagram, node, or text created locally on your canvas.**

2. **Third-Party External Resources (External Images & Fonts)**
   - **External Images & Wallpapers**: If you choose to embed external image URLs or set remote wallpaper URLs, your browser will make a direct HTTP/HTTPS request to the respective third-party hosting server. Such interactions are subject to the privacy practices of those external hosts.
   - **On-Demand Font Loading**: Dango prioritizes native system handwriting fonts (such as `Segoe Print` on Windows and `Chalkboard SE` on macOS). When specific handwriting modes are enabled, Chinese font assets (LXGW WenKai) may be loaded on-demand from Google Fonts CDN.
   - **Completely Offline Air-Gapped Use**: For privacy-critical or enterprise environments requiring strict network isolation, you can download our standalone single-file distribution (`dango.html`) or deploy via Docker, running the entire application completely offline without any internet connection.

---

### 3. Canvas Sharing & Link Generation

Dango provides a client-side "Share as Link" (`LINK` / `EMBED`) feature:
- This feature utilizes the pure client-side `LZString` compression algorithm to compress and encode your canvas data entirely into the URL anchor hash (the portion following the `#` symbol).
- In accordance with standard W3C and HTTP protocol specifications, **URL hashes are processed exclusively by your local browser client and are never transmitted to web servers as part of HTTP requests.**
- Canvas data encoded in a hash can only be unpacked and viewed by individuals who hold the complete URL (including the hash), within their own browser. No copy of your canvas data is retained or stored on any server during link creation.

---

### 4. Zero Tracking, Zero Analytics & Zero Commercial Cookies

- **No Advertisements**: Dango does not display any third-party commercial advertisements.
- **No Analytics Trackers**: We do not embed analytics SDKs or behavioral tracking probes (e.g., Google Analytics, Meta Pixel, or telemetry trackers).
- **No Marketing Cookies**: We do not place persistent HTTP tracking cookies on your device.

---

### 5. Your Absolute Data Control & Erasure

You retain complete and unfettered control over all data stored locally on your device:
- **Instant Canvas Clearing**: Clicking the "Clear Canvas" (trash bin) button immediately purges the active canvas from your local storage.
- **Browser Clearing**: You can purge all saved canvas data at any time via your browser's "Clear Site Data / Clear Cache" settings.
- **Private Browsing**: Utilizing Incognito or Private Browsing mode ensures all locally cached canvas records are automatically and permanently destroyed upon closing the browser window.

---

### 6. Updates & Contact

We may periodically revise this Privacy Policy to reflect technical refinements or evolving legal standards. Revisions will be published on our official developer blog and open-source repository.

For questions, feedback, or concerns regarding our privacy practices, please reach out via:
- **Official Blog**: [https://blog.dango.ink](https://blog.dango.ink)
- **GitHub Repository**: [https://github.com/dango-canvas/dango](https://github.com/dango-canvas/dango)
