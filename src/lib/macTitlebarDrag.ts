import { getCurrentWindow } from "@tauri-apps/api/window";

import { IS_MAC } from "./platform";

// Mirrors the element-matching rules in Tauri's built-in drag.js so we only
// take over events that it would itself have treated as drag-region clicks.
const DRAG_REGION_ATTR = "data-tauri-drag-region";
const CLICKABLE_TAGS = new Set([
  "A",
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "LABEL",
  "SUMMARY",
]);
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "menuitem",
  "tab",
  "checkbox",
  "radio",
  "switch",
  "option",
]);

// Pixels the pointer must travel before a press becomes a drag.
const DRAG_THRESHOLD = 4;

function isClickableElement(el: HTMLElement): boolean {
  return (
    CLICKABLE_TAGS.has(el.tagName) ||
    (el.hasAttribute("contenteditable") &&
      el.getAttribute("contenteditable") !== "false") ||
    (el.hasAttribute("tabindex") && el.getAttribute("tabindex") !== "-1") ||
    INTERACTIVE_ROLES.has(el.getAttribute("role") ?? "")
  );
}

function isDragRegion(path: EventTarget[]): boolean {
  for (const el of path) {
    if (!(el instanceof HTMLElement)) continue;
    const attr = el.getAttribute(DRAG_REGION_ATTR);
    // clickable without explicit drag region → blocks drag
    if (isClickableElement(el) && attr === null) return false;
    if (attr === null) continue;
    if (attr === "false") return false;
    if (attr === "deep") return true;
    if (attr === "" || attr === "true") return el === path[0];
  }
  return false;
}

/**
 * Replaces Tauri's built-in `data-tauri-drag-region` handling on macOS.
 *
 * Tauri's drag.js starts a native window drag on the *first* mousedown —
 * including the first click of a double-click. On a multi-monitor setup tao's
 * `performWindowDragWithEvent` (driven by a global-screen mouse location)
 * teleports the window to a wrong position before the double-click maximize
 * fires, so double-clicking the title bar jumps the window instead of
 * maximizing it. See tauri-apps/tauri#7890 and #6287.
 *
 * We intercept drag-region mousedowns in the capture phase (before Tauri's
 * bubble-phase listener) and:
 *   - double-click → toggleMaximize() (native zoom, stays on the current
 *     monitor)
 *   - single click → startDragging() only once the pointer moves past a small
 *     threshold, so a stationary click (incl. the first click of a
 *     double-click) never kicks off the native drag.
 *
 * No-op off macOS, where the custom titlebar keeps using Tauri's drag.js.
 */
export function installMacTitlebarDrag(): void {
  if (!IS_MAC) return;

  document.addEventListener(
    "mousedown",
    (e) => {
      if (e.button !== 0) return;
      if (!isDragRegion(e.composedPath())) return;

      // Take over from Tauri's drag.js: stop its bubble-phase listener.
      e.stopImmediatePropagation();
      e.preventDefault();

      if (e.detail >= 2) {
        void getCurrentWindow().toggleMaximize();
        return;
      }

      const startX = e.clientX;
      const startY = e.clientY;
      const onMove = (ev: MouseEvent) => {
        if (
          Math.abs(ev.clientX - startX) <= DRAG_THRESHOLD &&
          Math.abs(ev.clientY - startY) <= DRAG_THRESHOLD
        ) {
          return;
        }
        cleanup();
        void getCurrentWindow().startDragging();
      };
      const cleanup = () => {
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("mouseup", cleanup, true);
      };
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("mouseup", cleanup, true);
    },
    true, // capture: run before Tauri's bubble-phase drag.js listener
  );
}
