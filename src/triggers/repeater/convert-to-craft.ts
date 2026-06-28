/**
 * @deprecated The old Repeater mode (raw HTTP tabs) has been replaced by workspace tabs.
 * Use the Forge panel within a workspace tab directly.
 */
export function convertRepeaterToCraft(): void {
  // No-op: workspace tabs render the Forge panel directly.
  // The old flow of converting a raw HTTP tab to structured fields is no longer needed.
}

/**
 * @deprecated The old Repeater mode (raw HTTP tabs) has been replaced by workspace tabs.
 * Use the Forge panel to send requests directly within a workspace.
 */
export function convertCraftToRepeater(): void {
  // No-op: the Forge panel handles both structured and raw views within a workspace.
  // The old flow of creating a new raw HTTP tab from structured fields is no longer needed.
}
