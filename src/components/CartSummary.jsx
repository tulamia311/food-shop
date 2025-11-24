import { useTranslation } from 'react-i18next'
import { useCart } from '../context/CartContext'

function CartSummary() {
  const { t, i18n } = useTranslation()
  const { cartLines, subtotal, updateItem, removeItem, clearCart } = useCart()
  const serviceFee = subtotal > 0 ? 1.5 : 0
  const total = subtotal + serviceFee

  const currency = new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
  })

  return (
    <section className="cart-card">
      <div className="section-header">
        <h2>{t('cart.title')}</h2>
        {cartLines.length > 0 && (
          <button type="button" className="ghost-button" onClick={clearCart}>
            {t('cart.clear')}
          </button>
        )}
      </div>

      {cartLines.length === 0 ? (
        <p className="empty-state">{t('cart.empty_state')}</p>
      ) : (
        <ul className="cart-lines">
          {cartLines.map((line) => (
            <li key={line.id}>
              <div>
                <p className="cart-item-name">{line.name}</p>
                <p className="cart-item-price">{currency.format(line.price)}</p>
              </div>
              <div className="cart-qty-controls">
                <button type="button" onClick={() => updateItem(line.id, line.quantity - 1)}>
                  −
                </button>
                <span>{line.quantity}</span>
                <button type="button" onClick={() => updateItem(line.id, line.quantity + 1)}>
                  +
                </button>
                <button type="button" className="ghost" onClick={() => removeItem(line.id)}>
                  {t('cart.remove')}
                </button>
              </div>
              <p className="cart-line-total">{currency.format(line.lineTotal)}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="totals">
        <div>
          <span>{t('cart.subtotal')}</span>
          <span>{currency.format(subtotal)}</span>
        </div>
        <div>
          <span>{t('cart.service_fee')}</span>
          <span>{currency.format(serviceFee)}</span>
        </div>
        <div className="totals-grand">
          <span>{t('cart.total')}</span>
          <span>{currency.format(total)}</span>
        </div>
      </div>
    </section>
  )
}

export default CartSummary
