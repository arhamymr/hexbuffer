# Threats

## Overview

The Threats workspace is Oxbuffer's static malware triage and reverse-engineering area. It lets you import a binary sample, copy it into app-managed storage, run local analysis, inspect extracted artifacts, and optionally enrich the result with Ghidra Headless output.

Threats is designed for repeatable local analysis:

- Imported samples are copied into Oxbuffer app data.
- Analysis results are stored as JSON artifacts.
- The original file path is not required after import.
- Ghidra is optional and configured by the user.

> This feature is still marked as not fully tested in the UI. Use benign samples for initial validation and handle suspicious binaries in an isolated malware-analysis environment.

---

## What Threats Extracts

Threats can produce:

| Area | Data |
|---|---|
| Overview | File size, hashes, file type, architecture, endian, entry point, compiler hint, sections, entropy |
| Strings | Printable strings with offsets, lengths, and encoding |
| Imports | Imported symbols and libraries when available |
| Exports | Exported symbols when available |
| Functions | Ghidra-exported function list |
| Decompiled Code | Ghidra decompiler output in Monaco |
| Call Graph | Ghidra-exported function call graph |
| YARA | Matches from imported rule packs and one-off selected rule files |
| MITRE ATT&CK | Placeholder for later mapping |
| AI Analysis | Placeholder for later AI-assisted threat assessment |

---

## Open the Workspace

1. Start Oxbuffer.
2. Open the left navigation.
3. Select **Threats**.

The workspace has a sample list on the left and analysis tabs on the right:

- **Overview**
- **Strings**
- **Imports**
- **Functions**
- **Decompiled Code**
- **Call Graph**
- **YARA**
- **MITRE ATT&CK**
- **AI Analysis**

---

## Import a Sample

1. Open **Threats**.
2. Click the import button in the left sample panel.
3. Select the binary you want to analyze.

After import, Oxbuffer copies the file into app-managed storage:

```text
threats/samples/<sample_id>/sample
```

The imported sample appears in the left panel with:

- File name
- Size
- Last updated time
- SHA-256 hash preview

You can delete the selected sample with the trash button in the top toolbar. Deleting a sample removes the copied sample and its analysis artifacts.

---

## Run v1 Static Analysis

1. Select an imported sample.
2. Leave the **Ghidra** switch off.
3. Optionally choose a one-off YARA file with the **YARA** button.
4. Click **Analyze**.

Static analysis runs locally and extracts:

- MD5, SHA-1, and SHA-256
- Binary metadata
- Sections and entropy
- Strings
- Imports and exports
- YARA matches

Analysis progress appears in the bottom **Analysis Log** panel. While analysis is running, the **Analyze** button changes to **Cancel**.

---

## Configure YARA Rule Packs

Use Settings when you want reusable YARA rules to run on every analysis.

1. Open **Settings**.
2. Select the **Threats** settings tab.
3. In **YARA rule packs**, click **Import Rules**.
4. Choose a `.yar`, `.yara`, or `.txt` rule file.
5. Keep the checkbox enabled for rule packs that should run automatically.

Imported rules are copied into app-managed storage. You can:

- Enable or disable a rule pack with its checkbox.
- Delete a rule pack with the trash button.
- Still use the Threats toolbar **YARA** button for a one-off rule file.

When YARA matches are found, the **YARA** tab shows the rule pack name, rule, namespace, and tags.

---

## Configure Ghidra Headless

Ghidra is not bundled. To use v2 analysis, install Ghidra separately and configure the `analyzeHeadless` executable.

1. Install Ghidra on your machine.
2. Open **Settings**.
3. Select the **Threats** settings tab.
4. Enter the path to `analyzeHeadless`.
5. Click **Validate**.
6. If validation succeeds, click **Save**.

Example paths:

```text
/Applications/ghidra/support/analyzeHeadless
/opt/ghidra/support/analyzeHeadless
C:\ghidra\support\analyzeHeadless.bat
```

If the path is missing or invalid, Ghidra analysis fails safely and the UI shows an error instead of blocking static analysis.

---

## Run v2 Ghidra Analysis

1. Select an imported sample.
2. Turn on the **Ghidra** switch in the Threats toolbar.
3. Click **Analyze**.

Oxbuffer runs Ghidra Headless with repo-managed export scripts and writes JSON artifacts under:

```text
threats/artifacts/<sample_id>/
```

Ghidra-powered tabs include:

- **Functions** — function addresses, names, signatures, sizes, and references.
- **Decompiled Code** — decompiled C-like output in a read-only Monaco editor.
- **Call Graph** — function nodes and call edges rendered as an interactive graph.

Ghidra jobs can take longer than static analysis. Use **Cancel** to request cancellation while a job is running.

---

## Search Results

Use the search box in the top toolbar to filter visible results in supported tabs:

- **Strings** searches string values and offsets.
- **Imports** searches import/export names and libraries.
- **Functions** searches function names and addresses.

The search field is page-local and does not modify stored artifacts.

---

## Artifact Storage

Threats writes imported samples and outputs into app-managed storage:

```text
threats/samples/<sample_id>/sample
threats/artifacts/<sample_id>/metadata.json
threats/artifacts/<sample_id>/hashes.json
threats/artifacts/<sample_id>/strings.json
threats/artifacts/<sample_id>/imports.json
threats/artifacts/<sample_id>/exports.json
threats/artifacts/<sample_id>/entropy.json
threats/artifacts/<sample_id>/yara.json
threats/artifacts/<sample_id>/functions.json
threats/artifacts/<sample_id>/decompiled.json
threats/artifacts/<sample_id>/callgraph.json
```

Settings are stored separately under:

```text
threats/settings.json
```

Because samples are copied on import, moving or deleting the original uploaded file does not break later analysis.

---

## Troubleshooting

### The sample imports but analysis fails

Check the **Analysis Log** panel. Static parsing can fail on malformed files, unsupported formats, invalid YARA rules, or file permission issues.

### YARA rules do not match

Confirm that:

- The rule pack is enabled in **Settings → Threats**.
- The one-off rule file selected from the toolbar is the expected file.
- The YARA rule compiles successfully.
- The rule is written for the imported sample's bytes, not its original path.

### Ghidra analysis fails immediately

Confirm that:

- `analyzeHeadless` is installed.
- The configured path points to the executable or script, not the Ghidra app folder.
- The path validates in **Settings → Threats**.
- Java requirements for your Ghidra installation are available.

### Functions, Decompiled Code, or Call Graph tabs are empty

Those tabs require Ghidra analysis. Re-run analysis with the **Ghidra** switch enabled.

### Analysis appears stuck

Ghidra jobs can take time on large binaries. Watch the **Analysis Log** panel. If needed, click **Cancel** and rerun without Ghidra first to confirm the static engine path works.

---

## Related Code

- [Threats page](file:///Users/arham/Desktop/project/apprecon/src/pages/threats/index.tsx)
- [Threats page hook](file:///Users/arham/Desktop/project/apprecon/src/pages/threats/hooks/use-threats-page.ts)
- [Threats workspace UI](file:///Users/arham/Desktop/project/apprecon/src/pages/threats/components/threats-workspace.tsx)
- [Threats settings UI](file:///Users/arham/Desktop/project/apprecon/src/pages/settings/components/threats-settings-tab.tsx)
- [Threats backend commands](file:///Users/arham/Desktop/project/apprecon/src-tauri/src/commands/threats.rs)
- [Threats backend engine](file:///Users/arham/Desktop/project/apprecon/src-tauri/src/threats/mod.rs)
