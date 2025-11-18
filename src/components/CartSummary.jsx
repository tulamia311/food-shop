import { useCart } from '../context/CartContext'

const currency = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

function CartSummary() {
  const { cartLines, subtotal, updateItem, removeItem, clearCart } = useCart()
  const serviceFee = subtotal > 0 ? 1.5 : 0
  const total = subtotal + serviceFee

  return (
    <section className="cart-card">
      <div className="section-header">
        <h2>Your basket</h2>
        {cartLines.length > 0 && (
          <button type="button" className="ghost-button" onClick={clearCart}>
            Clear
          </button>
        )}
      </div>

      {cartLines.length === 0 ? (
        <p className="empty-state">Add something tasty to get started.</p>
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
                  Remove
                </button>
              </div>
              <p className="cart-line-total">{currency.format(line.lineTotal)}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="totals">
        <div>
          <span>Subtotal</span>
          <span>{currency.format(subtotal)}</span>
        </div>
        <div>
          <span>Service fee</span>
          <span>{currency.format(serviceFee)}</span>
        </div>
        <div className="totals-grand">
          <span>Total</span>
          <span>{currency.format(total)}</span>
        </div>
      </div>
    </section>
  )
}

export default CartSummary
