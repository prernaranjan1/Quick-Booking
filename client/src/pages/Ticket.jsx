import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { PrinterIcon } from 'lucide-react'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import useApi from '../hooks/useApi'
import { currency } from '../lib/currency'
import { dateFormat } from '../lib/dateFormat'
import tmdbImage from '../lib/tmdbImage'

const shortId = (id) => String(id).slice(-8).toUpperCase()

const Ticket = () => {
  const { bookingId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const { data, error, loading, reload } = useApi(
    isSignedIn ? `/api/booking/${encodeURIComponent(bookingId)}` : null,
    { auth: true }
  )

  if (!isLoaded || loading) return <Loading />

  if (!isSignedIn) {
    return <ErrorMessage message="Sign in to view this ticket." />
  }

  if (error) {
    return (
      <div className="pt-40">
        <ErrorMessage message={error.status === 404 ? 'Ticket not found.' : 'Could not load the ticket.'} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    )
  }

  const booking = data.booking
  const movie = booking.show?.movie

  if (booking.status !== 'paid') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[80vh] px-6 text-center">
        <p className="text-gray-300">
          {booking.status === 'pending'
            ? 'This booking is waiting for payment.'
            : booking.status === 'refund_required'
              ? 'Your payment came in after the seats were released. A refund is pending.'
              : 'This booking was not completed.'}
        </p>
        <Link to="/my-bookings" className="px-8 py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium">
          Go to My Bookings
        </Link>
      </div>
    )
  }

  return (
    <div className="px-6 pt-30 md:pt-40 pb-20 print:p-0">
      <div className="max-w-xl mx-auto rounded-2xl overflow-hidden border border-primary/30 bg-primary/5 print:border-black print:bg-white print:text-black">
        {movie?.backdrop_path && (
          <img
            src={tmdbImage(movie.backdrop_path, 'w780')}
            alt=""
            className="w-full h-40 object-cover print:h-32"
          />
        )}

        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Movie Ticket</p>
          <h1 className="text-2xl font-semibold mt-1">{movie?.title || 'Movie'}</h1>
          <p className="text-gray-400 print:text-gray-700 mt-1">
            {booking.show ? dateFormat(booking.show.showDateTime) : ''}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <p className="text-gray-400 print:text-gray-600">Booking ID</p>
              <p className="font-mono font-semibold text-lg">{shortId(booking._id)}</p>
            </div>
            <div>
              <p className="text-gray-400 print:text-gray-600">Seats</p>
              <p className="font-semibold">{booking.seats.map((seat) => seat.seat).join(', ')}</p>
            </div>
          </div>

          <div className="border-t border-dashed border-primary/30 print:border-gray-400 my-6" />

          <div className="space-y-1 text-sm">
            {booking.seats.map((seat) => (
              <div key={seat.seat} className="flex justify-between">
                <span>{seat.seat} · {seat.category.charAt(0) + seat.category.slice(1).toLowerCase()}</span>
                <span>{currency}{seat.price}</span>
              </div>
            ))}
            {booking.snacks.map((snack) => (
              <div key={snack.id} className="flex justify-between">
                <span>{snack.name} ×{snack.quantity}</span>
                <span>{currency}{snack.price * snack.quantity}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2">
              <span>Total paid</span>
              <span>{currency}{booking.amount}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            Payment ID: {booking.razorpayPaymentId} · Show this ticket at the entrance.
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-8 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        >
          <PrinterIcon className="w-4 h-4" />
          Print / Save PDF
        </button>
        <Link to="/my-bookings" className="px-6 py-2 border border-gray-600 rounded-full font-medium">
          My Bookings
        </Link>
      </div>
    </div>
  )
}

export default Ticket
