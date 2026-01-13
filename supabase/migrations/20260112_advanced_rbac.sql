-- ==============================================================================
-- MIGRATION: ADVANCED RBAC & RLS (Next.js Migration)
-- DATE: 2026-01-12
-- DESCRIPTION: Implements Monday.com-style granular permissions + Group isolation.
-- ==============================================================================

-- 1. CLEANUP (Be careful running this in production, verified for migration)
-- Drop policies to avoid conflicts before recreating
DROP POLICY IF EXISTS "Reports Open Mode" ON public.reports;
DROP POLICY IF EXISTS "Sections Open Mode" ON public.report_sections;
DROP POLICY IF EXISTS "Tasks Open Mode" ON public.tasks;
DROP POLICY IF EXISTS "Knowledge Open Mode" ON public.knowledge_items;

-- 2. RBAC SCHEMA DEFINITION

-- A. Roles Table (Owner, Admin, Member, Viewer)
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE CHECK (char_length(name) > 2),
    description text,
    created_at timestamptz DEFAULT now()
);

-- B. Permissions Table (Granular actions: 'tasks.create', 'reports.view_all')
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE CHECK (char_length(code) > 3), -- e.g. 'tasks.delete'
    description text,
    module text NOT NULL, -- 'tasks', 'settings', 'admin', etc.
    created_at timestamptz DEFAULT now()
);

