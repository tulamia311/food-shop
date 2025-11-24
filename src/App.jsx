import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import { CartProvider } from './context/CartContext'
import MenuGrid from './components/MenuGrid'
import CartSummary from './components/CartSummary'
import CheckoutForm from './components/CheckoutForm'
import defaultMenuItems from './data/menuItems'
import { fetchMenuItems, fetchOrders } from './services/dataApi'
import AdminDashboard from './components/AdminDashboard.jsx'
import { useAuth } from './context/AuthContext.jsx'

const currency = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

function formatOrderDate(isoDate, locale = 'de-DE') {
  if (!isoDate) return '—'
  const date = new Date(isoDate)
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const day = date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${time} Uhr ${day}`
}

function App() {
  const { t, i18n } = useTranslation()
  const [menuItems, setMenuItems] = useState(defaultMenuItems)
  const [status, setStatus] = useState({ loading: true, error: null, source: 'local' })
  const [orders, setOrders] = useState([])
  const [ordersStatus, setOrdersStatus] = useState({ loading: true, error: null })
  const [refreshOrders, setRefreshOrders] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [activeTab, setActiveTab] = useState('shop')
  const { isAdmin, authLoading } = useAuth()

  useEffect(() => {
    let isMounted = true

    async function loadMenuData() {
      setStatus((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const remoteData = await fetchMenuItems()
        if (!isMounted) return

        if (Array.isArray(remoteData) && remoteData.length > 0) {
          setMenuItems(remoteData)
          setStatus({ loading: false, error: null, source: 'remote' })
        } else {
          setStatus({
            loading: false,
            error: t('app.status.error_api_empty'),
            source: 'local',
          })
        }
      } catch (error) {
        if (!isMounted) return
        setStatus({
          loading: false,
          error: error.message || t('app.status.error_typo3'),
          source: 'local',
        })
      }
    }

    async function loadOrdersData() {
      setOrdersStatus({ loading: true, error: null })
      try {
        const remoteOrders = await fetchOrders()
        if (!isMounted) return
        setOrders(Array.isArray(remoteOrders) ? remoteOrders : [])
        setOrdersStatus({ loading: false, error: null })
      } catch (error) {
        if (!isMounted) return
        setOrdersStatus({ loading: false, error: error.message })
      }
    }

    loadMenuData()
    loadOrdersData()

    return () => {
      isMounted = false
    }
  }, [refreshOrders])

  const handleOrderSaved = (orderId, orderPayload) => {
    setLastOrder({ id: orderId, ...orderPayload })
    setRefreshOrders((prev) => !prev)
  }

  const handleRefreshData = () => {
    setRefreshOrders((prev) => !prev)
  }

  const currency = new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
  })

  return (
    <CartProvider menuItems={menuItems}>
      <div className="app-shell">
        <div className="header-row">
          <div className="branding">
            <h1 className="eyebrow">{t('app.title')}</h1>
            <p className="eyebrow-subtitle">{t('app.tagline')}</p>
          </div>
          <div className="lang-switcher">
            <button
              className={`lang-btn ${i18n.resolvedLanguage === 'en' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('en')}
            >
              EN
            </button>
            <span className="divider">|</span>
            <button
              className={`lang-btn ${i18n.resolvedLanguage === 'de' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('de')}
            >
              DE
            </button>
          </div>
        </div>
        <nav className="tab-bar">
          <button
            type="button"
            className={`tab-button ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            {t('app.tabs.customer')}
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            {t('app.tabs.admin')} {isAdmin ? '' : '🔒'}
          </button>
        </nav>

        {activeTab === 'shop' && (
          <>
            <div className="status-stack">
              {status.loading && <div className="status-banner">{t('app.status.loading_menu')}</div>}
              {status.error && <div className="status-banner error">{status.error}</div>}
            </div>

            <main className="shop-layout">
              <section className="menu-section">
                <div className="section-header">
                  <h2>{t('shop.menu_title')}</h2>
                  <p>{t('shop.menu_subtitle')}</p>
                </div>
                <MenuGrid />
                <p className="hero-copy">
                  {t('shop.hero_copy')}
                </p>
              </section>

              <aside className="order-panel">
                <CartSummary />
                <CheckoutForm onOrderSaved={handleOrderSaved} />
              </aside>
            </main>
            <br />
            {lastOrder && (
              <section className="receipt-card">
                <div className="section-header">
                  <h2>{t('receipt.title')}</h2>
                  <button type="button" className="ghost-button" onClick={() => window.print()}>
                    {t('receipt.print')}
                  </button>
                </div>
                <div className="receipt-grid">
                  <div>
                    <p className="receipt-label">{t('receipt.order_id')}</p>
                    <p className="receipt-value">{lastOrder.id}</p>
                  </div>
                  <div>
                    <p className="receipt-label">{t('receipt.payment')}</p>
                    <p className="receipt-value">{lastOrder.payment?.provider ?? 'n/a'}</p>
                  </div>
                </div>
                <div className="receipt-grid">
                  <div>
                    <p className="receipt-label">{t('receipt.customer')}</p>
                    <p className="receipt-value">{lastOrder.customer?.name}</p>
                    <p className="receipt-subtle">{lastOrder.customer?.email}</p>
                  </div>
                  <div>
                    <p className="receipt-label">{t('receipt.fulfillment')}</p>
                    <p className="receipt-value">{lastOrder.customer?.fulfillment}</p>
                  </div>
                </div>
                <ul className="receipt-items">
                  {lastOrder.cart?.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.quantity} × {item.name}
                      </span>
                      <span>{currency.format(item.lineTotal ?? item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="receipt-totals">
                  <div>
                    <span>{t('receipt.subtotal')}</span>
                    <span>{currency.format(lastOrder.totals?.subtotal ?? 0)}</span>
                  </div>
                  <div>
                    <span>{t('receipt.service_fee')}</span>
                    <span>{currency.format(lastOrder.totals?.serviceFee ?? 0)}</span>
                  </div>
                  {lastOrder.totals?.deliveryFee ? (
                    <div>
                      <span>{t('receipt.delivery_fee')}</span>
                      <span>{currency.format(lastOrder.totals.deliveryFee)}</span>
                    </div>
                  ) : null}
                  <div className="totals-grand">
                    <span>{t('receipt.total')}</span>
                    <span>{currency.format(lastOrder.totals?.total ?? 0)}</span>
                  </div>
                </div>
              </section>
            )}

            <section className="orders-card">
              <div className="section-header">
                <h2>{t('shop.latest_orders')}</h2>
                {ordersStatus.loading && <span className="pill">{t('app.status.loading_orders')}</span>}
                {ordersStatus.error && <span className="pill error">{ordersStatus.error}</span>}
              </div>
              {orders.length === 0 ? (
                <p className="empty-state">{t('shop.no_orders')}</p>
              ) : (
                <ul className="orders-list">
                  {orders.slice(-5).reverse().map((order) => (
                    <li key={order.id} className="order-card">
                      <div className="order-card-head">
                        <div className="order-card-title">
                          <span className="order-icon" aria-hidden>
                            🍱
                          </span>
                          <div>
                            <p className="order-customer">{order.customer?.name ?? t('shop.guest')}</p>
                            <p className="order-subline">{order.customer?.fulfillment ?? t('shop.pickup')}</p>
                          </div>
                        </div>
                        <div className="order-meta">
                          <span className="order-total">
                            {typeof order.totals?.total === 'number'
                              ? currency.format(order.totals.total)
                              : order.totals?.total ?? '—'}
                          </span>
                          <span className={`status-dot ${order.payment?.status ?? 'pending'}`}>
                            {order.payment?.status ?? 'pending'}
                          </span>
                        </div>
                      </div>
                      <ul className="order-dishes">
                        {order.cart?.map((item) => (
                          <li key={`${order.id}-${item.id}`}>
                            {item.quantity} × {item.name}
                          </li>
                        ))}
                      </ul>
                      <div className="order-card-footer">
                        <span className="order-timestamp">{formatOrderDate(order.createdAt, i18n.language === 'en' ? 'en-US' : 'de-DE')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            menuItems={menuItems}
            orders={orders}
            onRefreshData={handleRefreshData}
            authLoading={authLoading}
          />
        )}

      </div>
    </CartProvider>
  )
}

export default App
