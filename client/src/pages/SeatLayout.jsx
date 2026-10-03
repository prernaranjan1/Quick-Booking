import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import {
  assets,
  dummyDateTimeData,
  dummyShowsData
} from '../assets/assets'
import isoTimeFormat from '../lib/isoTimeFormat'
import BlurCircle from '../components/BlurCircle'
import Loading from '../components/Loading'
import toast from 'react-hot-toast'

const SeatLayout = () => {
  const groupRows = [
    ['A', 'B'],
    ['C', 'D'],
    ['E', 'F'],
    ['G', 'H'],
    ['I', 'J']
  ]

  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const selectedDate =
    location.state?.selectedDate ||
    Object.keys(dummyDateTimeData)[0]

  const movie = dummyShowsData.find(
    (item) => item._id === id
  )

  const [selectedSeats, setSelectedSeats] = useState([])
  const [selectedTime, setSelectedTime] = useState(null)

  // Select / unselect seat
  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      return toast.error('Please select time first')
    }

    if (
      !selectedSeats.includes(seatId) &&
      selectedSeats.length >= 5
    ) {
      return toast.error('You can only select 5 seats')
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    )
  }

  // Generate seats for a row
  const renderSeats = (row, count = 9) => {
    return (
      <div className="flex gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`

          return (
            <button
              key={seatId}
              type="button"
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded border border-primary/60 text-xs cursor-pointer transition ${
                selectedSeats.includes(seatId)
                  ? 'bg-primary text-white'
                  : 'hover:bg-primary/20'
              }`}
            >
              {seatId}
            </button>
          )
        })}
      </div>
    )
  }

  // Movie not found
  if (!movie) {
    return <Loading />
  }

  return (
    <div className="flex flex-col md:flex-row gap-10 px-6 md:px-16 lg:px-40 py-30 md:pt-50">

      {/* ================= AVAILABLE TIMINGS ================= */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">

        <p className="text-lg font-semibold px-6">
          Available Timings
        </p>

        <div className="mt-5 space-y-1">
          {(dummyDateTimeData[selectedDate] || []).map(
            (item) => (
              <div
                key={item.time}
                onClick={() => setSelectedTime(item)}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
                  selectedTime?.time === item.time
                    ? 'bg-primary text-white'
                    : 'hover:bg-primary/20'
                }`}
              >
                <ClockIcon className="w-4 h-4" />

                <p className="text-sm">
                  {isoTimeFormat(item.time)}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ================= SEAT SECTION ================= */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">

        <BlurCircle
          top="-100px"
          left="-100px"
        />

        <BlurCircle
          bottom="0"
          right="0"
        />

        <h1 className="text-2xl font-semibold mb-4">
          Select your seat
        </h1>

        {/* Screen */}
        <img
          src={assets.screenImage}
          alt="screen"
          className="w-full max-w-[560px]"
        />

        <p className="text-gray-400 text-sm mb-8">
          SCREEN SIDE
        </p>

        {/* ================= PREMIUM ================= */}
        <div className="w-full max-w-[650px]">

          <div className="flex items-center gap-4 mb-4">
            <div className="h-px flex-1 bg-primary/30" />

            <span className="text-sm font-semibold text-primary">
              PREMIUM
            </span>

            <div className="h-px flex-1 bg-primary/30" />
          </div>

          {/* A & B */}
          <div className="flex flex-col items-center gap-3 mb-10">
            {groupRows[0].map((row) => (
              <div key={row}>
                {renderSeats(row)}
              </div>
            ))}
          </div>

          {/* ================= SILVER ================= */}

          <div className="flex items-center gap-4 mb-5">
            <div className="h-px flex-1 bg-gray-500/30" />

            <span className="text-sm font-semibold text-gray-300">
              SILVER
            </span>

            <div className="h-px flex-1 bg-gray-500/30" />
          </div>

          {/* C-J */}

          <div className="flex flex-col">

            {/* C & D */}
            <div className="flex items-center justify-center gap-6">
              {renderSeats('C')}
              {renderSeats('D')}
            </div>

            {/* E & F */}
            <div className="flex items-center justify-center gap-6 mt-4">
              {renderSeats('E')}
              {renderSeats('F')}
            </div>

            {/* Extra space between E/F and G/H */}
            <div className="h-6" />

            {/* G & H */}
            <div className="flex items-center justify-center gap-6">
              {renderSeats('G')}
              {renderSeats('H')}
            </div>

            {/* I & J */}
            <div className="flex items-center justify-center gap-6 mt-4">
              {renderSeats('I')}
              {renderSeats('J')}
            </div>

          </div>

        </div>

        {/* ================= CHECKOUT ================= */}
        <button
          type="button"
          onClick={() => {
            if (!selectedTime) {
              return toast.error('Please select a time')
            }

            if (selectedSeats.length === 0) {
              return toast.error('Please select at least one seat')
            }

            navigate('/my-bookings', {
              state: {
                movie,
                selectedDate,
                selectedTime,
                selectedSeats
              }
            })
          }}
          className="flex items-center gap-2 mt-20 px-7 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout

          <ArrowRightIcon
            strokeWidth={3}
            className="w-4 h-4"
          />
        </button>

      </div>
    </div>
  )
}

export default SeatLayout