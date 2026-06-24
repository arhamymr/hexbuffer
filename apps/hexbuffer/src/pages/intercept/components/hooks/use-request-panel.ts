import { useInterceptStore } from '../../state/intercept-store';

export function useRequestPanel() {
  const rawRequest = useInterceptStore((state) => state.rawRequest);
  const selectedRequestId = useInterceptStore((state) => state.selectedRequestId);
  const selectedDirection = useInterceptStore((state) => state.selectedDirection);
  const setRawRequest = useInterceptStore((state) => state.setRawRequest);

  const messageLabel = selectedDirection === 'response' ? 'Response' : 'Request';

  const handleRawChange = (value: string | undefined) => {
    setRawRequest(value ?? '');
  };

  return {
    rawRequest,
    selectedRequestId,
    messageLabel,
    handleRawChange,
  };
}
