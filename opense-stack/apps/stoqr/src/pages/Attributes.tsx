import { useEffect, useMemo, useState } from 'react'
import { db } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import type { Folder, Tag } from '../types'

type CustomField = { key: string; type: 'text' | 'number' | 'boolean' | 'date' }

type CompanySettings = {
  custom_fields?: CustomField[]
}

export const Attributes = () => {
  const { companyId } = useCompany()
  const [folders, setFolders] = useState<Folder[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [settings, setSettings] = useState<CompanySettings>({})
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('text')
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#64748b')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadData = async () => {
    if (!companyId) return
    setIsLoading(true)

    const [{ data: companyData }, { data: folderData }, { data: tagData }] = await Promise.all([
      db.from('companies').select('settings').eq('id', companyId).single(),
      db.from('folders').select('id, name, parent_id').eq('company_id', companyId),
      db.from('tags').select('id, name, color').eq('company_id', companyId),
    ])

    setSettings((companyData?.settings as CompanySettings) ?? {})
    setFolders((folderData as Folder[]) ?? [])
    setTags((tagData as Tag[]) ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [companyId])

  const customFields = settings.custom_fields ?? []

  const handleSaveFields = async () => {
    if (!companyId) return
    await supabase
      .from('companies')
      .update({ settings: { ...settings, custom_fields: customFields } })
      .eq('id', companyId)
    setMessage('Custom fields updated.')
  }

  const handleAddField = () => {
    if (!newFieldKey.trim()) return
    const updated = [...customFields, { key: newFieldKey.trim(), type: newFieldType }]
    setSettings((prev) => ({ ...prev, custom_fields: updated }))
    setNewFieldKey('')
  }

  const handleCreateFolder = async () => {
    if (!companyId || !newFolderName.trim()) return
    await db.from('folders').insert({
      company_id: companyId,
      name: newFolderName.trim(),
      parent_id: newFolderParent,
    })
    setNewFolderName('')
    loadData()
  }

  const handleFolderUpdate = async (folderId: string, updates: Partial<Folder>) => {
    await db.from('folders').update(updates).eq('id', folderId)
    loadData()
  }

  const handleCreateTag = async () => {
    if (!companyId || !newTagName.trim()) return
    await db.from('tags').insert({ company_id: companyId, name: newTagName.trim(), color: newTagColor })
    setNewTagName('')
    setNewTagColor('#64748b')
    loadData()
  }

  const handleTagUpdate = async (tagId: string, updates: Partial<Tag>) => {
    await db.from('tags').update(updates).eq('id', tagId)
    loadData()
  }

  const handleTagDelete = async (tagId: string) => {
    await db.from('tags').delete().eq('id', tagId)
    loadData()
  }

  const folderOptions = useMemo(() => [{ id: '', name: 'No parent', parent_id: null }, ...folders], [folders])

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to edit attributes."
      loadingMessage="Loading settings..."
    >
      <div className="grid grid-2">
        <div className="card stack">
          <h3 className="section-title">Custom fields</h3>
          <div className="row wrap">
            <input
              className="input"
              placeholder="Field name"
              value={newFieldKey}
              onChange={(event) => setNewFieldKey(event.target.value)}
            />
            <select className="select" value={newFieldType} onChange={(event) => setNewFieldType(event.target.value as any)}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
            </select>
            <button className="button" type="button" onClick={handleAddField}>
              Add field
            </button>
          </div>
          {customFields.length === 0 ? (
            <EmptyState title="No custom fields" description="Add custom attributes to products." />
          ) : (
            <div className="stack">
              {customFields.map((field, index) => (
                <div key={`${field.key}-${index}`} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{field.key}</div>
                    <div className="small muted">{field.type}</div>
                  </div>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => {
                      const updated = customFields.filter((_, idx) => idx !== index)
                      setSettings((prev) => ({ ...prev, custom_fields: updated }))
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <button className="button secondary" type="button" onClick={handleSaveFields}>
            Save custom fields
          </button>
          {message && <div className="muted small">{message}</div>}
        </div>
        <div className="card stack">
          <h3 className="section-title">Folders</h3>
          <div className="row wrap">
            <input
              className="input"
              placeholder="New folder"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
            />
            <select className="select" value={newFolderParent ?? ''} onChange={(event) => setNewFolderParent(event.target.value || null)}>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            <button className="button" type="button" onClick={handleCreateFolder}>
              Create folder
            </button>
          </div>
          {folders.length === 0 ? (
            <EmptyState title="No folders" description="Create a folder structure." />
          ) : (
            <div className="stack">
              {folders.map((folder) => (
                <div key={folder.id} className="card" style={{ boxShadow: 'none' }}>
                  <div className="row wrap">
                    <input
                      className="input"
                      value={folder.name}
                      onChange={(event) => handleFolderUpdate(folder.id, { name: event.target.value })}
                    />
                    <select
                      className="select"
                      value={folder.parent_id ?? ''}
                      onChange={(event) => handleFolderUpdate(folder.id, { parent_id: event.target.value || null })}
                    >
                      {folderOptions
                        .filter((option) => option.id !== folder.id)
                        .map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card stack">
        <h3 className="section-title">Tags</h3>
        <div className="row wrap">
          <input
            className="input"
            placeholder="New tag"
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
          />
          <input
            className="input"
            type="color"
            value={newTagColor}
            onChange={(event) => setNewTagColor(event.target.value)}
            style={{ width: 60, padding: 4 }}
          />
          <button className="button" type="button" onClick={handleCreateTag}>
            Create tag
          </button>
        </div>
        {tags.length === 0 ? (
          <EmptyState title="No tags" description="Add tags for filtering inventory." />
        ) : (
          <div className="grid grid-2">
            {tags.map((tag) => (
              <div key={tag.id} className="card" style={{ boxShadow: 'none' }}>
                <div className="row wrap">
                  <input
                    className="input"
                    value={tag.name}
                    onChange={(event) => handleTagUpdate(tag.id, { name: event.target.value })}
                  />
                  <input
                    className="input"
                    type="color"
                    value={tag.color}
                    onChange={(event) => handleTagUpdate(tag.id, { color: event.target.value })}
                    style={{ width: 60, padding: 4 }}
                  />
                  <button className="button ghost" type="button" onClick={() => handleTagDelete(tag.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BasePage>
  )
}
