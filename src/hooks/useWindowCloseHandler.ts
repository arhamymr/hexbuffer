import * as React from "react";
import { useNavStore } from "@/stores/nav";
import { WindowContext } from "@/providers/window-provider";

/**
 * Hook to customize or intercept the close behavior of a workspace window.
 * If the handler returns false or a promise resolving to false, the window will not close.
 */
export function useWindowCloseHandler(handler: () => boolean | Promise<boolean>) {
  const { isInWindow, id } = React.useContext(WindowContext);
  const registerCloseHandler = useNavStore((s) => s.registerCloseHandler);
  const unregisterCloseHandler = useNavStore((s) => s.unregisterCloseHandler);

  React.useEffect(() => {
    // ponytail: skip registration if not running inside a window context
    if (!isInWindow || !id) return;

    registerCloseHandler(id, handler);
    return () => {
      unregisterCloseHandler(id);
    };
  }, [id, isInWindow, handler, registerCloseHandler, unregisterCloseHandler]);
}
