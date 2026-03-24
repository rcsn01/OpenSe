import React, { useState } from 'react';
import { Bell, X, Mail, MessageSquare, Globe, Trash2, Loader2 } from 'lucide-react';
import { useNotificationSettings, useUpsertNotificationSetting, useDeleteNotificationSetting } from '../../hooks/queries/useNotifications';
import { NotificationChannel } from '../../api/notifications';
import { Button } from '@repo/ui';

interface NotificationSettingsPanelProps {
  workflowId: string | null;
  userId: string;
  onClose: () => void;
}

const CHANNEL_META: Record<NotificationChannel, { label: string; icon: React.ElementType; color: string }> = {
  email: { label: 'Email', icon: Mail, color: 'text-blue-600 bg-blue-50' },
  slack: { label: 'Slack', icon: MessageSquare, color: 'text-purple-600 bg-purple-50' },
  webhook: { label: 'Webhook', icon: Globe, color: 'text-emerald-600 bg-emerald-50' },
};

export const NotificationSettingsPanel: React.FC<NotificationSettingsPanelProps> = ({
  workflowId,
  userId,
  onClose,
}) => {
  const { data: settings = [], isLoading } = useNotificationSettings(workflowId);
  const upsertMutation = useUpsertNotificationSetting();
  const deleteMutation = useDeleteNotificationSetting(workflowId);

  const [addingChannel, setAddingChannel] = useState<NotificationChannel | null>(null);
  const [formConfig, setFormConfig] = useState<Record<string, any>>({});

  const existingChannels = new Set(settings.map((s) => s.channel));
  const availableChannels = (['email', 'slack', 'webhook'] as NotificationChannel[]).filter(
    (c) => !existingChannels.has(c)
  );

  const handleAdd = () => {
    if (!addingChannel || !workflowId) return;

    upsertMutation.mutate(
      {
        workflowId,
        channel: addingChannel,
        enabled: true,
        config: formConfig,
        userId,
      },
      {
        onSuccess: () => {
          setAddingChannel(null);
          setFormConfig({});
        },
      }
    );
  };

  const handleToggle = (setting: typeof settings[0]) => {
    if (!workflowId) return;
    upsertMutation.mutate({
      workflowId,
      channel: setting.channel,
      enabled: !setting.enabled,
      config: setting.config,
      userId,
    });
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full shadow-lg z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Alerts</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-slate-500">Get notified when this workflow fails.</p>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Existing settings */}
            {settings.map((setting) => {
              const meta = CHANNEL_META[setting.channel];
              const Icon = meta.icon;

              return (
                <div key={setting.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${meta.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(setting)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          setting.enabled ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            setting.enabled ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(setting.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Config summary */}
                  <div className="text-[10px] text-slate-500 type-mono bg-white rounded px-2 py-1 border border-slate-100">
                    {setting.channel === 'email' && (
                      <span>{(setting.config.recipients as string[])?.join(', ') || 'No recipients'}</span>
                    )}
                    {setting.channel === 'slack' && (
                      <span>{setting.config.webhook_url ? 'Webhook configured' : 'No webhook URL'}</span>
                    )}
                    {setting.channel === 'webhook' && (
                      <span>{setting.config.url || 'No URL'}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add new channel */}
            {availableChannels.length > 0 && !addingChannel && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Channel</p>
                <div className="flex gap-2">
                  {availableChannels.map((ch) => {
                    const meta = CHANNEL_META[ch];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={ch}
                        onClick={() => {
                          setAddingChannel(ch);
                          setFormConfig(ch === 'email' ? { recipients: [] } : {});
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add form */}
            {addingChannel && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-blue-700">Configure {CHANNEL_META[addingChannel].label}</p>

                {addingChannel === 'email' && (
                  <input
                    type="text"
                    placeholder="Recipients (comma-separated emails)"
                    className="w-full rounded-md border border-blue-300 py-1.5 px-2 text-xs focus:ring-1 focus:ring-blue-500"
                    onChange={(e) =>
                      setFormConfig({
                        recipients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                )}

                {addingChannel === 'slack' && (
                  <input
                    type="url"
                    placeholder="Slack Webhook URL"
                    className="w-full rounded-md border border-blue-300 py-1.5 px-2 text-xs focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => setFormConfig({ webhook_url: e.target.value })}
                  />
                )}

                {addingChannel === 'webhook' && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="Webhook URL"
                      className="w-full rounded-md border border-blue-300 py-1.5 px-2 text-xs focus:ring-1 focus:ring-blue-500"
                      onChange={(e) => setFormConfig((prev: any) => ({ ...prev, url: e.target.value }))}
                    />
                    <select
                      className="w-full rounded-md border border-blue-300 py-1.5 px-2 text-xs bg-white"
                      onChange={(e) => setFormConfig((prev: any) => ({ ...prev, method: e.target.value }))}
                      defaultValue="POST"
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="primary" onClick={handleAdd} disabled={upsertMutation.isPending} className="text-xs px-3 py-1">
                    {upsertMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setAddingChannel(null); setFormConfig({}); }}
                    className="text-xs px-3 py-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <p className="text-[10px] text-slate-400 text-center">
          Alerts fire when a workflow execution fails.
        </p>
      </div>
    </aside>
  );
};
