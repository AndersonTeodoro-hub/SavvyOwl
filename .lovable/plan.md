

## Remove Model Name from Cost Badge

In `src/pages/Chat.tsx`, the assistant message metadata badge currently shows `{model_name} • €{cost}`. Change it to show only the cost.

**File**: `src/pages/Chat.tsx`

Find the badge rendering block:
```tsx
<span className="bg-secondary px-2 py-0.5 rounded-full">
  {msg.model_used?.split("/").pop()} • €{(msg.cost_eur || 0).toFixed(4)}
</span>
```

Replace with:
```tsx
<span className="bg-secondary px-2 py-0.5 rounded-full">
  €{(msg.cost_eur || 0).toFixed(4)}
</span>
```

One line change, no other files affected.

