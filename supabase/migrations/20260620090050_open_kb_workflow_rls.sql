-- Open-KB project, issue, planning, page, and personal workflow RLS.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  open_kb.teams,
  open_kb.project_deploy_boards,
  open_kb.notifications,
  open_kb.user_notification_preferences,
  open_kb.issue_mentions,
  open_kb.user_favorites,
  open_kb.user_recent_visits,
  open_kb.stickies,
  open_kb.draft_issues
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  open_kb.teams,
  open_kb.project_deploy_boards,
  open_kb.notifications,
  open_kb.user_notification_preferences,
  open_kb.issue_mentions,
  open_kb.user_favorites,
  open_kb.user_recent_visits,
  open_kb.stickies,
  open_kb.draft_issues
TO service_role;

CREATE POLICY projects_insert ON open_kb.projects
  FOR INSERT TO authenticated
  WITH CHECK (open_kb.has_permission(organisation_id, 'projects.create'));

CREATE POLICY projects_update ON open_kb.projects
  FOR UPDATE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'projects.edit'))
  WITH CHECK (open_kb.has_permission(organisation_id, 'projects.edit'));

CREATE POLICY projects_delete ON open_kb.projects
  FOR DELETE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'projects.delete'));

CREATE POLICY teams_select ON open_kb.teams
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'projects.view'));

CREATE POLICY teams_insert ON open_kb.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND page_id IS NULL
  );

CREATE POLICY teams_update ON open_kb.teams
  FOR UPDATE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'projects.edit'))
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND page_id IS NULL
  );

CREATE POLICY teams_delete ON open_kb.teams
  FOR DELETE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'projects.edit'));

CREATE POLICY project_deploy_boards_select ON open_kb.project_deploy_boards
  FOR SELECT TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_deploy_boards_insert ON open_kb.project_deploy_boards
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
    AND page_id IS NULL
  );

CREATE POLICY project_deploy_boards_update ON open_kb.project_deploy_boards
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
    AND page_id IS NULL
  );

CREATE POLICY project_deploy_boards_delete ON open_kb.project_deploy_boards
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_members_insert ON open_kb.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.members.manage')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_members_update ON open_kb.project_members
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.members.manage')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.members.manage')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_members_delete ON open_kb.project_members
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.members.manage')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issues_insert ON open_kb.issues
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'issues.create')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issues_update ON open_kb.issues
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issues_delete ON open_kb.issues
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.delete')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_comments_insert ON open_kb.issue_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_comments_update ON open_kb.issue_comments
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_comments_delete ON open_kb.issue_comments
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.delete')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_activities_insert ON open_kb.issue_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_activities_update ON open_kb.issue_activities
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_activities_delete ON open_kb.issue_activities
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.delete')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY notifications_select ON open_kb.notifications
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY notifications_insert ON open_kb.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND (
      project_id IS NULL
      OR open_kb.has_project_access(project_id)
    )
  );

CREATE POLICY notifications_update ON open_kb.notifications
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY notifications_delete ON open_kb.notifications
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_notification_preferences_select ON open_kb.user_notification_preferences
  FOR SELECT TO authenticated
  USING (
    open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_notification_preferences_insert ON open_kb.user_notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_notification_preferences_update ON open_kb.user_notification_preferences
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_notification_preferences_delete ON open_kb.user_notification_preferences
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY issue_attachments_insert ON open_kb.issue_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_attachments_update ON open_kb.issue_attachments
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_attachments_delete ON open_kb.issue_attachments
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.delete')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_subscribers_insert ON open_kb.issue_subscribers
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_subscribers_update ON open_kb.issue_subscribers
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_subscribers_delete ON open_kb.issue_subscribers
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_votes_insert ON open_kb.issue_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_votes_update ON open_kb.issue_votes
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_votes_delete ON open_kb.issue_votes
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_mentions_select ON open_kb.issue_mentions
  FOR SELECT TO authenticated
  USING (
    issue_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_mentions_insert ON open_kb.issue_mentions
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
    AND EXISTS (
      SELECT 1
      FROM public.organisation_members om
      JOIN public.organisation_member_app_seats mas
        ON mas.org_member_id = om.id
       AND mas.app_code = 'open-kb'
      WHERE om.org_id = issue_mentions.organisation_id
        AND om.user_id = issue_mentions.profile_id
    )
  );

CREATE POLICY issue_mentions_update ON open_kb.issue_mentions
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_mentions_delete ON open_kb.issue_mentions
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_reactions_insert ON open_kb.issue_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id = auth.uid()
    AND name IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_reactions_update ON open_kb.issue_reactions
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_reactions_delete ON open_kb.issue_reactions
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY comment_reactions_insert ON open_kb.comment_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND comment_id IS NOT NULL
    AND profile_id = auth.uid()
    AND name IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY comment_reactions_update ON open_kb.comment_reactions
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY comment_reactions_delete ON open_kb.comment_reactions
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY user_favorites_select ON open_kb.user_favorites
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_favorites_insert ON open_kb.user_favorites
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
    AND (
      (
        name = 'project'
        AND project_id IS NOT NULL
        AND issue_id IS NULL
        AND page_id IS NULL
        AND open_kb.has_project_access(project_id)
      )
      OR (
        name = 'issue'
        AND project_id IS NOT NULL
        AND issue_id IS NOT NULL
        AND page_id IS NULL
        AND open_kb.has_permission(organisation_id, 'issues.view')
        AND open_kb.has_project_access(project_id)
      )
      OR (
        name = 'page'
        AND issue_id IS NULL
        AND page_id IS NOT NULL
        AND open_kb.has_permission(organisation_id, 'pages.view')
        AND (
          project_id IS NULL
          OR open_kb.has_project_access(project_id)
        )
      )
    )
  );

