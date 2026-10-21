import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignInButton, useAuth, useUser } from '@clerk/react'
import toast from 'react-hot-toast'
import BlurCircle from '../components/BlurCircle'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import useApi from '../hooks/useApi'
import { apiRequest } from '../lib/api'
import { payForBooking } from '../lib/razorpay'
import { currency } from '../lib/currency'
import { dateFormat } from '../lib/dateFormat'
import tmdbImage from '../lib/tmdbImage'
import timeFormat from '../lib/timeformat'

const STATUS_LABELS = {
  paid: { text: 'Confirmed', className: 'bg-green-500/15 text-green-400' },
  pending: { text: 'Awaiting payment', className: 'bg-yellow-500/15 text-yellow-400' },
  expired: { text: 'Expired', className: 'bg-gray-500/20 text-gray-400' },
  refund_required: { text: 'Refund pending', className: 'bg-red-500/15 text-red-400' }
}

const minutesLeft = (expiresAt) =>
  Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000))

const MyBookings = () => {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { data, error, loading, reload } = useApi(isSignedIn ? '/api/booking/my' : null, { auth: true })
  const [busyId, setBusyId] = useState(null)

  if (!isLoaded || loading) return <Loading />

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[80vh] px-6 text-center">
        <p className="text-gray-300">Sign in to see your bookings.</p>
        <SignInButton>
          <button className="px-8 py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer">
            Sign in
          </button>
        </SignInButton>
      </div>
    )
  }

  const bookings = data?.bookings || []

  const payNow = async (item) => {
    setBusyId(item._id)

    try {
      const token = await getToken()
      const { booking, razorpayKeyId } = await apiRequest(`/api/booking/${item._id}`, { token })

      if (booking.status !== 'pending') {
        toast.error('This booking can no longer be paid.')
        reload()
        return
      }

      const result = await payForBooking({
        bookingId: booking._id,
        keyId: razorpayKeyId,
        orderId: booking.razorpayOrderId,
        amount: booking.amount * 100,
        currency: 'INR',
        description: `${booking.show?.movie?.title || 'Movie'} · ${booking.seats.map((seat) => seat.seat).join(', ')}`,
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || ''
        },
        getToken,
        onPaymentFailed: (message) => toast.error(message)
      })

      if (result === 'paid') {
        toast.success('Booking confirmed!')
        navigate(`/ticket/${booking._id}`)
      }
    } catch (err) {
      toast.error(err.message)
      reload()
    } finally {
      setBusyId(null)
    }
  }

  const cancel = async (item) => {
    setBusyId(item._id)

    try {
      await apiRequest(`/api/booking/${item._id}/cancel`, { method: 'POST', token: await getToken() })
      toast.success('Booking cancelled and seats released.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
      reload()
    }
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh] overflow-hidden">
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      <h1 className="text-lg font-semibold mb-4">My Bookings</h1>

      {error && <ErrorMessage message="Could not load your bookings." onRetry={reload} />}

      {!error && bookings.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-6 py-10 text-center text-gray-300">
          You have no bookings yet.
        </div>
      )}

      {bookings.map((item) => {
        const movie = item.show?.movie
        const status = STATUS_LABELS[item.status] || STATUS_LABELS.expired

        return (
          <div
            key={item._id}
            className="flex flex-col md:flex-row justify-between bg-primary/10 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl"
          >
            <div className="flex flex-col md:flex-row">
              {movie && (
                <img
                  src={tmdbImage(movie.backdrop_path || movie.poster_path, 'w500')}
                  alt={movie.title}
                  className="md:max-w-45 aspect-video h-auto object-cover rounded"
                />
              )}

              <div className="flex flex-col p-4">
                <p className="text-lg font-semibold">{movie?.title || 'Movie unavailable'}</p>
                {movie?.runtime > 0 && <p className="text-gray-400 text-sm">{timeFormat(movie.runtime)}</p>}
                <p className="text-gray-400 text-sm mt-auto">
                  {item.show ? dateFormat(item.show.showDateTime) : 'Show removed'}
                </p>
                <span className={`mt-2 w-max text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                  {status.text}
                  {item.status === 'pending' && ` · ${minutesLeft(item.expiresAt)} min left`}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:items-end md:text-right justify-between p-4 gap-3">
              <div className="flex items-center gap-3">
                <p className="text-2xl font-semibold">{currency}{item.amount}</p>

                {item.status === 'pending' && (
                  <>
                    <button
                      onClick={() => payNow(item)}
                      disabled={busyId === item._id}
                      className="bg-primary px-4 py-1.5 text-sm rounded-full font-medium cursor-pointer hover:bg-primary-dull transition disabled:opacity-50"
                    >
                      Pay Now
                    </button>
                    <button
                      onClick={() => cancel(item)}
                      disabled={busyId === item._id}
                      className="px-3 py-1.5 text-sm rounded-full border border-gray-600 cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {item.status === 'paid' && (
                  <button
                    onClick={() => navigate(`/ticket/${item._id}`)}
                    className="bg-primary px-4 py-1.5 text-sm rounded-full font-medium cursor-pointer hover:bg-primary-dull transition"
                  >
                    View Ticket
                  </button>
                )}
              </div>

              <div className="text-sm">
                <p>
                  <span className="text-gray-400">Seats:</span>{' '}
                  {item.seats.map((seat) => seat.seat).join(', ')}
                </p>
                {item.snacks.length > 0 && (
                  <p>
                    <span className="text-gray-400">Snacks:</span>{' '}
                    {item.snacks.map((snack) => `${snack.name} ×${snack.quantity}`).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MyBookings
