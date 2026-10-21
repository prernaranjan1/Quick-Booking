import { apiRequest } from './api'

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'
let scriptPromise = null

// Loads Razorpay Checkout once
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve()

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.onload = () => resolve()
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('Could not load the payment window. Check your connection.'))
      }
      document.body.appendChild(script)
    })
  }

  return scriptPromise
}

// Opens Razorpay Checkout for a booking and verifies the payment on the server.
// Resolves to 'paid' or 'dismissed'; rejects if payment or verification fails.
// onPaymentFailed is called for a failed attempt; the window stays open so the user can retry.
export const payForBooking = async ({ bookingId, keyId, orderId, amount, currency, description, prefill, getToken, onPaymentFailed }) => {
  await loadRazorpay()

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount,
      currency,
      name: 'Quick Booking',
      description,
      prefill,
      theme: { color: '#F84565' },
      handler: async (response) => {
        try {
          await apiRequest('/api/booking/verify', {
            method: 'POST',
            token: await getToken(),
            body: { bookingId, ...response }
          })
          resolve('paid')
        } catch (error) {
          reject(error)
        }
      },
      modal: {
        ondismiss: () => resolve('dismissed')
      }
    })

    checkout.on('payment.failed', (response) => {
      onPaymentFailed?.(response.error?.description || 'Payment failed. Please try again.')
    })

    checkout.open()
  })
}
