-- Open-KB project, issue, planning, page, and personal workflow RLS.

ALTER TABLE kb.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.project_deploy_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.issue_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.user_recent_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.draft_issues ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  kb.teams,
  kb.project_deploy_boards,
  kb.notifications,
  kb.user_notification_preferences,
  kb.issue_mentions,
  kb.user_favorites,
  kb.user_recent_visits,
  kb.draft_issues
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  kb.teams,
  kb.project_deploy_boards,
  kb.notifications,
  kb.user_notification_preferences,
  kb.issue_mentions,
  kb.user_favorites,
  kb.user_recent_visits,
  kb.draft_issues
TO service_role;

-- Public deploy board reads are served by the open-kb-public-deploy-board Edge
-- Function using the service role, so the anon role no longer needs any direct
-- table or view grants. Authenticated/service_role keep view access for the
-- in-app board management surfaces.
GRANT SELECT ON TABLE
  kb.public_deploy_boards,
  kb.public_deploy_board_issues
TO authenticated, service_role;

CREATE POLICY projects_insert ON kb.projects
  FOR INSERT TO authenticated
  WITH CHECK (kb.has_permission(organisation_id, 'projects.create'));

CREATE POLICY projects_update ON kb.projects
  FOR UPDATE TO authenticated
  USING (kb.has_permission(organisation_id, 'projects.edit'))
  WITH CHECK (kb.has_permission(organisation_id, 'projects.edit'));

CREATE POLICY projects_delete ON kb.projects
  FOR DELETE TO authenticated
  USING (kb.has_permission(organisation_id, 'projects.delete'));

CREATE POLICY teams_select ON kb.teams
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'projects.view'));

CREATE POLICY teams_insert ON kb.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.edit')
    AND project_id IS NULL
    AND issue_id IS NULL
  );

CREATE POLICY teams_update ON kb.teams
  FOR UPDATE TO authenticated
  USING (kb.has_permission(organisation_id, 'projects.edit'))
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.edit')
    AND project_id IS NULL
    AND issue_id IS NULL
  );

CREATE POLICY teams_delete ON kb.teams
  FOR DELETE TO authenticated
  USING (kb.has_permission(organisation_id, 'projects.edit'));

CREATE POLICY project_deploy_boards_select ON kb.project_deploy_boards
  FOR SELECT TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_deploy_boards_insert ON kb.project_deploy_boards
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY project_deploy_boards_update ON kb.project_deploy_boards
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY project_deploy_boards_delete ON kb.project_deploy_boards
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_members_insert ON kb.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.members.manage')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_members_update ON kb.project_members
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.members.manage')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.members.manage')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_members_delete ON kb.project_members
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.members.manage')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issues_insert ON kb.issues
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'issues.create')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issues_update ON kb.issues
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issues_delete ON kb.issues
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.delete')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_comments_insert ON kb.issue_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_comments_update ON kb.issue_comments
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_comments_delete ON kb.issue_comments
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.delete')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_activities_insert ON kb.issue_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_activities_update ON kb.issue_activities
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_activities_delete ON kb.issue_activities
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.delete')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY notifications_select ON kb.notifications
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY notifications_insert ON kb.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.view')
    AND (
      project_id IS NULL
      OR kb.has_project_access(project_id)
    )
  );

CREATE POLICY notifications_update ON kb.notifications
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY notifications_delete ON kb.notifications
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_notification_preferences_select ON kb.user_notification_preferences
  FOR SELECT TO authenticated
  USING (
    kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_notification_preferences_insert ON kb.user_notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_notification_preferences_update ON kb.user_notification_preferences
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_notification_preferences_delete ON kb.user_notification_preferences
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY issue_attachments_insert ON kb.issue_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_attachments_update ON kb.issue_attachments
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_attachments_delete ON kb.issue_attachments
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.delete')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_subscribers_insert ON kb.issue_subscribers
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_subscribers_update ON kb.issue_subscribers
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_subscribers_delete ON kb.issue_subscribers
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_votes_insert ON kb.issue_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_votes_update ON kb.issue_votes
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_votes_delete ON kb.issue_votes
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_mentions_select ON kb.issue_mentions
  FOR SELECT TO authenticated
  USING (
    issue_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_mentions_insert ON kb.issue_mentions
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
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

CREATE POLICY issue_mentions_update ON kb.issue_mentions
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_mentions_delete ON kb.issue_mentions
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_reactions_insert ON kb.issue_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND profile_id = auth.uid()
    AND name IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_reactions_update ON kb.issue_reactions
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_reactions_delete ON kb.issue_reactions
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY comment_reactions_insert ON kb.comment_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND comment_id IS NOT NULL
    AND profile_id = auth.uid()
    AND name IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY comment_reactions_update ON kb.comment_reactions
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY comment_reactions_delete ON kb.comment_reactions
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY user_favorites_select ON kb.user_favorites
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_favorites_insert ON kb.user_favorites
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
    AND (
      (
        name = 'project'
        AND project_id IS NOT NULL
        AND issue_id IS NULL
        AND kb.has_project_access(project_id)
      )
      OR (
        name = 'issue'
        AND project_id IS NOT NULL
        AND issue_id IS NOT NULL
        AND kb.has_permission(organisation_id, 'issues.view')
        AND kb.has_project_access(project_id)
      )
    )
  );

CREATE POLICY user_favorites_update ON kb.user_favorites
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_favorites_delete ON kb.user_favorites
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_recent_visits_select ON kb.user_recent_visits
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_recent_visits_insert ON kb.user_recent_visits
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
    AND (
      (
        name = 'project'
        AND project_id IS NOT NULL
        AND issue_id IS NULL
        AND kb.has_project_access(project_id)
      )
      OR (
        name = 'issue'
        AND project_id IS NOT NULL
        AND issue_id IS NOT NULL
        AND kb.has_permission(organisation_id, 'issues.view')
        AND kb.has_project_access(project_id)
      )
    )
  );

CREATE POLICY user_recent_visits_update ON kb.user_recent_visits
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY user_recent_visits_delete ON kb.user_recent_visits
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND kb.has_app_seat(organisation_id)
  );

CREATE POLICY draft_issues_select ON kb.draft_issues
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    AND project_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY draft_issues_insert ON kb.draft_issues
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND issue_id IS NULL
    AND project_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.create')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY draft_issues_update ON kb.draft_issues
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND project_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.create')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND issue_id IS NULL
    AND project_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.create')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY draft_issues_delete ON kb.draft_issues
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    AND project_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.create')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_blockers_insert ON kb.issue_blockers
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND blocker_issue_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_blockers_update ON kb.issue_blockers
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_blockers_delete ON kb.issue_blockers
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.delete')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_relations_insert ON kb.issue_relations
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND related_issue_id IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_relations_update ON kb.issue_relations
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_relations_delete ON kb.issue_relations
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.delete')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_links_insert ON kb.issue_links
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_id IS NOT NULL
    AND url IS NOT NULL
    AND kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_links_update ON kb.issue_links
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'issues.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY issue_links_delete ON kb.issue_links
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'issues.delete')
    AND kb.has_project_access(project_id)
  );
