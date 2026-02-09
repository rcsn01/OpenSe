import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { pollForOrganisation } from '../../api/organisations';
import { OrgSimple } from '../../types/organisation';
import clsx from 'clsx';

interface OrganisationProvisioningProps {
  userId: string;
  onSuccess: (org: OrgSimple) => void;
  onCancel: () => void;
}

type ProvisioningStatus = 
  | 'polling'      // Actively checking for org
  | 'success'      // Org found
  | 'timeout'      // Max attempts reached
  | 'error';       // Unexpected error

interface StatusConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const STATUS_CONFIG: Record<ProvisioningStatus, StatusConfig> = {
  polling: {
    icon: <Loader2 className="w-12 h-12 animate-spin text-blue-500" />,
    title: 'Setting up your organisation...',
    description: 'We\'re provisioning your account. This usually takes just a few seconds.',
    color: 'blue',
  },
  success: {
    icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
    title: 'Organisation created!',
    description: 'Your organisation is ready. Redirecting you now...',
    color: 'green',
  },
  timeout: {
    icon: <XCircle className="w-12 h-12 text-amber-500" />,
    title: 'Taking longer than expected',
    description: 'Your payment was successful, but the organisation is still being set up. Please wait a moment or refresh the page.',
    color: 'amber',
  },
  error: {
    icon: <XCircle className="w-12 h-12 text-red-500" />,
    title: 'Something went wrong',
    description: 'There was an error setting up your organisation. Please contact support if this persists.',
    color: 'red',
  },
};

export const OrganisationProvisioning: React.FC<OrganisationProvisioningProps> = ({
  userId,
  onSuccess,
  onCancel,
}) => {
  const [status, setStatus] = useState<ProvisioningStatus>('polling');
  const [attempt, setAttempt] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(15);
  const [foundOrg, setFoundOrg] = useState<OrgSimple | null>(null);

  const startPolling = useCallback(async () => {
    setStatus('polling');
    setAttempt(0);

    try {
      const org = await pollForOrganisation(userId, {
        maxAttempts: 15,
        intervalMs: 2000,
        onAttempt: (current, max) => {
          setAttempt(current);
          setMaxAttempts(max);
        },
      });

      if (org) {
        setFoundOrg(org);
        setStatus('success');
        // Brief delay to show success state before redirect
        setTimeout(() => onSuccess(org), 1500);
      } else {
        setStatus('timeout');
      }
    } catch (error) {
      console.error('[OrganisationProvisioning] Error:', error);
      setStatus('error');
    }
  }, [userId, onSuccess]);

  useEffect(() => {
    startPolling();
  }, [startPolling]);

  const config = STATUS_CONFIG[status];
  const progress = maxAttempts > 0 ? (attempt / maxAttempts) * 100 : 0;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {config.icon}
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {config.title}
        </h2>
        <p className="text-slate-500 mb-6">
          {config.description}
        </p>

        {/* Progress Bar (only show while polling) */}
        {status === 'polling' && (
          <div className="mb-6">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progress, 95)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Checking... ({attempt} of {maxAttempts})
            </p>
          </div>
        )}

        {/* Success Message */}
        {status === 'success' && foundOrg && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 font-medium">
              Welcome to <span className="font-semibold">{foundOrg.name}</span>!
            </p>
          </div>
        )}

        {/* Actions for timeout/error */}
        {(status === 'timeout' || status === 'error') && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={startPolling}
              className={clsx(
                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={onCancel}
              className={clsx(
                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Go Back
            </button>
          </div>
        )}

        {/* Help Text */}
        {status === 'timeout' && (
          <p className="mt-6 text-xs text-slate-400">
            If this issue persists, your payment was still processed successfully.
            Please refresh the page in a minute or contact support.
          </p>
        )}
      </div>
    </div>
  );
};
