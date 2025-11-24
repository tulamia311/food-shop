import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCart } from '../context/CartContext'
import { saveOrder } from '../services/dataApi'
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
  const { t } = useTranslation()
  const { cartLines, subtotal, clearCart } = useCart()
  const [formData, setFormData] = useState(initialFormState)
  const [orderState, setOrderState] = useState({ sending: false, success: null, error: null })
  const [paypalReady, setPaypalReady] = useState(false)
  const [paypalError, setPaypalError] = useState(null)
  const paypalButtonsRef = useRef(null)
  const supabaseAvailable = isSupabaseEnabled()
  const paypalEnabled = PAYPAL_ENV_FLAG && Boolean(PAYPAL_CLIENT_ID) && supabaseAvailable
  const showPayPalButtons = paypalEnabled && formData.paymentMethod === 'paypal'

  const totals = useMemo(() => {
    const serviceFee = subtotal > 0 ? 1.5 : 0
    const deliveryFee = formData.fulfillment === 'delivery' ? 3 : 0
    const total = subtotal + serviceFee + deliveryFee
    return { subtotal, serviceFee, deliveryFee, total }
  }, [subtotal, formData.fulfillment])

  const canSubmit = subtotal > 0 && formData.name && formData.email

  useEffect(() => {
    console.log('PayPal debug flags', {
      PAYPAL_ENV_FLAG,
      hasPaypalClientId: Boolean(PAYPAL_CLIENT_ID),
      supabaseAvailable,
      paypalEnabled,
      showPayPalButtons,
    })
  }, [supabaseAvailable, paypalEnabled, showPayPalButtons])

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
    // PayPal SDK expects lowercase `intent=capture` (uppercase CAPTURE causes a 400 SDK validation error).
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&intent=capture`
    script.async = true
    script.dataset.paypalSdk = 'true'
    script.onload = () => setPaypalReady(true)
    script.onerror = () => setPaypalError(t('checkout.error_paypal_failed'))
    document.head.appendChild(script)
  }, [paypalEnabled, t])

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
        error: error.message || t('checkout.error_paypal_failed'),
      })
    }
  }, [cartLines, clearCart, formData, onOrderSaved, totals, t])

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
            error: t('checkout.error_contact_info'),
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
          error: t('checkout.error_paypal_failed'),
        })
      },
    })

    buttons.render(container)

    return () => {
      buttons.close()
    }
  }, [canSubmit, formData.name, handlePayPalApproval, paypalReady, showPayPalButtons, totals.total, t])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    // If PayPal is selected and PayPal buttons are active, do not allow the
    // normal submit button to bypass the PayPal popup.
    if (showPayPalButtons && formData.paymentMethod === 'paypal') {
      setOrderState((prev) => ({
        ...prev,
        error: 'To pay with PayPal, please use the PayPal buttons instead of the "Place order" button.',
      }))
      return
    }

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
      setOrderState({ sending: false, success: `Order ${orderId} saved.`, error: null })
    } catch (error) {
      setOrderState({ sending: false, success: null, error: error.message })
    }
  }

  return (
    <section className="checkout-card">
      <h2>{t('checkout.title')}</h2>
      <form className="checkout-form" onSubmit={handleSubmit}>
        <label>
          {t('checkout.name')}
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={t('checkout.name_placeholder')}
            required
          />
        </label>
        <label>
          {t('checkout.email')}
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t('checkout.email_placeholder')}
            required
          />
        </label>
        <label>
          {t('checkout.fulfillment')}
          <select name="fulfillment" value={formData.fulfillment} onChange={handleChange}>
            <option value="pickup">{t('checkout.pickup')}</option>
            <option value="delivery">{t('checkout.delivery')}</option>
          </select>
        </label>
        <label>
          {t('checkout.payment_method')}
          <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
            <option value="cash">{t('checkout.payment_cash')}</option>
            <option value="paypal">{t('checkout.payment_paypal')}</option>
            <option value="maestro">{t('checkout.payment_maestro')}</option>
            <option value="credit-card">{t('checkout.payment_credit')}</option>
          </select>
        </label>
        {formData.paymentMethod === 'paypal' && !paypalEnabled && (
          <p className="status-banner error">
            {t('checkout.paypal_unavailable')}
            {!PAYPAL_ENV_FLAG && ' Reason: VITE_ENABLE_PAYPAL is not set to "true".'}
            {PAYPAL_ENV_FLAG && !PAYPAL_CLIENT_ID && ' Reason: VITE_PAYPAL_CLIENT_ID is missing.'}
            {PAYPAL_ENV_FLAG && PAYPAL_CLIENT_ID && !supabaseAvailable &&
              ' Reason: Supabase is not enabled (check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).'}
          </p>
        )}
        <label>
          {t('checkout.notes')}
          <textarea
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            placeholder={t('checkout.notes_placeholder')}
          />
        </label>

        {showPayPalButtons && (
          <div className="paypal-section">
            {!paypalReady && !paypalError && <p className="status-banner">{t('checkout.loading_paypal')}</p>}
            {paypalError && <p className="status-banner error">{paypalError}</p>}
            <div ref={paypalButtonsRef} />
          </div>
        )}

        {(!showPayPalButtons || formData.paymentMethod !== 'paypal') && (
          <button type="submit" className="primary" disabled={!canSubmit || orderState.sending}>
            {orderState.sending ? t('checkout.sending') : t('checkout.place_order')}
          </button>
        )}
        {orderState.success && <p className="status-banner success">{orderState.success}</p>}
        {orderState.error && <p className="status-banner error">{orderState.error}</p>}
      </form>
    </section>
  )
}

export default CheckoutForm
