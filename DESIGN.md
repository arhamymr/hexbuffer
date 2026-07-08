---
name: hexbuffer
description: A high-performance, dark-mode-first cyber assessment workbench
colors:
  primary: "#00c950"
  primary-dark: "#00c96b"
  neutral-bg: "#ffffff"
  neutral-bg-dark: "#151515"
  border: "#ebebeb"
  border-dark: "#262626"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "1.5"
  mono:
    fontFamily: "Geist Mono, monospace"
    fontSize: "12px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
---

# Design

## Overview
hexbuffer is a tactical, expert-centric interface with dark-mode-first styling designed for security analysts. It values high information density, structural precision via borders instead of drop-shadows, and calm neutral colors accented by a high-contrast cyber green.

## Colors
- **Primary**: Cyber Green (`#00c950` / `#00c96b`). Used selectively for main trigger actions, success states, and critical focus highlights.
- **Secondary**: Neutral tints for active lists and secondary controls.
- **Destructive**: Deep crimson/rose (`#d62828` / `#e63946`) for stop actions, attack abort, and error indications.
- **Borders & GridLines**: Low-opacity neutrals (`oklch(1 0 0 / 10%)` in dark mode) to divide sections clearly without visual noise.

## Typography
- **Sans-Serif Font**: Geist. Used for UI controls, navigation tabs, and system statuses.
- **Monospace Font**: Geist Mono. Used for all HTTP traffic logs, requests/responses, payload inputs, and scripting views.
- **Hierarchy**: Compact sizing. Most UI text ranges between 11px and 14px to maximize data visibility.

## Elevation
- **Flat Layouts**: This application does not use drop-shadows on interactive cards or sections. Structure is defined cleanly by 1px borders.
- **Z-Index Scale**:
  - Base: 0
  - Sticky Headers: 10
  - Sliders/Splitters: 20
  - Dropdowns & Popovers: 30
  - Dialog overlays: 40

## Components
- **Buttons**:
  - `primary`: Background cyber-green, text dark neutral, radius 6px, padding `h-7 px-3 text-xs`.
  - `destructive`: Background crimson, text white, radius 6px.
  - `outline`: Border `1px solid border`, background transparent.
- **Tables**:
  - Dense text, monospace values, sticky header, row height `28px-32px`, hover background `bg-muted/50`.

## Do's and Don'ts
- **DO** use resizable pane splits (`ResizablePanelGroup`) for detail views so users can inspect content inline.
- **DO** keep margins and paddings tight (`p-2`, `p-3`) to support analytical density.
- **DON'T** use side-stripe colored borders on lists or callouts.
- **DON'T** use gradient text or glassmorphic blur filters on primary workspaces.
- **DON'T** introduce heavy drop-shadows combined with borders (no ghost-cards).
