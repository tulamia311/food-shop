import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { upsertMenuItem, deleteMenuItem } from '../services/adminApi'
import { useAuth } from '../context/AuthContext.jsx'

function AdminMenuManager({ menuItems, onRefreshData }) {
  const { t, i18n } = useTranslation()
  const isGerman = i18n.resolvedLanguage?.startsWith('de')

  const [formState, setFormState] = useState({
    id: '',
    name: '',
    price: '',
    description_en: '',
    description_de: '',
    emoji: '',
  })
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)
  const { isAdmin } = useAuth()

  function handleChange(event) {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  function handleEdit(item) {
    setFormState({
      id: item.id,
      name: item.name ?? '',
      price: item.price ?? '',
      description_en: item.description_i18n?.en || item.description || '',
      description_de: item.description_i18n?.de || '',
      emoji: item.emoji ?? '',
    })
    setStatus(t('admin_menu.editing'))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isAdmin) {
      setStatus(t('admin_menu.require_admin_save'))
      return
    }

    setIsSubmitting(true)
    setStatus(t('admin_menu.saving'))

    const payload = {
      ...formState,
      description: formState.description_en, // Sync English to old column for safety
      description_i18n: {
        en: formState.description_en,
        de: formState.description_de,
      },
    }

    const { error } = await upsertMenuItem(payload)
    if (error) {
      console.error('[Admin] Failed to save menu item', error)
      setStatus(error.message ?? t('admin_menu.error_save'))
    } else {
      setStatus(t('admin_menu.saved_success'))
      setFormState({ id: '', name: '', price: '', description_en: '', description_de: '', emoji: '' })
      onRefreshData?.()
    }
    setIsSubmitting(false)
  }

  async function handleDelete(id) {
    if (!isAdmin) {
      setStatus(t('admin_menu.require_admin_delete'))
      return
    }
    if (!window.confirm(t('admin_menu.confirm_delete'))) return
    setIsDeleting(id)
    const { error } = await deleteMenuItem(id)
    if (error) {
      console.error('[Admin] Failed to delete menu item', error)
      setStatus(error.message ?? t('admin_menu.error_delete'))
    } else {
      setStatus(t('admin_menu.deleted_success'))
      onRefreshData?.()
    }
    setIsDeleting(null)
  }

  return (
    <section className="admin-card admin-card--menu">
      <div className="section-header">
        <div>
          <h3>{t('admin_menu.title')}</h3>
          <p className="admin-help-text">
            {t('admin_menu.help_text')}
          </p>
        </div>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin_menu.headers.emoji')}</th>
              <th>{t('admin_menu.headers.name')}</th>
              <th>{t('admin_menu.headers.description')}</th>
              <th>{t('admin_menu.headers.price')}</th>
              <th>{t('admin_menu.headers.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {menuItems?.map((item) => (
              <tr key={item.id}>
                <td>{item.emoji}</td>
                <td>{item.name}</td>
                <td>
                  {isGerman ? (
                    <>
                      {item.description_i18n?.de && (
                        <div>
                          <strong>DE:</strong> {item.description_i18n.de}
                        </div>
                      )}
                      <div className="admin-subtle" style={{ marginTop: item.description_i18n?.de ? '4px' : '0' }}>
                        <strong>EN:</strong> {item.description_i18n?.en || item.description}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <strong>EN:</strong> {item.description_i18n?.en || item.description}
                      </div>
                      {item.description_i18n?.de && (
                        <div className="admin-subtle" style={{ marginTop: '4px' }}>
                          <strong>DE:</strong> {item.description_i18n.de}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td>{Number(item.price).toFixed(2)}</td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="ghost-button" onClick={() => handleEdit(item)}>
                      {t('admin_menu.edit')}
                    </button>
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting === item.id}
                      aria-label="Delete menu item"
                    >
                      {isDeleting === item.id ? t('admin_menu.deleting') : '🗑'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          {t('admin_menu.labels.name')}
          <input name="name" value={formState.name} onChange={handleChange} placeholder="Brezel" required />
        </label>
        <label>
          {t('admin_menu.labels.description_en')}
          <textarea
            name="description_en"
            value={formState.description_en}
            onChange={handleChange}
            placeholder="Freshly baked Bavarian pretzel."
          />
        </label>
        <label>
          {t('admin_menu.labels.description_de')}
          <textarea
            name="description_de"
            value={formState.description_de}
            onChange={handleChange}
            placeholder="Frisch gebackene bayerische Brezel."
          />
        </label>
        <label>
          {t('admin_menu.labels.price')}
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={formState.price}
            onChange={handleChange}
            placeholder="3.20"
          />
        </label>
        <label>
          {t('admin_menu.labels.emoji')}
          <input name="emoji" value={formState.emoji} onChange={handleChange} placeholder="🥨" />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('admin_menu.saving') : t('admin_menu.save')}
          </button>
          {status && <p className="admin-help-text">{status}</p>}
        </div>
      </form>
    </section>
  )
}

export default AdminMenuManager
