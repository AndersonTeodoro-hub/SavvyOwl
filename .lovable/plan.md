

## Fix: Hover action buttons disappearing on conversation rows

**Root cause:** The `group` / `group-hover` pattern is already correctly applied. The real issue is the action buttons have tiny click targets (`p-1` = 4px padding + 12px icon = ~20px), making it easy for the cursor to slip between the text and the icon area.

**Fix (ChatSidebar.tsx, lines 298-326):**

1. Increase action button padding from `p-1` to `p-2` (8px padding each side → 28px minimum hit area)
2. Increase icon size from `h-3 w-3` to `h-3.5 w-3.5`
3. Add `min-w-[32px] min-h-[32px]` to each action button to guarantee 32×32px click targets
4. Remove the `gap-0.5` between buttons (the padding already provides spacing)

This is a small CSS-only change in the conversation row action buttons. No structural changes needed since the `group` hover pattern is already correct.

