import { useInterceptStore } from '../../state/intercept-store';

export function useRequestPanel() {
  const status = useInterceptStore((state) => state.status);
  const rawRequest = useInterceptStore((state) => state.rawRequest);
  const selectedRequestId = useInterceptStore((state) => state.selectedRequestId);
  const selectedDirection = useInterceptStore((state) => state.selectedDirection);
  const setRawRequest = useInterceptStore((state) => state.setRawRequest);
  const toggleIntercept = useInterceptStore((state) => state.toggleIntercept);

  const isEnabled = status?.mode === 'Enabled';
  const messageLabel = selectedDirection === 'response' ? 'Response' : 'Request';

  const handleRawChange = (value: string | undefined) => {
    setRawRequest(value ?? '');
  };

  const handleToggleIntercept = (enabled: boolean) => {
    void toggleIntercept(enabled);
  };

  return {
    isEnabled,
    rawRequest,
    selectedRequestId,
    messageLabel,
    handleRawChange,
    handleToggleIntercept,
  };
}
