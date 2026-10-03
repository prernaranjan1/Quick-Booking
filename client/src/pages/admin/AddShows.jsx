import React, { useEffect, useState } from 'react'
import { CalendarClockIcon, StarIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { dummyShowsData } from '../../assets/assets'
import Loading from '../../components/Loading'
import Title from '../../components/admin/Title'
import { kConverter } from '../../lib/kConverter'

const AddShows = () => {

    const currency = import.meta.env.VITE_CURRENCY || '$'

    const [nowPlayingMovies, setNowPlayingMovies] = useState([])
    const [selectedMovie, setSelectedMovie] = useState(null)
    const [dateTimeSelection, setDateTimeSelection] = useState({})
    const [dateTimeInput, setDateTimeInput] = useState('')
    const [showPrice, setShowPrice] = useState('')
    const [addedShows, setAddedShows] = useState([])

    const fetchNowPlayingMovies = async () => {
        setNowPlayingMovies(dummyShowsData)
    }

    const handleDateTimeAdd = () => {
        if (!selectedMovie) {
            toast.error('Please select a movie first')
            return
        }

        if (!dateTimeInput) {
            toast.error('Please choose a date and time')
            return
        }

        const selectedDate = new Date(dateTimeInput)

        if (Number.isNaN(selectedDate.getTime())) {
            toast.error('Please choose a valid date and time')
            return
        }

        const isoDateTime = selectedDate.toISOString()
        const dateKey = selectedDate.toISOString().split('T')[0]

        setDateTimeSelection((prev) => {
            const existingTimes = prev[dateKey] || []

            if (existingTimes.some((time) => time === isoDateTime)) {
                toast.error('This time slot is already added')
                return prev
            }

            return {
                ...prev,
                [dateKey]: [...existingTimes, isoDateTime]
            }
        })

        setDateTimeInput('')
    }

    const handleAddShow = () => {
        if (!selectedMovie) {
            toast.error('Select a movie before creating a show')
            return
        }

        const numericPrice = Number(showPrice)

        if (!showPrice || Number.isNaN(numericPrice) || numericPrice <= 0) {
            toast.error('Enter a valid show price')
            return
        }

        const totalSlots = Object.values(dateTimeSelection).reduce(
            (sum, times) => sum + times.length,
            0
        )

        if (totalSlots === 0) {
            toast.error('Add at least one date and time slot')
            return
        }

        const newShow = {
            _id: `${selectedMovie.id}-${Date.now()}`,
            movie: selectedMovie,
            showDateTime: Object.values(dateTimeSelection).flat()[0],
            showPrice: numericPrice,
            occupiedSeats: {}
        }

        setAddedShows((prev) => [newShow, ...prev])
        setSelectedMovie(null)
        setShowPrice('')
        setDateTimeSelection({})
        toast.success('Show added successfully')
    }

    useEffect(() => {
        fetchNowPlayingMovies()
    }, [])

    return nowPlayingMovies.length > 0 ? (
        <>
            <Title text1="Add" text2="Shows" />
            <p className="mt-10 text-lg font-medium">Now Playing Movies</p>

            <div className="overflow-x-auto pb-4">
                <div className="group flex flex-wrap gap-4 mt-4 w-max">
                    {nowPlayingMovies.map((movie) => (
                        <div
                            key={movie.id}
                            className={`relative max-w-40 cursor-pointer group-hover:not-hover:opacity-40 hover:-translate-y-1 transition duration-300 ${selectedMovie?.id === movie.id ? 'ring-2 ring-primary rounded-lg' : ''}`}
                            onClick={() => setSelectedMovie(movie)}
                        >
                            <div className="relative rounded-lg overflow-hidden">
                                <img src={movie.poster_path} alt={movie.title} className="w-full object-cover brightness-90" />
                                <div className="text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                                    <p className="flex items-center gap-1 text-gray-400">
                                        <StarIcon className="w-4 h-4 text-primary fill-primary" />
                                        {movie.vote_average.toFixed(1)}
                                    </p>
                                    <p className="text-gray-300">{kConverter(movie.vote_count)} Votes</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {selectedMovie && (
                <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-4 max-w-xl">
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Selected movie</p>
                    <div className="mt-3 flex items-center gap-4">
                        <img src={selectedMovie.poster_path} alt={selectedMovie.title} className="h-24 w-18 rounded-md object-cover" />
                        <div>
                            <h3 className="text-lg font-medium">{selectedMovie.title}</h3>
                            <p className="text-sm text-gray-400">{selectedMovie.release_date}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Show Details */}
            <div className="mt-8 max-w-5xl">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Show Price */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Show Price
                        </label>

                        <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">
                            <span className="px-4 text-gray-400">
                                $
                            </span>

                            <input
                                type="number"
                                placeholder="Enter show price"
                                value={showPrice}
                                onChange={(e) => setShowPrice(e.target.value)}
                                className="w-full bg-transparent px-2 py-3 outline-none"
                            />
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Select Date and Time
                        </label>

                        <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">

                            <input
                                type="datetime-local"
                                value={dateTimeInput}
                                onChange={(e) =>
                                    setDateTimeInput(e.target.value)
                                }
                                className="flex-1 bg-transparent px-3 py-3 outline-none"
                            />

                            <button
                                type="button"
                                onClick={handleDateTimeAdd}
                                className="bg-primary px-5 py-3 text-sm font-medium hover:bg-primary/80 transition"
                            >
                                Add Time
                            </button>

                        </div>
                    </div>

                </div>

                {/* Add Show */}
                <div className="mt-6 flex justify-start">
                    <button
                        type="button"
                        onClick={handleAddShow}
                        className="bg-primary px-7 py-3 rounded-lg text-sm font-medium hover:bg-primary/80 transition"
                    >
                        Add Show
                    </button>
                </div>

            </div>

            {addedShows.length > 0 && (
                <div className="mt-8 max-w-xl">
                    <p className="text-lg font-medium mb-3">Recently Added Shows</p>
                    <div className="space-y-3">
                        {addedShows.map((show) => (
                            <div key={show._id} className="rounded-md border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium">{show.movie.title}</p>
                                    <p className="text-xs text-gray-400">{new Date(show.showDateTime).toLocaleString()}</p>
                                </div>
                                <p className="text-sm font-medium">{currency} {show.showPrice}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    ) : <Loading />
}

export default AddShows