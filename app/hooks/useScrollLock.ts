import { useEffect } from "react";

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (lock) {
      // Save initial body style
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Prevent scrolling on mount
      document.body.style.overflow = "hidden";
      // Re-enable scrolling on cleanup
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [lock]); // Only re-run effect if lock changes
}
