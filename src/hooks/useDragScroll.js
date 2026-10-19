import { useEffect, useRef } from "react";

/**
 * Lets a horizontal strip be dragged sideways with the mouse (touch already scrolls natively)
 * and scrolled with a normal mouse wheel. A drag does not count as a click on the item under it.
 */
export function useDragScroll() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let startX = 0;
    let startScroll = 0;
    let pointerId = null;
    let moved = false;

    const down = (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      moved = false;
    };
    const move = (e) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) { moved = true; el.setPointerCapture(pointerId); el.classList.add("dragging"); }
      el.scrollLeft = startScroll - dx;
    };
    const up = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      el.classList.remove("dragging");
    };
    // Swallow the click that ends a drag so it doesn't select a category.
    const click = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    const wheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
    };
  }, []);

  return ref;
}
