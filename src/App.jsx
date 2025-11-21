import { useEffect, useState } from 'react'
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

function formatOrderDate(isoDate) {
  if (!isoDate) return '—'
  const date = new Date(isoDate)
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const day = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${time} Uhr ${day}`
}

function App() {
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
            error: 'Remote API responded without menu items. Showing local defaults.',
            source: 'local',
          })
        }
      } catch (error) {
        if (!isMounted) return
        setStatus({
          loading: false,
          error: error.message || 'Failed to load data from TYPO3',
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

  return (
    <CartProvider menuItems={menuItems}>
      <div className="app-shell">
        <p className="eyebrow">Tulamia Mini Food Shop</p>
        <nav className="tab-bar">
          <button
            type="button"
            className={`tab-button ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            Customer view
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin {isAdmin ? '' : '🔒'}
          </button>
        </nav>

        {activeTab === 'shop' && (
          <>
            <div className="status-stack">
              {status.loading && <div className="status-banner">Loading live menu …</div>}
              {status.error && <div className="status-banner error">{status.error}</div>}
            </div>
            <header className="hero">
              <h1>
                Small bites, <span>big comfort</span>
              </h1>
              <p className="hero-copy">
                Order freshly prepared street-food favorites — ready for pickup in 15 minutes or
                delivered to your door.
              </p>
            </header>

            <main className="shop-layout">
              <section className="menu-section">
                <div className="section-header">
                  <h2>Today&apos;s menu</h2>
                  <p>Tap a dish to drop it into your basket.</p>
                </div>
                <MenuGrid />
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
                  <h2>Bill overview</h2>
                  <button type="button" className="ghost-button" onClick={() => window.print()}>
                    Print bill
                  </button>
                </div>
                <div className="receipt-grid">
                  <div>
                    <p className="receipt-label">Order ID</p>
                    <p className="receipt-value">{lastOrder.id}</p>
                  </div>
                  <div>
                    <p className="receipt-label">Payment</p>
                    <p className="receipt-value">{lastOrder.payment?.provider ?? 'n/a'}</p>
                  </div>
                </div>
                <div className="receipt-grid">
                  <div>
                    <p className="receipt-label">Customer</p>
                    <p className="receipt-value">{lastOrder.customer?.name}</p>
                    <p className="receipt-subtle">{lastOrder.customer?.email}</p>
                  </div>
                  <div>
                    <p className="receipt-label">Fulfillment</p>
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
                    <span>Subtotal</span>
                    <span>{currency.format(lastOrder.totals?.subtotal ?? 0)}</span>
                  </div>
                  <div>
                    <span>Service fee</span>
                    <span>{currency.format(lastOrder.totals?.serviceFee ?? 0)}</span>
                  </div>
                  {lastOrder.totals?.deliveryFee ? (
                    <div>
                      <span>Delivery fee</span>
                      <span>{currency.format(lastOrder.totals.deliveryFee)}</span>
                    </div>
                  ) : null}
                  <div className="totals-grand">
                    <span>Total</span>
                    <span>{currency.format(lastOrder.totals?.total ?? 0)}</span>
                  </div>
                </div>
              </section>
            )}

            <section className="orders-card">
              <div className="section-header">
                <h2>Latest orders</h2>
                {ordersStatus.loading && <span className="pill">Loading…</span>}
                {ordersStatus.error && <span className="pill error">{ordersStatus.error}</span>}
              </div>
              {orders.length === 0 ? (
                <p className="empty-state">No orders yet. Place your first order to see it here.</p>
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
                            <p className="order-customer">{order.customer?.name ?? 'Guest'}</p>
                            <p className="order-subline">{order.customer?.fulfillment ?? 'pickup'}</p>
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
                        <span className="order-timestamp">{formatOrderDate(order.createdAt)}</span>
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
