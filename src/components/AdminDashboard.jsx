import AdminLoginForm from './AdminLoginForm.jsx'
import AdminMenuManager from './AdminMenuManager.jsx'
import AdminOrdersManager from './AdminOrdersManager.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function AdminDashboard({ menuItems, orders, onRefreshData }) {
  const { isAdmin, authLoading } = useAuth()

  if (authLoading) {
    return <p className="admin-help-text">Checking admin session …</p>
  }

  if (!isAdmin) {
    return (
      <section className="admin-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Restricted area</p>
            <h2>Admin login</h2>
          </div>
        </div>
        <p className="admin-help-text">
          Sign in with the Supabase admin account to unlock menu and order management tools.
        </p>
        <AdminLoginForm />
      </section>
    )
  }

  return (
    <div className="admin-stack">
      <section className="admin-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h2>Manage shop content</h2>
            <p className="admin-help-text">
              CRUD tooling is scaffolded. Connect actions to Supabase mutations to go live.
            </p>
          </div>
          <AdminLoginForm />
        </div>
      </section>
      <div className="admin-grid">
        <AdminMenuManager menuItems={menuItems} onRefreshData={onRefreshData} />
        <AdminOrdersManager orders={orders} onRefreshData={onRefreshData} />
      </div>
    </div>
  )
}

export default AdminDashboard
