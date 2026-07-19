import * as React from "react"

export const WindowContext = React.createContext<{
  isInWindow: boolean
  windowElement: HTMLElement | null
  id?: string
}>({
  isInWindow: false,
  windowElement: null,
})

export function WindowProvider({
  windowElement,
  id,
  children,
}: {
  windowElement: HTMLElement | null
  id?: string
  children: React.ReactNode
}) {
  const value = React.useMemo(
    () => ({
      isInWindow: !!windowElement,
      windowElement,
      id,
    }),
    [windowElement, id]
  )

  return (
    <WindowContext.Provider value={value}>
      {children}
    </WindowContext.Provider>
  )
}
