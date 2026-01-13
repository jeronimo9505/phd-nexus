-- Enable Open Mode RLS: Group Members have FULL ACCESS to their group's data.

-- 1. Helper function to check group membership (simplest version)
CREATE OR REPLACE FUNCTION auth_is_group_member(group_id uuid) RETURNS boolean AS $$
SELECT EXISTS (
  SELECT 1 FROM public.group_members
  WHERE group_id = $1
  AND user_id = auth.uid()
  AND status = 'active'
);
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Apply to Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reports Open Mode" ON public.reports;
CREATE POLICY "Reports Open Mode" ON public.reports
FOR ALL USING (auth_is_group_member(group_id));

-- 3. Apply to Report Sections
ALTER TABLE public.report_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sections Open Mode" ON public.report_sections;
CREATE POLICY "Sections Open Mode" ON public.report_sections
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_sections.report_id AND auth_is_group_member(r.group_id))
);

-- 4. Apply to Report Task Links
ALTER TABLE public.report_task_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Task Links Open Mode" ON public.report_task_links;
CREATE POLICY "Task Links Open Mode" ON public.report_task_links
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_task_links.report_id AND auth_is_group_member(r.group_id))
);

-- 5. Apply to Report Knowledge Links
ALTER TABLE public.report_knowledge_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Knowledge Links Open Mode" ON public.report_knowledge_links;
CREATE POLICY "Knowledge Links Open Mode" ON public.report_knowledge_links
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_knowledge_links.report_id AND auth_is_group_member(r.group_id))
);

-- 6. Apply to Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasks Open Mode" ON public.tasks;
CREATE POLICY "Tasks Open Mode" ON public.tasks
FOR ALL USING (auth_is_group_member(group_id));

-- 6b. Apply to Task Assignees (Fix for creation failure)
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Task Assignees Open Mode" ON public.task_assignees;
CREATE POLICY "Task Assignees Open Mode" ON public.task_assignees
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignees.task_id AND auth_is_group_member(t.group_id))
);

-- 6c. Apply to Task Comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Task Comments Open Mode" ON public.task_comments;
CREATE POLICY "Task Comments Open Mode" ON public.task_comments
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id AND auth_is_group_member(t.group_id))
);

-- 7. Apply to Knowledge Items
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Knowledge Open Mode" ON public.knowledge_items;
CREATE POLICY "Knowledge Open Mode" ON public.knowledge_items
FOR ALL USING (auth_is_group_member(group_id));

-- 8. Apply to Group Members (Read is vital)
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members Open Mode" ON public.group_members;
CREATE POLICY "Members Open Mode" ON public.group_members
FOR ALL USING (
    group_id IN (
        SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- 9. Refresh Schema Cache (Notify PostgREST)
NOTIFY pgrst, 'reload config';
