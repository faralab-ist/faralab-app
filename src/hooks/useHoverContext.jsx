import React, { createContext, useContext } from 'react'

const HoverContext = createContext(null)

export function HoverProvider({ children, setHoveredId }) {
  return (
    <HoverContext.Provider value={setHoveredId}>
      {children}
    </HoverContext.Provider>
  )
}

export function useSetHoveredId() {
  return useContext(HoverContext)
}
