# NVD CVE Intelligence Feature Plan

## Overview
Add NVD (National Vulnerability Database) CVE intelligence to the existing Findings feature in apprecon. Users can search for CVEs and link them to their findings.

---

## Implementation Steps

### Step 1: Add NVD Types
**File:** `src/components/findings/nvdTypes.ts`

```typescript
interface CvssMetricV3 {
  source: string;
  type: string;
  cvssData: {
    baseScore: number;
    baseSeverity: string;
    vectorString: string;
  };
}

interface CveItem {
  cve: {
    id: string;
    descriptions: { lang: string; value: string }[];
    published: string;
    lastModified: string;
    metrics?: {
      cvssMetricV31?: CvssMetricV3[];
      cvssMetricV30?: CvssMetricV3[];
    };
    references?: { url: string; source: string }[];
  };
}

interface NvdApiResponse {
  totalResults: number;
  resultsPerPage: number;
  startIndex: number;
  vulnerabilities: CveItem[];
}

interface NvdSearchResult {
  cveId: string;
  description: string;
  severity: string;
  cvssScore: number;
  publishedDate: string;
  lastModifiedDate: string;
  url: string;
}
```

### Step 2: Create NVD API Client
**File:** `src/lib/nvd.ts`

- `searchCves(query: string, startIndex?: number): Promise<NvdSearchResult[]>`
- `getCveById(cveId: string): Promise<NvdSearchResult | null>`
- Endpoint: `https://services.nvd.nist.gov/rest/json/cves/2.0`
- Handle rate limiting (12 req/sec without API key)
- Debounce searches (300ms)

### Step 3: Extend Finding Type
**File:** `src/components/findings/types.ts`

Add optional `linkedCve` field to `Finding` interface:

```typescript
interface LinkedCve {
  cveId: string;
  description: string;
  severity: string;
  cvssScore: number;
  publishedDate: string;
  lastModifiedDate: string;
  url: string;
}
```

### Step 4: Create VulnerabilitySearchDialog Component
**File:** `src/components/findings/VulnerabilitySearchDialog.tsx`

- Modal dialog with search input
- Debounced search (300ms delay)
- Results list with VulnerabilityCard items
- Loading state, error handling, empty state
- "Link" button on each result
- Props: `open`, `onOpenChange`, `onLink(cve: NvdSearchResult)`

### Step 5: Create VulnerabilityCard Component
**File:** `src/components/findings/VulnerabilityCard.tsx`

- CVE ID with link to NVD (`https://nvd.nist.gov/vuln/detail/{cveId}`)
- Severity badge (Critical/High/Medium/Low/Info)
- CVSS score
- Truncated description (2-3 lines)
- Published date
- "Link" button
- Props: `cve: NvdSearchResult`, `onLink`, `disabled`

### Step 6: Modify FindingDialog Component
**File:** `src/components/findings/FindingDialog.tsx`

- Add "Link CVE" button near severity field
- Open `VulnerabilitySearchDialog` on click
- Show `LinkedCveBadge` when CVE is linked
- Unlink option on linked CVE
- Pass `linkedCve` through form data

### Step 7: Modify FindingCard Component
**File:** `src/components/findings/FindingCard.tsx`

- Check if `finding.linkedCve` exists
- If present, display `LinkedCveBadge` with:
  - CVE ID (clickable link to NVD)
  - CVSS score badge

### Step 8: Create LinkedCveBadge Component (Optional)
**File:** `src/components/findings/LinkedCveBadge.tsx`

- Compact badge showing CVE ID + CVSS score
- "X" button to unlink
- Props: `linkedCve: LinkedCve`, `onUnlink`

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `src/components/findings/nvdTypes.ts` |
| Create | `src/lib/nvd.ts` |
| Create | `src/components/findings/VulnerabilitySearchDialog.tsx` |
| Create | `src/components/findings/VulnerabilityCard.tsx` |
| Create | `src/components/findings/LinkedCveBadge.tsx` |
| Modify | `src/components/findings/types.ts` |
| Modify | `src/components/findings/FindingDialog.tsx` |
| Modify | `src/components/findings/FindingCard.tsx` |
| Modify | `src/components/findings/index.ts` (export new components) |

---

## Notes

- NVD API has rate limits: 12 req/sec without API key, 6 req/sec with
- Consider adding API key configuration in future
- User mentioned wanting a "trigger" button to update CVE data later - this can be added as a separate "Refresh CVE" button on linked CVEs
