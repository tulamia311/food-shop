import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { updateOrderStatus, deleteOrder } from '../services/adminApi'

function AdminOrdersManager({ orders, onRefreshData }) {
  const { t, i18n } = useTranslation()
  const { isAdmin } = useAuth()
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)

  async function handleStatusChange(orderId, nextStatus) {
    if (!isAdmin) {
      setStatusMessage(t('admin_orders.require_admin_update'))
      return
    }
    setUpdatingId(orderId)
    const { error } = await updateOrderStatus(orderId, nextStatus)
    if (error) {
      console.error('[Admin] Failed to update order status', error)
      setStatusMessage(error.message ?? t('admin_orders.error_update'))
    } else {
      setStatusMessage(t('admin_orders.update_success'))
      onRefreshData?.()
    }
    setUpdatingId(null)
  }

  async function handleDelete(orderId) {
    if (!isAdmin) {
      setStatusMessage(t('admin_orders.require_admin_delete'))
      return
    }
    if (!window.confirm(t('admin_orders.confirm_delete'))) return
    setDeletingId(orderId)
    const { error } = await deleteOrder(orderId)
    if (error) {
      console.error('[Admin] Failed to delete order', error)
      setStatusMessage(error.message ?? t('admin_orders.error_delete'))
    } else {
      setStatusMessage(t('admin_orders.delete_success'))
      onRefreshData?.()
    }
    setDeletingId(null)
  }

  return (
    <section className="admin-card admin-card--orders">
      <div className="section-header">
        <div>
          <h3>{t('admin_orders.title')}</h3>
          <p className="admin-help-text">
            {t('admin_orders.help_text')}
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={() => onRefreshData?.()}>
          {t('admin_orders.refresh')}
        </button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin_orders.headers.customer')}</th>
              <th>{t('admin_orders.headers.total')}</th>
              <th>{t('admin_orders.headers.status')}</th>
              <th>{t('admin_orders.headers.created')}</th>
              <th>{t('admin_orders.headers.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.customer?.name ?? t('admin_orders.guest')}</strong>
                  <br />
                  <span className="admin-subtle">{order.customer?.email}</span>
                </td>
                <td>{Number(order.totals?.total ?? 0).toFixed(2)}</td>
                <td>
                  <span className={`status-dot ${order.payment?.status ?? 'pending'}`}>
                    <select
                      value={order.payment?.status ?? 'pending'}
                      onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      disabled={updatingId === order.id}
                    >
                      <option value="pending">{t('admin_orders.status.pending')}</option>
                      <option value="paid">{t('admin_orders.status.paid')}</option>
                      <option value="refunded">{t('admin_orders.status.refunded')}</option>
                      <option value="cancelled">{t('admin_orders.status.cancelled')}</option>
                    </select>
                  </span>
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      onClick={() => handleDelete(order.id)}
                      disabled={deletingId === order.id}
                      aria-label="Delete order"
                    >
                      {deletingId === order.id ? t('admin_orders.deleting') : '🗑'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {statusMessage && <p className="admin-help-text">{statusMessage}</p>}
    </section>
  )
}

export default AdminOrdersManager
