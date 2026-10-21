import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import { assets } from '../assets/assets'
import isoTimeFormat from '../lib/isoTimeFormat'
import { localDateKey, parseDateKey } from '../lib/showDates'
import { currency } from '../lib/currency'
import BlurCircle from '../components/BlurCircle'
import Loading from '../components/Loading'
import MovieNotFound from '../components/MovieNotFound'
import ErrorMessage from '../components/ErrorMessage'
import useApi from '../hooks/useApi'
import toast from 'react-hot-toast'

// [A, B, C, D] -> [[A, B], [C, D]]: two rows side by side
const pairRows = (rows) => {
  const pairs = []
  for (let i = 0; i < rows.length; i += 2) pairs.push(rows.slice(i, i + 2))
  return pairs
}

const SeatLayout = () => {
  const { id, date } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [selectedShowId, setSelectedShowId] = useState(location.state?.showId || null)
  const [selectedSeats, setSelectedSeats] = useState([])

  const movieRequest = useApi(`/api/show/movie/${encodeURIComponent(id)}`)
  const seatRequest = useApi(selectedShowId ? `/api/show/${selectedShowId}/seats` : null)

  if (movieRequest.loading) return <Loading />
  if (movieRequest.error?.status === 404) return <MovieNotFound />
  if (movieRequest.error) {
    return (
      <div className="pt-40">
        <ErrorMessage message="Could not load show times." onRetry={movieRequest.reload} />
      </div>
    )
  }

  const movie = movieRequest.data.movie
  const timings = movieRequest.data.shows.filter(
    (show) => localDateKey(show.showDateTime) === date
  )

  const seatData = seatRequest.data
  const unavailable = new Set([...(seatData?.booked || []), ...(seatData?.held || [])])
  const priceByRow = {}
  seatData?.categories.forEach((category) => {
    category.rows.forEach((row) => {
      priceByRow[row] = category.price
    })
  })
  const maxSeats = seatData?.layout.maxSeats || 10
  const total = selectedSeats.reduce((sum, seat) => sum + (priceByRow[seat[0]] || 0), 0)

  const selectShow = (showId) => {
    if (showId === selectedShowId) return
    setSelectedShowId(showId)
    setSelectedSeats([])
  }

  const handleSeatClick = (seatId) => {
    if (!selectedShowId) {
      return toast.error('Please select a time first')
    }

    if (unavailable.has(seatId)) return

    if (!selectedSeats.includes(seatId) && selectedSeats.length >= maxSeats) {
      return toast.error(`You can select up to ${maxSeats} seats`)
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    )
  }

  const renderSeats = (row) => (
    <div className="flex gap-2">
      {Array.from({ length: seatData.layout.seatsPerRow }, (_, i) => {
        const seatId = `${row}${i + 1}`
        const isTaken = unavailable.has(seatId)
        const isSelected = selectedSeats.includes(seatId)

        return (
          <button
            key={seatId}
            type="button"
            disabled={isTaken}
            title={isTaken ? 'Not available' : `${seatId} · ${currency}${priceByRow[row]}`}
            onClick={() => handleSeatClick(seatId)}
            className={`h-8 w-8 rounded border text-xs transition ${
              isTaken
                ? 'border-gray-700 bg-gray-700 text-gray-500 cursor-not-allowed'
                : isSelected
                  ? 'border-primary bg-primary text-white cursor-pointer'
                  : 'border-primary/60 hover:bg-primary/20 cursor-pointer'
            }`}
          >
            {seatId}
          </button>
        )
      })}
    </div>
  )

  const proceedToCheckout = () => {
    if (!selectedShowId) {
      return toast.error('Please select a time')
    }

    if (selectedSeats.length === 0) {
      return toast.error('Please select at least one seat')
    }

    navigate('/checkout', {
      state: { showId: selectedShowId, seats: selectedSeats, movieId: id, date }
    })
  }

  return (
    <div className="flex flex-col md:flex-row gap-10 px-6 md:px-16 lg:px-40 py-30 md:pt-50">

      {/* ================= AVAILABLE TIMINGS ================= */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
        <p className="text-lg font-semibold px-6">{movie.title}</p>
        <p className="text-sm text-gray-400 px-6 mt-1">
          {parseDateKey(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>

        <p className="text-sm font-semibold px-6 mt-6">Available Timings</p>

        <div className="mt-3 space-y-1">
          {timings.length === 0 && (
            <p className="px-6 text-sm text-gray-400">No shows on this date.</p>
          )}

          {timings.map((show) => (
            <div
              key={show.showId}
              onClick={() => selectShow(show.showId)}
              className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
                selectedShowId === show.showId
                  ? 'bg-primary text-white'
                  : 'hover:bg-primary/20'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              <p className="text-sm">{isoTimeFormat(show.showDateTime)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ================= SEAT SECTION ================= */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16 min-w-0">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        <h1 className="text-2xl font-semibold mb-4">Select your seat</h1>

        <img src={assets.screenImage} alt="screen" className="w-full max-w-[560px]" />
        <p className="text-gray-400 text-sm mb-8">SCREEN SIDE</p>

        {!selectedShowId && (
          <p className="text-gray-400 py-10">Choose a show time to see available seats.</p>
        )}

        {seatRequest.loading && <p className="text-gray-400 py-10">Loading seats...</p>}

        {seatRequest.error && (
          <ErrorMessage message="Could not load seats." onRetry={seatRequest.reload} />
        )}

        {seatData && (
          <>
            {seatData.factors.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {seatData.factors.map((factor) => (
                  <span
                    key={factor.label}
                    className="text-xs px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30"
                  >
                    {factor.label} +{factor.percent}%
                  </span>
                ))}
              </div>
            )}

            <div className="w-full max-w-[650px] overflow-x-auto">
              {seatData.categories.map((category) => (
                <div key={category.id} className="mb-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-primary/30" />
                    <span className="text-sm font-semibold text-primary">
                      {category.label.toUpperCase()} · {currency}{category.price}
                    </span>
                    <div className="h-px flex-1 bg-primary/30" />
                  </div>

                  <div className="flex flex-col gap-4 w-max mx-auto">
                    {pairRows(category.rows).map((pair) => (
                      <div key={pair.join('')} className="flex items-center justify-center gap-6">
                        {pair.map((row) => (
                          <div key={row}>{renderSeats(row)}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-primary/60" /> Available</span>
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-primary" /> Selected</span>
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-gray-700" /> Sold / on hold</span>
            </div>
          </>
        )}

        {/* ================= CHECKOUT ================= */}
        {selectedSeats.length > 0 && (
          <p className="mt-10 text-sm text-gray-300">
            {selectedSeats.join(', ')} · <span className="font-semibold text-white">{currency}{total}</span>
          </p>
        )}

        <button
          type="button"
          onClick={proceedToCheckout}
          className="flex items-center gap-2 mt-6 px-7 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default SeatLayout
