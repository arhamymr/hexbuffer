import * as React from "react"

export const WindowContext = React.createContext<{
  isInWindow: boolean
  windowElement: HTMLElement | null
}>({
  isInWindow: false,
  windowElement: null,
})

export function WindowProvider({
  windowElement,
  children,
}: {
  windowElement: HTMLElement | null
  children: React.ReactNode
}) {
  const value = React.useMemo(
    () => ({
      isInWindow: !!windowElement,
      windowElement,
    }),
    [windowElement]
  )

  return (
    <WindowContext.Provider value={value}>
      {children}
    </WindowContext.Provider>
  )
}
