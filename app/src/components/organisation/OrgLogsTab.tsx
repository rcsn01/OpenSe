import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExecutionLogs } from '../../hooks/queries/useActivities';
import { ActivityLogTable } from '../shared/ActivityLogTable';
import { OrgSimple } from '../../types/organisation';

type OutletContextType = { currentOrg: OrgSimple | null };

export const OrgLogsTab = () => {
  const { user } = useAuth();
  const context = useOutletContext<OutletContextType>();
  const orgId = context?.currentOrg?.id ?? null;

  const { data: logs = [], isLoading } = useExecutionLogs(user?.id, orgId);

  return (
    <ActivityLogTable
      logs={logs as any}
      loading={isLoading}
      emptyMessage={`No activities recorded for ${context?.currentOrg?.name ?? 'this organisation'}.`}
    />
  );
};
