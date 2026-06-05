# collaborator-desktop-prd.md

# AppRecon Collaborator Desktop

## Overview

AppRecon Collaborator Desktop is the client-side interface for managing Out-of-Band (OOB) testing infrastructure.

The desktop application allows users to:

* Generate payloads
* Monitor interactions
* Integrate with Repeater
* Integrate with Scanner
* Export PoC evidence
* Connect to one or more self-hosted Collaborator servers

The desktop application never receives inbound callbacks directly.

All callbacks are collected by the Collaborator Server and synchronized through the Collaborator API.

---

# Goals

Provide a Burp Collaborator-like experience fully integrated into AppRecon.

Allow testers to verify:

* SSRF
* Blind SSRF
* Blind XSS
* Blind RCE
* XXE
* Blind SQLi
* Webhook abuse
* DNS Exfiltration

---

# Navigation

```text
AppRecon
├── Proxy
├── Repeater
├── Scanner
├── Collaborator
└── Reports
```

---

# Collaborator Module

```text
Collaborator
├── Dashboard
├── Payloads
├── Interactions
├── Reports
└── Settings
```

---

# Dashboard

Purpose:

Provide a high-level overview of collaborator activity.

Widgets:

```text
Active Payloads
Interactions Today
DNS Events
HTTP Events
HTTPS Events
Last Callback
Connected Server
```

---

# Payload Management

## Create Payload

Fields:

Name
Description
Tags
Expiration

Example:

```text
Avatar SSRF Test
Testing image fetch endpoint
```

Generated:

```text
u7a9m2.collab.company.com
```

---

## Payload List

Columns:

```text
Payload
Description
Tags
Interactions
Created
Last Seen
Status
```

Actions:

```text
Copy
Archive
Delete
Export
```

---

# Interaction Viewer

Purpose:

View callback activity.

Filters:

```text
DNS
HTTP
HTTPS
Date Range
Payload
```

Columns:

```text
Timestamp
Type
Payload
Source IP
Method
Path
```

---

# Interaction Details

Display:

```text
Payload
Timestamp
Source IP
Headers
Raw Request
Request Body
```

Tabs:

```text
Overview
Headers
Body
Raw
```

---

# Repeater Integration

New Action:

Insert Collaborator Payload

Workflow:

```text
Open Request
→ Right Click
→ Insert Collaborator Payload
```

Result:

```text
https://u7a9m2.collab.company.com
```

---

# Scanner Integration

Future Phase

Automatic payload insertion.

Target Parameters:

```text
url
image
avatar
callback
host
webhook
xml
dns
redirect
```

---

# Report Export

Formats:

```text
Markdown
HTML
JSON
```

Example:

```text
SSRF detected

Payload:
u7a9m2.collab.company.com

Evidence:
DNS callback received
HTTP callback received

Timestamp:
2026-06-04
```

---

# Settings

## Server Configuration

Fields:

```text
Server Name
Server URL
API Key
```

Example:

```text
Production Collaborator
https://collab.company.com
```

---

# Multiple Server Support

Users may register multiple collaborator servers.

Example:

```text
Personal VPS
Company Collaborator
Client Environment
```

---

# Notifications

Real-time notifications:

```text
Payload Triggered
New DNS Interaction
New HTTP Interaction
Server Offline
```

---

# Desktop Technology Stack

Frontend

```text
React
Shadcn UI
TanStack Query
Tauri
```

Backend

```text
Rust
Tauri Commands
Reqwest
Tokio
```

---

# MVP Scope

Included

```text
Dashboard
Payload Management
Interaction Viewer
Server Management
Repeater Integration
Report Export
```

Excluded

```text
Scanner Automation
SMTP Monitoring
Multi-user Collaboration
AI Analysis
```