CREATE POLICY user_favorites_update ON open_kb.user_favorites
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_favorites_delete ON open_kb.user_favorites
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_recent_visits_select ON open_kb.user_recent_visits
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_recent_visits_insert ON open_kb.user_recent_visits
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
    AND (
      (
        name = 'project'
        AND project_id IS NOT NULL
        AND issue_id IS NULL
        AND page_id IS NULL
        AND open_kb.has_project_access(project_id)
      )
      OR (
        name = 'issue'
        AND project_id IS NOT NULL
        AND issue_id IS NOT NULL
        AND page_id IS NULL
        AND open_kb.has_permission(organisation_id, 'issues.view')
        AND open_kb.has_project_access(project_id)
      )
      OR (
        name = 'page'
        AND issue_id IS NULL
        AND page_id IS NOT NULL
        AND open_kb.has_permission(organisation_id, 'pages.view')
        AND (
          project_id IS NULL
          OR open_kb.has_project_access(project_id)
        )
      )
    )
  );

CREATE POLICY user_recent_visits_update ON open_kb.user_recent_visits
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_recent_visits_delete ON open_kb.user_recent_visits
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY stickies_select ON open_kb.stickies
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
  );

CREATE POLICY stickies_insert ON open_kb.stickies
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND issue_id IS NULL
    AND page_id IS NULL
    AND open_kb.has_permission(organisation_id, 'pages.manage')
    AND (
      project_id IS NULL
      OR open_kb.has_project_access(project_id)
    )
  );

CREATE POLICY stickies_update ON open_kb.stickies
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'pages.manage')
    AND (
      project_id IS NULL
      OR open_kb.has_project_access(project_id)
    )
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND issue_id IS NULL
    AND page_id IS NULL
    AND open_kb.has_permission(organisation_id, 'pages.manage')
    AND (
      project_id IS NULL
      OR open_kb.has_project_access(project_id)
    )
  );

CREATE POLICY stickies_delete ON open_kb.stickies
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'pages.manage')
    AND (
      project_id IS NULL
      OR open_kb.has_project_access(project_id)
    )
  );

CREATE POLICY draft_issues_select ON open_kb.draft_issues
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND project_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY draft_issues_insert ON open_kb.draft_issues
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND issue_id IS NULL
    AND page_id IS NULL
    AND project_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.create')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY draft_issues_update ON open_kb.draft_issues
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND project_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.create')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND issue_id IS NULL
    AND page_id IS NULL
    AND project_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.create')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY draft_issues_delete ON open_kb.draft_issues
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND project_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.create')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_blockers_insert ON open_kb.issue_blockers
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND blocker_issue_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_blockers_update ON open_kb.issue_blockers
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_blockers_delete ON open_kb.issue_blockers
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.delete')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_relations_insert ON open_kb.issue_relations
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND related_issue_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_relations_update ON open_kb.issue_relations
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_relations_delete ON open_kb.issue_relations
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.delete')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_links_insert ON open_kb.issue_links
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND url IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_links_update ON open_kb.issue_links
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'issues.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY issue_links_delete ON open_kb.issue_links
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'issues.delete')
    AND open_kb.has_project_access(project_id)
  );
