import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { updateOrderStatus, deleteOrder } from '../services/adminApi'

function AdminOrdersManager({ orders, onRefreshData }) {
  const { isAdmin } = useAuth()
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)

  async function handleStatusChange(orderId, nextStatus) {
    if (!isAdmin) {
      setStatusMessage('Admin session required to update orders.')
      return
    }
    setUpdatingId(orderId)
    const { error } = await updateOrderStatus(orderId, nextStatus)
    if (error) {
      console.error('[Admin] Failed to update order status', error)
      setStatusMessage(error.message ?? 'Failed to update order status')
    } else {
      setStatusMessage('Order status updated ✅')
      onRefreshData?.()
    }
    setUpdatingId(null)
  }

  async function handleDelete(orderId) {
    if (!isAdmin) {
      setStatusMessage('Admin session required to delete orders.')
      return
    }
    if (!window.confirm('Delete this order? This cannot be undone.')) return
    setDeletingId(orderId)
    const { error } = await deleteOrder(orderId)
    if (error) {
      console.error('[Admin] Failed to delete order', error)
      setStatusMessage(error.message ?? 'Failed to delete order')
    } else {
      setStatusMessage('Order deleted ✅')
      onRefreshData?.()
    }
    setDeletingId(null)
  }

  return (
    <section className="admin-card">
      <div className="section-header">
        <div>
          <h3>Orders</h3>
          <p className="admin-help-text">
            Review and take action on recent orders. Update payment status or delete records.
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={() => onRefreshData?.()}>
          Refresh data
        </button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Total (€)</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              <tr key={order.id}>
                <td className="mono">{order.id.slice(0, 8)}…</td>
                <td>
                  <strong>{order.customer?.name ?? 'Guest'}</strong>
                  <br />
                  <span className="admin-subtle">{order.customer?.email}</span>
                </td>
                <td>{Number(order.totals?.total ?? 0).toFixed(2)}</td>
                <td>
                  <span className={`status-dot ${order.payment?.status ?? 'pending'}`}>
                    {order.payment?.status ?? 'pending'}
                  </span>
                </td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>
                  <div className="admin-actions">
                    <select
                      value={order.payment?.status ?? 'pending'}
                      onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      disabled={updatingId === order.id}
                    >
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="refunded">refunded</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleDelete(order.id)}
                      disabled={deletingId === order.id}
                    >
                      {deletingId === order.id ? 'Deleting…' : 'Delete'}
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
