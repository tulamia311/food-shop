import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { saveOrder } from '../services/typo3Api'

function CheckoutForm({ onOrderSaved }) {
  const { cartLines, subtotal, clearCart } = useCart()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    fulfillment: 'pickup',
    notes: '',
    paymentMethod: 'paypal',
  })
  const [orderState, setOrderState] = useState({ sending: false, success: null, error: null })

  const canSubmit = subtotal > 0 && formData.name && formData.email

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    const serviceFee = subtotal > 0 ? 1.5 : 0
    const deliveryFee = formData.fulfillment === 'delivery' ? 3 : 0
    const total = subtotal + serviceFee + deliveryFee

    const orderPayload = {
      customer: formData,
      cart: cartLines,
      totals: {
        subtotal,
        serviceFee,
        deliveryFee,
        total,
      },
      payment: {
        provider: formData.paymentMethod,
        status: 'pending',
      },
    }

    try {
      setOrderState({ sending: true, success: null, error: null })
      const orderId = await saveOrder(orderPayload)
      clearCart()
      setFormData({ name: '', email: '', fulfillment: 'pickup', notes: '', paymentMethod: 'paypal' })
      if (onOrderSaved) {
        onOrderSaved(orderId, orderPayload)
      }
      setOrderState({ sending: false, success: `Order ${orderId} saved. PayPal coming soon.`, error: null })
    } catch (error) {
      setOrderState({ sending: false, success: null, error: error.message })
    }
  }

  return (
    <section className="checkout-card">
      <h2>Checkout</h2>
      <form className="checkout-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Guest name"
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="contact@example.com"
            required
          />
        </label>
        <label>
          Fulfillment
          <select name="fulfillment" value={formData.fulfillment} onChange={handleChange}>
            <option value="pickup">Pickup (15 min)</option>
            <option value="delivery">Delivery (+€3)</option>
          </select>
        </label>
        <label>
          Payment method
          <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
            <option value="cash">Cash</option>
            <option value="paypal">PayPal</option>
            <option value="maestro">Maestro card</option>
            <option value="credit-card">Credit card</option>
          </select>
        </label>
        <label>
          Notes
          <textarea
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            placeholder="No onions, extra sesame, etc."
          />
        </label>

        <button type="submit" className="primary" disabled={!canSubmit || orderState.sending}>
          {orderState.sending ? 'Sending…' : 'Place order'}
        </button>
        {orderState.success && <p className="status-banner success">{orderState.success}</p>}
        {orderState.error && <p className="status-banner error">{orderState.error}</p>}
      </form>
    </section>
  )
}

export default CheckoutForm
