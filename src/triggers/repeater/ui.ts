/**
 * @deprecated The old Repeater mode (raw HTTP tabs) has been replaced by workspace tabs.
 * Use the Forge panel's send functionality within a workspace instead.
 */
export async function sendRequest(): Promise<void> {
  // No-op: the Forge panel within each workspace tab handles sending requests.
  // The old flow of sending from raw HTTP tabs is no longer applicable.
}
