import { useState } from 'react'
import { upsertMenuItem, deleteMenuItem } from '../services/adminApi'
import { useAuth } from '../context/AuthContext.jsx'

function AdminMenuManager({ menuItems, onRefreshData }) {
  const [formState, setFormState] = useState({
    id: '',
    name: '',
    price: '',
    description: '',
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
      description: item.description ?? '',
      emoji: item.emoji ?? '',
    })
    setStatus('Editing existing dish…')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isAdmin) {
      setStatus('Admin session required to save menu items.')
      return
    }

    setIsSubmitting(true)
    setStatus('Saving to Supabase…')
    const { error } = await upsertMenuItem(formState)
    if (error) {
      console.error('[Admin] Failed to save menu item', error)
      setStatus(error.message ?? 'Failed to save menu item')
    } else {
      setStatus('Menu item saved ✅')
      setFormState({ id: '', name: '', price: '', description: '', emoji: '' })
      onRefreshData?.()
    }
    setIsSubmitting(false)
  }

  async function handleDelete(id) {
    if (!isAdmin) {
      setStatus('Admin session required to delete menu items.')
      return
    }
    if (!window.confirm('Delete this menu item?')) return
    setIsDeleting(id)
    const { error } = await deleteMenuItem(id)
    if (error) {
      console.error('[Admin] Failed to delete menu item', error)
      setStatus(error.message ?? 'Failed to delete menu item')
    } else {
      setStatus('Menu item deleted ✅')
      onRefreshData?.()
    }
    setIsDeleting(null)
  }

  return (
    <section className="admin-card admin-card--menu">
      <div className="section-header">
        <div>
          <h3>Menu items</h3>
          <p className="admin-help-text">
            Add or update dishes directly in Supabase. Select a row to edit, or delete it from the table.
          </p>
        </div>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Emoji</th>
              <th>Name</th>
              <th>Description</th>
              <th>Price (€)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menuItems?.map((item) => (
              <tr key={item.id}>
                <td>{item.emoji}</td>
                <td>{item.name}</td>
                <td>{item.description}</td>
                <td>{Number(item.price).toFixed(2)}</td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="ghost-button" onClick={() => handleEdit(item)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting === item.id}
                      aria-label="Delete menu item"
                    >
                      {isDeleting === item.id ? 'Deleting…' : '🗑'}
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
          Name:
          <input name="name" value={formState.name} onChange={handleChange} placeholder="Brezel" required />
        </label>
        <label>
          Description:
          <textarea
            name="description"
            value={formState.description}
            onChange={handleChange}
            placeholder="Freshly baked Bavarian pretzel."
          />
        </label>
        <label>
          Price:
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
          Emoji:
          <input name="emoji" value={formState.emoji} onChange={handleChange} placeholder="🥨" />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save menu item'}
          </button>
          {status && <p className="admin-help-text">{status}</p>}
        </div>
      </form>
    </section>
  )
}

export default AdminMenuManager
