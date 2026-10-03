import { useLocation } from 'react-router-dom'
import { dummyBookingData } from '../assets/assets'
import BlurCircle from '../components/BlurCircle'
import { dateFormat } from '../lib/dateFormat'

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY || '$'
  const location = useLocation()

  const selectedBooking = location.state?.movie
    ? {
        _id: `booking-${location.state.movie._id}-${location.state.selectedDate}-${location.state.selectedTime?.time || 'time'}`,
        user: { name: 'Guest' },
        show: {
          _id: location.state.movie._id,
          movie: location.state.movie,
          showDateTime: location.state.selectedTime?.time || location.state.selectedDate,
          showPrice: 59,
        },
        amount: (location.state.selectedSeats?.length || 0) * 59,
        bookedSeats: location.state.selectedSeats || [],
        isPaid: true,
      }
    : null

  const bookings = selectedBooking ? [selectedBooking, ...dummyBookingData] : dummyBookingData

  const renderBookings = () => {
    if (!bookings || bookings.length === 0) {
      return (
        <div className="mt-8 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-6 py-10 text-center text-gray-300">
          You have no bookings yet.
        </div>
      )
    }

    return bookings.map((item, index) => {
      const movie = item?.show?.movie || item?.movie || null
      const bookingDate = item?.show?.showDateTime || item?.showDateTime || null
      const bookedSeats = item?.bookedSeats || []
      const amount = item?.amount || 0

      if (!movie) return null

      return (
        <div
          key={index}
          className="flex flex-col md:flex-row justify-between bg-primary/10 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl"
        >
          <div className="flex flex-col md:flex-row">
            <img
              src={movie.poster_path}
              alt={movie.title}
              className="md:max-w-45 aspect-video h-auto object-cover rounded"
            />

            <div className="flex flex-col p-4">
              <p className="text-lg font-semibold">{movie.title}</p>

              <p className="text-gray-400 text-sm mt-auto">
                Runtime: {movie.runtime} min
              </p>

              <p className="text-gray-400 text-sm mt-2">
                {bookingDate ? dateFormat(bookingDate) : 'Date not available'}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:items-end md:text-right justify-between p-4">
            <div className="flex items-center gap-4">
              <p className="text-2xl font-semibold mb-3">
                {currency}{amount}
              </p>

              {!item?.isPaid && (
                <button className="bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer hover:bg-primary-dull transition">
                  Pay Now
                </button>
              )}
            </div>

            <div className="text-sm">
              <p>
                <span className="text-gray-400">Total Tickets:</span>{' '}
                {bookedSeats.length}
              </p>

              <p>
                <span className="text-gray-400">Seats:</span>{' '}
                {bookedSeats.length ? bookedSeats.join(', ') : 'Not assigned'}
              </p>
            </div>
          </div>
        </div>
      )
    })
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh] overflow-hidden">
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      <h1 className="text-lg font-semibold mb-4">My Bookings</h1>
      {renderBookings()}
    </div>
  )
}

export default MyBookings