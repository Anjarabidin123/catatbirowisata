import { useState, useRef, useCallback } from "react";

export interface TouchReorderOptions<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  longPressMs?: number;
}

export function useTouchReorder<T>({
  items,
  onReorder,
  longPressMs = 220,
}: TouchReorderOptions<T>) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const activeIndexRef = useRef<number | null>(null);
  const itemsRef = useRef<T[]>(items);
  itemsRef.current = items;

  // Swap item positions in array
  const moveItem = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
      if (fromIdx >= itemsRef.current.length || toIdx >= itemsRef.current.length) return;

      const updated = [...itemsRef.current];
      const [movedItem] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, movedItem);
      onReorder(updated);
    },
    [onReorder]
  );

  // Quick 1-tap Move Up
  const moveUp = useCallback(
    (index: number) => {
      if (index > 0) {
        moveItem(index, index - 1);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(20);
        }
      }
    },
    [moveItem]
  );

  // Quick 1-tap Move Down
  const moveDown = useCallback(
    (index: number) => {
      if (index < itemsRef.current.length - 1) {
        moveItem(index, index + 1);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(20);
        }
      }
    },
    [moveItem]
  );

  // Touch Events for Mobile (Long-Press + Drag)
  const handleTouchStart = useCallback(
    (index: number, e: React.TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button:not([data-reorder-handle]), input, textarea, select")) {
        return;
      }

      const touch = e.touches[0];
      touchStartY.current = touch.clientY;
      touchStartX.current = touch.clientX;
      isDraggingRef.current = false;
      activeIndexRef.current = index;

      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }

      longPressTimer.current = setTimeout(() => {
        isDraggingRef.current = true;
        setDraggingIndex(index);
        setDragOverIndex(index);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50); // Haptic feedback indicating pick-up
        }
      }, longPressMs);
    },
    [longPressMs]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const deltaY = Math.abs(touch.clientY - touchStartY.current);
      const deltaX = Math.abs(touch.clientX - touchStartX.current);

      // If user moved finger before long-press timeout, cancel (they are scrolling the page)
      if (!isDraggingRef.current) {
        if (deltaY > 10 || deltaX > 10) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        return;
      }

      // If actively dragging, prevent scroll and detect item under finger
      if (e.cancelable) {
        e.preventDefault();
      }

      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = element?.closest("[data-reorder-idx]");
      if (row) {
        const targetIdxStr = row.getAttribute("data-reorder-idx");
        if (targetIdxStr !== null) {
          const targetIdx = parseInt(targetIdxStr, 10);
          const currentIdx = activeIndexRef.current;
          if (
            !isNaN(targetIdx) &&
            currentIdx !== null &&
            targetIdx !== currentIdx &&
            targetIdx >= 0 &&
            targetIdx < itemsRef.current.length
          ) {
            moveItem(currentIdx, targetIdx);
            activeIndexRef.current = targetIdx;
            setDraggingIndex(targetIdx);
            setDragOverIndex(targetIdx);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(25);
            }
          }
        }
      }
    },
    [moveItem]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isDraggingRef.current = false;
    activeIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  }, []);

  // HTML5 Drag Events for Desktop Mouse
  const handleDragStart = useCallback(
    (index: number, e: React.DragEvent) => {
      setDraggingIndex(index);
      setDragOverIndex(index);
      activeIndexRef.current = index;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index.toString());
    },
    []
  );

  const handleDragOver = useCallback(
    (index: number, e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const currentIdx = activeIndexRef.current;
      if (currentIdx !== null && currentIdx !== index) {
        moveItem(currentIdx, index);
        activeIndexRef.current = index;
        setDraggingIndex(index);
        setDragOverIndex(index);
      }
    },
    [moveItem]
  );

  const handleDragEnd = useCallback(() => {
    activeIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  }, []);

  return {
    draggingIndex,
    dragOverIndex,
    moveItem,
    moveUp,
    moveDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
