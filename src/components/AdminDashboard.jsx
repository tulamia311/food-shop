import { useTranslation } from 'react-i18next'
import AdminLoginForm from './AdminLoginForm.jsx'
import AdminMenuManager from './AdminMenuManager.jsx'
import AdminOrdersManager from './AdminOrdersManager.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function AdminDashboard({ menuItems, orders, onRefreshData }) {
  const { t } = useTranslation()
  const { isAdmin, authLoading } = useAuth()

  if (authLoading) {
    return <p className="admin-help-text">{t('admin.loading_session')}</p>
  }

  if (!isAdmin) {
    return (
      <section className="admin-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t('admin.restricted_area')}</p>
            <h2>{t('admin.login_title')}</h2>
          </div>
        </div>
        <p className="admin-help-text">
          {t('admin.login_help')}
        </p>
        <AdminLoginForm />
      </section>
    )
  }

  return (
    <div className="admin-stack">
      <section className="admin-card">
        <AdminLoginForm />
      </section>
      <AdminOrdersManager orders={orders} onRefreshData={onRefreshData} />
      <AdminMenuManager menuItems={menuItems} onRefreshData={onRefreshData} />
    </div>
  )
}

export default AdminDashboard
