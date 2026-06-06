# Analysis Module Refactoring

The `default-tools.mjs` file (824 lines) has been split into smaller, focused modules:

## File Structure

```
lib/analysis/
├── constants.mjs       (172 lines) - Static data and patterns
├── helpers.mjs         (372 lines) - Utility and evidence functions
├── default-tools.mjs   (301 lines) - Tool definitions and exports
├── ai-workflow.mjs     (unchanged)
└── analysis.mjs        (unchanged) - Re-exports
```

## Module Responsibilities

### constants.mjs
- `PATTERNS` - Regex patterns for detecting security-relevant content
- `OWASP_WEB_TOP_10_2025` - OWASP Web Top 10 (2025) categories
- `OWASP_API_TOP_10_2023` - OWASP API Top 10 (2023) categories
- `MAX_EVIDENCE_ITEMS` - Evidence collection limit
- `NON_ACTIONABLE_FIELD_TYPES` - Non-actionable form field types

### helpers.mjs
- Text normalization utilities (`cleanText`, `asString`, `arrayOf`)
- Extract normalization (`normalizeExtract`, `normalizeHttpStatus`)
- Field/link/button/script text extracters
- Pattern matching and evidence collection functions
- Insight creation helpers (`createInsight`, `countLabel`)
- OWASP evidence collectors (`webOwaspEvidence`, `apiOwaspEvidence`)
- URL prioritization helpers (`scorePrioritizedUrl`, `reasonForLink`)

### default-tools.mjs
- `DEFAULT_ANALYSIS_TOOLS` - Array of analysis tool definitions
- `MANUAL_ANALYSIS_TOOLS` - Alias for manual analysis
- `runDefaultAnalysisTools()` - Execute enabled tools
- `runManualAnalysisTools()` - Manual analysis entry point
- `heuristicAnalyze()` - Main heuristic analysis function

## Benefits

1. **Better organization** - Each file has a single responsibility
2. **Easier maintenance** - Changes to patterns don't touch tool logic
3. **Improved readability** - Smaller, focused files are easier to understand
4. **Better testability** - Utilities can be tested independently
5. **Reduced cognitive load** - No need to scroll through 800+ lines

## Backward Compatibility

All exports remain unchanged. The `analysis.mjs` re-export file continues to work as before, so no changes are needed in consuming code.
