import React, { useState } from 'react';
import { Plus, Search, FileSpreadsheet, Clock, Trash2, Edit, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_WORKFLOWS = [
  { id: '1', name: 'Q1 Sales Analysis', owner: 'Alice Johnson', lastEdited: '2 hours ago', status: 'Published' },
  { id: '2', name: 'Customer Clean Up', owner: 'Bob Smith', lastEdited: '1 day ago', status: 'Draft' },
  { id: '3', name: 'Inventory Sync', owner: 'Alice Johnson', lastEdited: '3 days ago', status: 'Active' },
  { id: '4', name: 'Marketing ROI', owner: 'Guest User', lastEdited: '5 days ago', status: 'Draft' },
  { id: '5', name: 'Log Analysis 2025', owner: 'Guest User', lastEdited: '1 week ago', status: 'Published' },
];

export const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'org'>('org');

  const filteredWorkflows = activeTab === 'personal'
    ? MOCK_WORKFLOWS.filter(w => w.owner === 'Guest User')
    : MOCK_WORKFLOWS.filter(w => w.owner !== 'Guest User');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, Guest</h1>
          <p className="text-slate-500 mt-1">Manage your data workflows and automations.</p>
        </div>
        <Link
            to="/editor/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Workflow
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('personal')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            My Personal Workflows
          </button>
          <button
            onClick={() => setActiveTab('org')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'org'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Pearl Corp Workflows
          </button>
        </nav>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search workflows..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="min-w-full divide-y divide-slate-200">
          <div className="bg-slate-50 grid grid-cols-12 gap-4 px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Name</div>
            <div className="col-span-3">Owner</div>
            <div className="col-span-2">Last Edited</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="divide-y divide-slate-200 bg-white">
            {filteredWorkflows.length > 0 ? filteredWorkflows.map((workflow) => (
              <div key={workflow.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                <div className="col-span-4 flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3 text-blue-600">
                        <FileSpreadsheet className="w-5 h-5"/>
                    </div>
                    <div>
                        <Link to={`/editor/${workflow.id}`} className="font-medium text-slate-900 hover:text-blue-600 block">
                            {workflow.name}
                        </Link>
                        <span className="text-xs text-slate-500">ID: {workflow.id}</span>
                    </div>
                </div>
                <div className="col-span-3 text-sm text-slate-600 flex items-center">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mr-2 text-xs font-bold text-slate-500">
                        {workflow.owner.charAt(0)}
                    </div>
                    {workflow.owner}
                </div>
                <div className="col-span-2 text-sm text-slate-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1.5 text-slate-400"/>
                    {workflow.lastEdited}
                </div>
                <div className="col-span-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        workflow.status === 'Published' ? 'bg-green-100 text-green-800' : 
                        workflow.status === 'Draft' ? 'bg-slate-100 text-slate-800' : 
                        'bg-blue-100 text-blue-800'
                    }`}>
                        {workflow.status}
                    </span>
                </div>
                <div className="col-span-1 flex justify-end gap-2">
                    <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            )) : (
              <div className="px-6 py-12 text-center text-slate-500">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>No workflows found in this view.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
