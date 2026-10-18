import { useEffect, useState } from "react";

/** Re-renders the caller every `interval` ms. Use only in components that show live time. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}
