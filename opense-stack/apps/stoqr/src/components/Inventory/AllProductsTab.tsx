import { useState } from 'react'
import { toast } from 'sonner'
import {
  useCreateInventoryFolder,
  useRenameFolderInInventory,
  useDeleteFolderInInventory,
  useMoveFolderInInventory,
} from '../../hooks/queries/useInventory'
import { InventoryFiltersBar } from './all-products/InventoryFiltersBar'
import { ProductListView } from './all-products/ProductListView'
import { FolderNavigationPanel } from './FolderNavigationPanel'
import type { AllProductsTabProps } from './all-products/types'

export const AllProductsTab = ({
  companyId,
  folderView,
  setFolderView,
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

  // Folder creation inline state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Folder delete dialog state
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<'choose' | 'confirm' | null>(null)
  const [deleteAction, setDeleteAction] = useState<'move-uncategorised' | 'delete-products' | null>(null)

  const createFolderMutation = useCreateInventoryFolder(companyId)
  const renameFolderMutation = useRenameFolderInInventory(companyId)
  const deleteFolderMutation = useDeleteFolderInInventory(companyId)
  const moveFolderMutation = useMoveFolderInInventory(companyId)

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId)
    setPage(1)
  }

  const handleCreateFolder = async () => {
    if (isCreatingFolder) {
      // Submit
      if (!newFolderName.trim()) return
      try {
        await createFolderMutation.mutateAsync({
          name: newFolderName,
          parentId: folderView === 'folder' ? selectedFolderId : null,
        })
        toast.success('Folder created')
        setNewFolderName('')
        setIsCreatingFolder(false)
        onRefresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create folder'
        toast.error(message)
      }
    } else {
      setIsCreatingFolder(true)
    }
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await renameFolderMutation.mutateAsync({ folderId, newName })
      toast.success('Folder renamed')
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename folder'
      toast.error(message)
    }
  }

  const handleDeleteStepChoose = (folderId: string) => {
    setDeletingFolderId(folderId)
    setDeleteStep('choose')
    setDeleteAction(null)
  }

  const handleDeleteActionSelect = (action: 'move-uncategorised' | 'delete-products') => {
    setDeleteAction(action)
    setDeleteStep('confirm')
  }

  const handleDeleteConfirm = async () => {
    if (!deletingFolderId || !deleteAction) return
    try {
      await deleteFolderMutation.mutateAsync({ folderId: deletingFolderId, action: deleteAction })
      toast.success('Folder deleted')
      if (selectedFolderId === deletingFolderId) {
        setFolderView('all')
        setSelectedFolderId(null)
      }
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete folder'
      toast.error(message)
    } finally {
      setDeletingFolderId(null)
      setDeleteStep(null)
      setDeleteAction(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingFolderId(null)
    setDeleteStep(null)
    setDeleteAction(null)
  }

  const handleMoveFolder = async (folderId: string, newParentId: string | null, sortOrder: number) => {
    try {
      await moveFolderMutation.mutateAsync({ folderId, newParentId, sortOrder })
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move folder'
      toast.error(message)
    }
  }

  return (
    <div className="explorer-container" style={{ flex: 1, minHeight: 0 }}>
      <FolderNavigationPanel
        folders={folders}
        activeFolderId={selectedFolderId}
        folderView={folderView}
        onSelectFolder={(folderId) => handleFolderSelect(folderId)}
        onSelectView={(view) => {
          setFolderView(view)
          if (view !== 'folder') setSelectedFolderId(null)
          setPage(1)
        }}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={(folderId) => handleDeleteStepChoose(folderId)}
        onMoveFolder={handleMoveFolder}
        deletingFolderId={deletingFolderId}
        deleteStep={deleteStep}
        deleteAction={deleteAction}
        onDeleteStepChoose={handleDeleteStepChoose}
        onDeleteActionSelect={handleDeleteActionSelect}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteCancel={handleDeleteCancel}
      />

      <div className="explorer-main">
        {isCreatingFolder ? (
          <div className="explorer-toolbar" style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0 }}>
            <div className="row">
              <div className="row bg-slate-50 p-1 rounded border border-slate-200">
                <input
                  className="input small"
                  style={{ width: 140 }}
                  autoFocus
                  placeholder="Folder Name"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleCreateFolder()
                    if (event.key === 'Escape') {
                      setIsCreatingFolder(false)
                      setNewFolderName('')
                    }
                  }}
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
            </div>
          </div>
        ) : null}

        <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', borderRadius: 0, boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <InventoryFiltersBar
            isSelectionMode={isSelectionMode}
            selectedRowIds={selectedRowIds}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            view={view}
            setView={setView}
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
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  )
}
