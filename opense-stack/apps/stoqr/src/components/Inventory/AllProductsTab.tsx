import { useState } from 'react'
import { LayoutGrid, List as ListIcon, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateInventoryFolder } from '../../hooks/queries/useInventory'
import { InventoryFiltersBar } from './all-products/InventoryFiltersBar'
import { ProductListView } from './all-products/ProductListView'
import { FolderNavigationPanel } from './FolderNavigationPanel'
import type { AllProductsTabProps } from './all-products/types'

export const AllProductsTab = ({
  companyId,
  selectedFolderId,
  setSelectedFolderId,
  stockFilter,
  setStockFilter,
  activeCustomFieldFilters,
  onAddFilter,
  onRemoveFilter,
  pendingFilterKey,
  setPendingFilterKey,
  customFieldFilters,
  onImportOpen,
  onCreateOpen,
  products,
  isLoading,
  selectedRowIds,
  toggleSelection,
  toggleAll,
  sortField,
  setSortField,
  sortDir,
  setSortDir,
  page,
  pageSize,
  totalCount,
  setPage,
  folders,
  handleBulkDelete,
  onRefresh,
}: AllProductsTabProps) => {
  const isSelectionMode = selectedRowIds.size > 0
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const createFolderMutation = useCreateInventoryFolder(companyId)

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId)
    setPage(1)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName,
        parentId: selectedFolderId,
      })
      toast.success('Folder created')
      setNewFolderName('')
      setIsCreatingFolder(false)
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder'
      toast.error(message)
    }
  }

  return (
    <div className="explorer-container" style={{ height: '600px' }}>
      <FolderNavigationPanel
        folders={folders}
        activeFolderId={selectedFolderId}
        onSelectFolder={(folderId) => handleFolderSelect(folderId)}
        rootLabel="All folders"
        onSelectRoot={() => handleFolderSelect(null)}
      />

      <div className="explorer-main">
        <div className="explorer-toolbar" style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0 }}>
          <div className="row">
            {isCreatingFolder ? (
              <div className="row bg-slate-50 p-1 rounded border border-slate-200">
                <input
                  className="input small"
                  style={{ width: 140 }}
                  autoFocus
                  placeholder="Folder Name"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void handleCreateFolder()}
                />
                <button className="button small" onClick={() => void handleCreateFolder()}>Save</button>
                <button
                  className="button ghost small"
                  onClick={() => {
                    setIsCreatingFolder(false)
                    setNewFolderName('')
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button className="button small" onClick={() => setIsCreatingFolder(true)}>
                <Plus size={16} style={{ marginRight: 4 }} /> New Folder
              </button>
            )}
          </div>

          <div className="row">
            <button
              className={`button ghost small ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              style={{ padding: 6 }}
              title="List view"
            >
              <ListIcon size={16} />
            </button>
            <button
              className={`button ghost small ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
              style={{ padding: 6 }}
              title="Module view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', borderRadius: 0, boxShadow: 'none', height: '100%' }}>
          <InventoryFiltersBar
            isSelectionMode={isSelectionMode}
            selectedRowIds={selectedRowIds}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            activeCustomFieldFilters={activeCustomFieldFilters}
            onAddFilter={onAddFilter}
            onRemoveFilter={onRemoveFilter}
            pendingFilterKey={pendingFilterKey}
            setPendingFilterKey={setPendingFilterKey}
            customFieldFilters={customFieldFilters}
            onImportOpen={onImportOpen}
            onCreateOpen={onCreateOpen}
            handleBulkDelete={handleBulkDelete}
          />

          <ProductListView
            companyId={companyId}
            view={view}
            products={products}
            isLoading={isLoading}
            selectedRowIds={selectedRowIds}
            toggleSelection={toggleSelection}
            toggleAll={toggleAll}
            sortField={sortField}
            setSortField={setSortField}
            sortDir={sortDir}
            setSortDir={setSortDir}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            setPage={setPage}
            folders={folders}
            handleBulkDelete={handleBulkDelete}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  )
}
