import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import { saveOrder } from '../services/typo3Api'
import { supabase, isSupabaseEnabled } from '../services/supabaseClient'

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID
const PAYPAL_ENV_FLAG = String(import.meta.env.VITE_ENABLE_PAYPAL ?? '').toLowerCase() === 'true'

const initialFormState = {
  name: '',
  email: '',
  fulfillment: 'pickup',
  notes: '',
  paymentMethod: 'paypal',
}

function CheckoutForm({ onOrderSaved }) {
  const { cartLines, subtotal, clearCart } = useCart()
  const [formData, setFormData] = useState(initialFormState)
  const [orderState, setOrderState] = useState({ sending: false, success: null, error: null })
  const [paypalReady, setPaypalReady] = useState(false)
  const [paypalError, setPaypalError] = useState(null)
  const paypalButtonsRef = useRef(null)

  const paypalEnabled = PAYPAL_ENV_FLAG && Boolean(PAYPAL_CLIENT_ID) && isSupabaseEnabled()
  const showPayPalButtons = paypalEnabled && formData.paymentMethod === 'paypal'

  const totals = useMemo(() => {
    const serviceFee = subtotal > 0 ? 1.5 : 0
    const deliveryFee = formData.fulfillment === 'delivery' ? 3 : 0
    const total = subtotal + serviceFee + deliveryFee
    return { subtotal, serviceFee, deliveryFee, total }
  }, [subtotal, formData.fulfillment])

  const canSubmit = subtotal > 0 && formData.name && formData.email

  useEffect(() => {
    if (!paypalEnabled) return

    if (window.paypal) {
      setPaypalReady(true)
      return
    }

    const existing = document.querySelector('script[data-paypal-sdk="true"]')
    if (existing) {
      existing.addEventListener('load', () => setPaypalReady(true), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&intent=CAPTURE`
    script.async = true
    script.dataset.paypalSdk = 'true'
    script.onload = () => setPaypalReady(true)
    script.onerror = () => setPaypalError('Failed to load PayPal. Please refresh or choose another method.')
    document.head.appendChild(script)
  }, [paypalEnabled])

  const handlePayPalApproval = useCallback(async (paypalOrderId) => {
    if (!supabase) {
      setOrderState({ sending: false, success: null, error: 'Supabase client missing for PayPal capture.' })
      return
    }

    const customerSnapshot = { ...formData }
    const cartSnapshot = cartLines.map((item) => ({ ...item }))
    const cartPayload = cartLines.map((item) => ({ id: item.id, quantity: item.quantity, price: item.price }))

    setOrderState({ sending: true, success: null, error: null })

    try {
      const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
        body: {
          orderId: paypalOrderId,
          customer: customerSnapshot,
          cart: cartPayload,
          totals,
        },
      })

      if (error) throw new Error(error.message ?? 'Failed to capture PayPal order')
      if (data?.error) throw new Error(data.error)

      clearCart()
      setFormData(initialFormState)

      const savedOrderId = data?.orderId ?? paypalOrderId
      if (onOrderSaved) {
        onOrderSaved(savedOrderId, {
          customer: customerSnapshot,
          cart: cartSnapshot,
          totals,
          payment: {
            provider: 'paypal',
            status: 'paid',
            reference: data?.paypalOrderId ?? paypalOrderId,
          },
        })
      }

      setOrderState({
        sending: false,
        success: `PayPal payment captured. Order ${savedOrderId} saved.`,
        error: null,
      })
    } catch (error) {
      console.error('PayPal capture failed', error)
      setOrderState({
        sending: false,
        success: null,
        error: error.message || 'PayPal capture failed. Please try again or choose another method.',
      })
    }
  }, [cartLines, clearCart, formData, onOrderSaved, totals])

  useEffect(() => {
    if (!showPayPalButtons || !paypalReady || typeof window === 'undefined' || !window.paypal) return

    const container = paypalButtonsRef.current
    if (!container) return

    container.innerHTML = ''

    const buttons = window.paypal.Buttons({
      style: { layout: 'vertical', shape: 'rect', height: 45 },
      onInit: (_, actions) => {
        if (canSubmit) actions.enable()
        else actions.disable()
      },
      onClick: (_, actions) => {
        if (!canSubmit) {
          setOrderState((prev) => ({
            ...prev,
            error: 'Please add your contact info and at least one dish before paying with PayPal.',
          }))
          return actions.reject ? actions.reject() : undefined
        }
        return undefined
      },
      createOrder: (_, actions) => actions.order.create({
        purchase_units: [
          {
            description: `Tulamia order for ${formData.name || 'Guest'}`,
            amount: {
              currency_code: 'EUR',
              value: totals.total.toFixed(2),
            },
          },
        ],
      }),
      onApprove: async (data) => {
        await handlePayPalApproval(data.orderID)
      },
      onError: (error) => {
        console.error('PayPal Buttons error', error)
        setOrderState({
          sending: false,
          success: null,
          error: 'PayPal checkout failed. Please try again or use another method.',
        })
      },
    })

    buttons.render(container)

    return () => {
      buttons.close()
    }
  }, [canSubmit, formData.name, handlePayPalApproval, paypalReady, showPayPalButtons, totals.total])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    const orderPayload = {
      customer: formData,
      cart: cartLines,
      totals,
      payment: {
        provider: formData.paymentMethod,
        status: 'pending',
      },
    }

    try {
      setOrderState({ sending: true, success: null, error: null })
      const orderId = await saveOrder(orderPayload)
      clearCart()
      setFormData(initialFormState)
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

        {showPayPalButtons && (
          <div className="paypal-section">
            {!paypalReady && !paypalError && <p className="status-banner">Loading PayPal…</p>}
            {paypalError && <p className="status-banner error">{paypalError}</p>}
            <div ref={paypalButtonsRef} />
          </div>
        )}

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
