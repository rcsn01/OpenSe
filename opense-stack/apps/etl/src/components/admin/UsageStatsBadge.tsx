import React from 'react';
import { CheckCircle, XCircle, Activity } from 'lucide-react';

type UsageStatsBadgeProps = {
    success: number;
    failed: number;
    loading?: boolean;
};

/**
 * Compact badge displaying workflow execution success/failure counts.
 * Used in Super Admin Dashboard for both org and user tables.
 */
export const UsageStatsBadge: React.FC<UsageStatsBadgeProps> = ({
    success,
    failed,
    loading = false,
}) => {
    if (loading) {
        return (
            <div className="flex items-center gap-1 text-slate-400">
                <Activity className="w-3 h-3 animate-pulse" />
                <span className="text-xs">Loading...</span>
            </div>
        );
    }

    const total = success + failed;

    if (total === 0) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                No runs
            </span>
        );
    }

    return (
        <div className="flex items-center gap-1.5">
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                title={`${success} successful execution${success !== 1 ? 's' : ''}`}
            >
                <CheckCircle className="w-3 h-3" />
                {success}
            </span>
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100"
                title={`${failed} failed execution${failed !== 1 ? 's' : ''}`}
            >
                <XCircle className="w-3 h-3" />
                {failed}
            </span>
        </div>
    );
};

type UserUsageStatsBadgeProps = {
    personalSuccess: number;
    personalFailed: number;
    orgSuccess: number;
    orgFailed: number;
    loading?: boolean;
};

/**
 * Extended badge for user usage showing personal vs org breakdown.
 */
export const UserUsageStatsBadge: React.FC<UserUsageStatsBadgeProps> = ({
    personalSuccess,
    personalFailed,
    orgSuccess,
    orgFailed,
    loading = false,
}) => {
    if (loading) {
        return (
            <div className="flex items-center gap-1 text-slate-400">
                <Activity className="w-3 h-3 animate-pulse" />
                <span className="text-xs">Loading...</span>
            </div>
        );
    }

    const personalTotal = personalSuccess + personalFailed;
    const orgTotal = orgSuccess + orgFailed;
    const total = personalTotal + orgTotal;

    if (total === 0) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                No runs
            </span>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            {personalTotal > 0 && (
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 w-12">Personal:</span>
                    <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700"
                        title={`${personalSuccess} personal successes`}
                    >
                        <CheckCircle className="w-2.5 h-2.5" />
                        {personalSuccess}
                    </span>
                    <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700"
                        title={`${personalFailed} personal failures`}
                    >
                        <XCircle className="w-2.5 h-2.5" />
                        {personalFailed}
                    </span>
                </div>
            )}
            {orgTotal > 0 && (
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 w-12">Org:</span>
                    <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700"
                        title={`${orgSuccess} org successes`}
                    >
                        <CheckCircle className="w-2.5 h-2.5" />
                        {orgSuccess}
                    </span>
                    <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700"
                        title={`${orgFailed} org failures`}
                    >
                        <XCircle className="w-2.5 h-2.5" />
                        {orgFailed}
                    </span>
                </div>
            )}
        </div>
    );
};
