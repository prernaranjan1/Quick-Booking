import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import BlurCircle from './BlurCircle'

export const DateSelect = ({ dateTime, id }) => {
  const navigate = useNavigate()

  const dates = Object.keys(dateTime)
  const [selectedDate, setSelectedDate] = useState(dates[0] || '')
  const [startIndex, setStartIndex] = useState(0)

  const visibleDates = dates.slice(startIndex, startIndex + 4)

  const handlePrevious = () => {
    setStartIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setStartIndex((prev) =>
      Math.min(dates.length - 4, prev + 1)
    )
  }

  const handleBookNow = () => {
    if (!id || !selectedDate) return

    navigate(`/movies/${id}/date`, {
      state: { selectedDate }
    })
  }

  return (
    <div id="dateSelect" className="pt-30">
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-10 p-8 bg-primary/10 border border-primary/20 rounded-lg">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" left="-100px" />

        <div>
          <p className="text-lg font-semibold">
            Choose Date
          </p>

          <div className="flex items-center gap-6 text-sm mt-5">

            {/* Previous */}
            <button
              type="button"
              onClick={handlePrevious}
              disabled={startIndex === 0}
              className="cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon width={28} />
            </button>

            {/* Dates */}
            <span className="flex gap-4">
              {visibleDates.map((date) => {
                const isSelected = date === selectedDate
                const dateObject = new Date(date)

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer border transition ${
                      isSelected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-transparent border-gray-600 text-gray-200 hover:border-primary/80'
                    }`}
                  >
                    <span>
                      {dateObject.getDate()}
                    </span>

                    <span>
                      {dateObject.toLocaleDateString('en-US', {
                        month: 'short'
                      })}
                    </span>
                  </button>
                )
              })}
            </span>

            {/* Next */}
            <button
              type="button"
              onClick={handleNext}
              disabled={startIndex >= dates.length - 4}
              className="cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon width={28} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBookNow}
          className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
        >
          Book Now
        </button>
      </div>
    </div>
  )
}

export default DateSelect