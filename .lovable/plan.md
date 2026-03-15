

## Redesign: Chat Layout (Claude.ai style) + Delete Conversations + Projects

### Overview

Rebuild the chat page with a unified sidebar (logo + nav + projects + conversation history + user info) and a clean chat area. Add conversation deletion and a projects system for organizing conversations.

### Database Changes

1. **New `projects` table:**
```sql
CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own projects" ON projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

2. **Add `project_id` to conversations:**
```sql
ALTER TABLE conversations ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
```

3. **Add DELETE policy on messages** (needed for conversation deletion):
```sql
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
```

### Layout Architecture

```text
+------ Unified Sidebar (280px) ------+---- Chat Area ----+
| [Logo] SavvyOwl                      | [Lang] [Theme]    |
| [+ New Chat]                         |                   |
| ------------------------------------ |   Messages...     |
| Painel | Chat | Prompts | Analytics  |                   |
| Settings                             |                   |
| ------------------------------------ |                   |
| Projects: [+ New] [All | Project A]  |                   |
| ------------------------------------ |                   |
| Today                                | [Mode pills]      |
|   Conv 1          [move] [trash]     | [Input bar]       |
|   Conv 2          [move] [trash]     |                   |
| Yesterday                            |                   |
|   Conv 3                             |                   |
| ------------------------------------ |                   |
| [Avatar] User Name  Free  [Logout]   |                   |
+--------------------------------------+-------------------+
```

Mobile: sidebar hidden, hamburger button opens it as a Sheet overlay. Remove MobileBottomNav from chat route.

### File Changes

1. **`src/pages/Chat.tsx`** -- Complete rewrite:
   - Remove internal sidebar/drawer; full-screen chat area
   - Import new `ChatSidebar` component
   - Wrap in flex layout: `ChatSidebar` + chat area
   - Chat area: header (lang + theme toggles), messages, mode pills + input
   - Track `selectedProjectId` state for filtering

2. **New `src/components/ChatSidebar.tsx`**:
   - Single sidebar with: logo, "+ New Chat" button, nav links (5 items), project filter dropdown, conversation list grouped by date (Today/Yesterday/Last 7 days/Older), user footer
   - Each conversation row: title, hover actions (move to project icon, delete icon)
   - Delete: AlertDialog confirmation, calls `supabase.from("messages").delete()` then `supabase.from("conversations").delete()`
   - Move to project: small dropdown/popover with project list
   - New Project: Dialog with name input
   - On desktop: fixed 280px sidebar
   - On mobile: rendered inside a Sheet, triggered by hamburger

3. **`src/layouts/DashboardLayout.tsx`** -- No changes to overall layout (sidebar + outlet stays), but chat page will manage its own sidebar internally since chat needs conversation history in the sidebar

   Actually, better approach: On the `/dashboard/chat` route, the Chat page takes full width and renders its own unified sidebar that includes both nav AND conversation history. The DashboardLayout sidebar is hidden when on the chat route.

   Alternative simpler approach: Extend `DashboardSidebar` to show conversation history when on the chat route. But this couples the sidebar too much.

   Cleanest approach: Chat page renders full-screen with its own sidebar, bypassing DashboardLayout's sidebar. Modify DashboardLayout to hide its sidebar when on chat route, or give Chat its own route outside the dashboard layout.

   Simplest: Keep Chat inside DashboardLayout but have DashboardLayout hide its sidebar + header when the route is `/dashboard/chat`. Chat renders its own complete layout.

4. **`src/layouts/DashboardLayout.tsx`**:
   - Detect if current route is `/dashboard/chat`
   - If so: hide DashboardSidebar, header, and MobileBottomNav; render just `<Outlet />` full-screen
   - Other routes: unchanged

5. **Translation files** (all 4 locales): Add new keys for delete confirmation, projects, date groups, move to project

### New Translation Keys

```json
{
  "chat": {
    "deleteConversation": "Delete conversation",
    "deleteConfirmTitle": "Delete conversation?",
    "deleteConfirmDesc": "This will permanently delete this conversation and all its messages.",
    "projects": "Projects",
    "newProject": "New Project",
    "projectName": "Project name",
    "allConversations": "All conversations",
    "moveToProject": "Move to project",
    "noProject": "No project",
    "today": "Today",
    "yesterday": "Yesterday",
    "lastWeek": "Last 7 days",
    "older": "Older"
  }
}
```

### Implementation Details

- Conversation grouping: compare `created_at` with `startOfToday()`, `startOfYesterday()`, etc.
- Delete flow: AlertDialog from shadcn, on confirm delete messages then conversation, invalidate queries, if deleted === active conversation reset to empty
- Projects CRUD: simple dialog for create, dropdown for filter, popover for move
- Mobile: Sheet component for sidebar overlay, hamburger in chat header

