// TEST FILE - Delete after verification
// This file tests if the scroll hook is working

import { useScrollPosition } from "./hooks/useScrollPosition";

export function ScrollTest() {
  const { isScrolled, scrollPosition } = useScrollPosition();
  
  return (
    <div style={{
      position: 'fixed',
      top: 100,
      right: 20,
      padding: '10px',
      background: 'red',
      color: 'white',
      zIndex: 9999
    }}>
      <div>Scroll Position: {scrollPosition}px</div>
      <div>Is Scrolled: {isScrolled ? 'YES' : 'NO'}</div>
    </div>
  );
}

// Add <ScrollTest /> to your OpsDashboard.tsx temporarily to debug