-- C. Role <-> Permissions (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- D. Link User to Role (Scoped by Group/Workspace if needed, or Global)
-- We'll attach the role to the existing 'group_members' table for workspace-level RBAC.
-- If you want global system roles, use a separate 'user_system_roles' table.
-- user_system_roles -> for "Super Admin" of the platform.
-- group_members.role_id -> for "Member/Admin" within a workspace.

-- Adding role_id to group_members
ALTER TABLE public.group_members 
ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;

-- 3. SEEDING DEFAULT DATA (Idempotent)

-- Roles
INSERT INTO public.roles (name, description) VALUES
('owner', 'Full access to workspace billing and destruction'),
('admin', 'Manages users, settings, and sees all reports'),
('member', 'Standard access: create tasks, edit own items'),
('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Permissions
INSERT INTO public.permissions (code, module, description) VALUES
('system.manage', 'system', 'Full system control'),
('settings.company', 'settings', 'Manage company settings'),
('users.manage', 'admin', 'Invite and remove users'),
('reports.read_all', 'reports', 'View reports from all members'),
('reports.create', 'reports', 'Create new reports'),
('tasks.create', 'tasks', 'Create new tasks'),
('tasks.edit_all', 'tasks', 'Edit any task'),
('tasks.edit_own', 'tasks', 'Edit only own tasks'),
('tasks.delete', 'tasks', 'Delete tasks'),
('knowledge.write', 'knowledge', 'Create/Edit knowledge articles'),
('knowledge.read', 'knowledge', 'Read knowledge base')
ON CONFLICT (code) DO NOTHING;

-- Map Roles to Permissions (Helper CTEs for readability)
WITH 
  r_owner AS (SELECT id FROM public.roles WHERE name = 'owner'),
  r_admin AS (SELECT id FROM public.roles WHERE name = 'admin'),
  r_member AS (SELECT id FROM public.roles WHERE name = 'member'),
  r_viewer AS (SELECT id FROM public.roles WHERE name = 'viewer'),
  
  -- Permissions
  p_sys AS (SELECT id FROM public.permissions WHERE code = 'system.manage'),
  p_set AS (SELECT id FROM public.permissions WHERE code = 'settings.company'),
  p_usr AS (SELECT id FROM public.permissions WHERE code = 'users.manage'),
  p_rep_all AS (SELECT id FROM public.permissions WHERE code = 'reports.read_all'),
  p_rep_create AS (SELECT id FROM public.permissions WHERE code = 'reports.create'),
  p_tsk_create AS (SELECT id FROM public.permissions WHERE code = 'tasks.create'),
  p_tsk_edit_all AS (SELECT id FROM public.permissions WHERE code = 'tasks.edit_all'),
  p_tsk_edit_own AS (SELECT id FROM public.permissions WHERE code = 'tasks.edit_own'),
  p_tsk_del AS (SELECT id FROM public.permissions WHERE code = 'tasks.delete'),
  p_knw_w AS (SELECT id FROM public.permissions WHERE code = 'knowledge.write'),
  p_knw_r AS (SELECT id FROM public.permissions WHERE code = 'knowledge.read')

-- Insert Mappings
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM r_owner r, p_sys p UNION ALL
SELECT r.id, p.id FROM r_owner r, p_set p UNION ALL
SELECT r.id, p.id FROM r_owner r, p_usr p UNION ALL

SELECT r.id, p.id FROM r_admin r, p_set p UNION ALL
SELECT r.id, p.id FROM r_admin r, p_usr p UNION ALL
SELECT r.id, p.id FROM r_admin r, p_rep_all p UNION ALL
SELECT r.id, p.id FROM r_admin r, p_tsk_edit_all p UNION ALL
SELECT r.id, p.id FROM r_admin r, p_knw_w p UNION ALL

SELECT r.id, p.id FROM r_member r, p_rep_create p UNION ALL
SELECT r.id, p.id FROM r_member r, p_tsk_create p UNION ALL
SELECT r.id, p.id FROM r_member r, p_tsk_edit_own p UNION ALL
SELECT r.id, p.id FROM r_member r, p_knw_r p UNION ALL

SELECT r.id, p.id FROM r_viewer r, p_knw_r p
ON CONFLICT DO NOTHING;


-- 4. SECURITY FUNCTIONS (The Core "Brain")

-- Helper: Check if user has permission CODE within a GROUP
CREATE OR REPLACE FUNCTION public.auth_has_permission(
  target_permission_code text,
  target_group_id uuid
) RETURNS boolean AS $$
DECLARE
  has_perm boolean;
BEGIN
  -- 1. Check if user is active member of the group
  -- 2. Get their Role
  -- 3. Check if Role has the specific permission
  SELECT EXISTS (
    SELECT 1 
    FROM public.group_members gm
    JOIN public.role_permissions rp ON gm.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE gm.user_id = auth.uid()
      AND gm.group_id = target_group_id
      AND gm.status = 'active'
      AND p.code = target_permission_code
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. APPLYING STRICT RLS POLICIES

-- A. TASKS SECURITY
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: VIEW (Read)
-- Members of the group can view tasks (Basic baseline) OR refine strictly by 'tasks.read' if desired.
-- For now, allow all group members to read to facilitate collaboration.
CREATE POLICY "Tasks: View" ON public.tasks
FOR SELECT
USING (
  EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = tasks.group_id 
      AND gm.user_id = auth.uid()
      AND gm.status = 'active'
  )
);

-- Policy: CREATE
CREATE POLICY "Tasks: Create" ON public.tasks
FOR INSERT
WITH CHECK (
  auth_has_permission('tasks.create', group_id)
);

-- Policy: UPDATE (Complex: Admin vs Owner)
CREATE POLICY "Tasks: Update" ON public.tasks
FOR UPDATE
USING (
  -- Either have 'edit_all' permission OR (have 'edit_own' AND be the assignee/creator)
  auth_has_permission('tasks.edit_all', group_id)
  OR
  (
    auth_has_permission('tasks.edit_own', group_id) 
    AND 
    (assigned_to = (SELECT email FROM auth.users WHERE id = auth.uid()) OR assigned_by = (SELECT email FROM auth.users WHERE id = auth.uid())) 
    -- Note: assigned_to/by currently strings in your schema? If using UUIDs, adjust comparison.
  )
);

-- Policy: DELETE
CREATE POLICY "Tasks: Delete" ON public.tasks
FOR DELETE
USING (
  auth_has_permission('tasks.delete', group_id)
);


-- B. REPORTS SECURITY (Strict)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports: View" ON public.reports
FOR SELECT
USING (
   -- Admins see all
   auth_has_permission('reports.read_all', group_id)
   OR
   -- Creators see their own (assuming 'created_by' tracks user)
   -- Adjust 'created_by' column check based on your actual schema
   (auth_has_permission('reports.read_own', group_id) AND created_by::text = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- C. SETTINGS (Strict - Admin Only)
-- Assuming 'organization_settings' table or similar. 
-- If using a 'groups' table for settings:
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups: View" ON public.groups
FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid())
);

CREATE POLICY "Groups: Edit" ON public.groups
FOR UPDATE
USING (
    auth_has_permission('settings.company', id)
);

-- 6. NOTIFY REFRESH
NOTIFY pgrst, 'reload config';
