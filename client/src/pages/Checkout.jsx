import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SignInButton, useAuth, useUser } from '@clerk/react'
import { MinusIcon, PlusIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import BlurCircle from '../components/BlurCircle'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import useApi from '../hooks/useApi'
import { apiRequest } from '../lib/api'
import { payForBooking } from '../lib/razorpay'
import { currency } from '../lib/currency'
import { dateFormat } from '../lib/dateFormat'

const Checkout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { showId, seats, movieId, date } = location.state || {}

  const seatRequest = useApi(showId ? `/api/show/${showId}/seats` : null)
  const snackRequest = useApi('/api/booking/snacks')
  const movieRequest = useApi(movieId ? `/api/show/movie/${encodeURIComponent(movieId)}` : null)

  const [quantities, setQuantities] = useState({})
  const [isPaying, setIsPaying] = useState(false)

  // Reached without choosing seats (e.g. page refresh)
  if (!showId || !Array.isArray(seats) || seats.length === 0) {
    return <Navigate to="/movies" replace />
  }

  if (!isLoaded || seatRequest.loading || snackRequest.loading || movieRequest.loading) {
    return <Loading />
  }

  if (seatRequest.error || snackRequest.error) {
    return (
      <div className="pt-40">
        <ErrorMessage
          message="Could not load checkout details."
          onRetry={() => { seatRequest.reload(); snackRequest.reload() }}
        />
      </div>
    )
  }

  const seatData = seatRequest.data
  const snacks = snackRequest.data.snacks
  const maxQuantity = snackRequest.data.maxQuantity
  const movie = movieRequest.data?.movie

  const categoryByRow = {}
  seatData.categories.forEach((category) => {
    category.rows.forEach((row) => {
      categoryByRow[row] = category
    })
  })

  const unavailable = new Set([...seatData.booked, ...seatData.held])
  const lostSeats = seats.filter((seat) => unavailable.has(seat))

  const seatLines = seats.map((seat) => ({ seat, category: categoryByRow[seat[0]] }))
  const ticketTotal = seatLines.reduce((sum, line) => sum + line.category.price, 0)
  const snackLines = snacks
    .filter((snack) => quantities[snack.id] > 0)
    .map((snack) => ({ ...snack, quantity: quantities[snack.id] }))
  const snackTotal = snackLines.reduce((sum, snack) => sum + snack.price * snack.quantity, 0)

  const changeQuantity = (snackId, change) => {
    setQuantities((prev) => {
      const next = Math.min(maxQuantity, Math.max(0, (prev[snackId] || 0) + change))
      return { ...prev, [snackId]: next }
    })
  }

  const backToSeats = () => {
    navigate(`/movies/${movieId}/${date}`, { state: { showId } })
  }

  const handlePay = async () => {
    setIsPaying(true)

    try {
      const token = await getToken()
      const booking = await apiRequest('/api/booking/create', {
        method: 'POST',
        token,
        body: {
          showId,
          seats,
          snacks: snackLines.map((snack) => ({ id: snack.id, quantity: snack.quantity }))
        }
      })

      const result = await payForBooking({
        bookingId: booking.bookingId,
        keyId: booking.razorpay.keyId,
        orderId: booking.razorpay.orderId,
        amount: booking.razorpay.amount,
        currency: booking.razorpay.currency,
        description: `${movie?.title || 'Movie'} · ${seats.join(', ')}`,
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || ''
        },
        getToken,
        onPaymentFailed: (message) => toast.error(message)
      })

      if (result === 'paid') {
        toast.success('Booking confirmed!')
        navigate(`/ticket/${booking.bookingId}`, { replace: true })
      } else {
        toast('Payment not finished. Your seats are held for 10 minutes; you can pay from My Bookings.')
        navigate('/my-bookings', { replace: true })
      }
    } catch (error) {
      if (error.status === 409 && !error.message.startsWith('Your payment')) {
        toast.error(error.message)
        backToSeats()
        return
      }

      toast.error(error.message)
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 pb-20 min-h-[80vh]">
      <BlurCircle top="100px" left="100px" />

      <h1 className="text-2xl font-semibold mb-8">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* ================= SNACKS ================= */}
        <div className="flex-1">
          <p className="text-lg font-medium mb-4">Add snacks</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {snacks.map((snack) => (
              <div
                key={snack.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition ${
                  quantities[snack.id] > 0 ? 'border-primary bg-primary/10' : 'border-gray-700 bg-gray-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">{snack.emoji}</span>
                  <div>
                    <p className="font-medium">{snack.name}</p>
                    <p className="text-sm text-gray-400">{currency}{snack.price}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Remove ${snack.name}`}
                    onClick={() => changeQuantity(snack.id, -1)}
                    disabled={!quantities[snack.id]}
                    className="p-1 rounded-full border border-gray-600 disabled:opacity-30 cursor-pointer"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="w-5 text-center">{quantities[snack.id] || 0}</span>
                  <button
                    type="button"
                    aria-label={`Add ${snack.name}`}
                    onClick={() => changeQuantity(snack.id, 1)}
                    disabled={(quantities[snack.id] || 0) >= maxQuantity}
                    className="p-1 rounded-full border border-gray-600 disabled:opacity-30 cursor-pointer"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= SUMMARY ================= */}
        <div className="w-full lg:w-96 h-max p-6 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-lg font-semibold">{movie?.title}</p>
          <p className="text-sm text-gray-400 mb-6">{dateFormat(seatData.show.showDateTime)}</p>

          <div className="space-y-2 text-sm">
            {seatLines.map((line) => (
              <div key={line.seat} className="flex justify-between">
                <span>{line.seat} <span className="text-gray-400">· {line.category.label}</span></span>
                <span>{currency}{line.category.price}</span>
              </div>
            ))}

            {seatData.factors.length > 0 && (
              <p className="text-xs text-gray-400">
                Includes {seatData.factors.map((factor) => `${factor.label.toLowerCase()} +${factor.percent}%`).join(', ')}
              </p>
            )}

            {snackLines.map((snack) => (
              <div key={snack.id} className="flex justify-between">
                <span>{snack.name} ×{snack.quantity}</span>
                <span>{currency}{snack.price * snack.quantity}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t border-primary/20 mt-4 pt-4 font-semibold">
            <span>Total</span>
            <span>{currency}{ticketTotal + snackTotal}</span>
          </div>

          {lostSeats.length > 0 && (
            <p className="mt-4 text-sm text-red-400">
              {lostSeats.join(', ')} {lostSeats.length === 1 ? 'is' : 'are'} no longer available.{' '}
              <button type="button" onClick={backToSeats} className="underline cursor-pointer">Choose again</button>
            </p>
          )}

          {isSignedIn ? (
            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying || lostSeats.length > 0 || seatData.show.isPast}
              className="w-full mt-6 py-3 rounded-full bg-primary hover:bg-primary-dull transition font-medium disabled:opacity-50 cursor-pointer"
            >
              {isPaying ? 'Processing...' : `Pay ${currency}${ticketTotal + snackTotal}`}
            </button>
          ) : (
            <SignInButton>
              <button
                type="button"
                className="w-full mt-6 py-3 rounded-full bg-primary hover:bg-primary-dull transition font-medium cursor-pointer"
              >
                Sign in to pay
              </button>
            </SignInButton>
          )}

          <p className="text-xs text-gray-400 mt-3">
            Seats are held for 10 minutes once you start paying. The final price is confirmed by the server.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Checkout
