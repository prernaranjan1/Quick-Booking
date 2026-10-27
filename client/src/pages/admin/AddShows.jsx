import { useState } from 'react'
import { useAuth } from '@clerk/react'
import { CheckIcon, StarIcon, XIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import Loading from '../../components/Loading'
import ErrorMessage from '../../components/ErrorMessage'
import Title from '../../components/admin/Title'
import { kConverter } from '../../lib/kConverter'
import { currency } from '../../lib/currency'
import tmdbImage from '../../lib/tmdbImage'
import { apiRequest } from '../../lib/api'
import useApi from '../../hooks/useApi'

const AddShows = () => {
    const { getToken } = useAuth()
    const { data, error, loading, reload } = useApi('/api/show/now-playing', { auth: true })
    const nowPlayingMovies = data?.movies || []

    const [selectedMovie, setSelectedMovie] = useState(null)
    const [showDateTimes, setShowDateTimes] = useState([])
    const [dateTimeInput, setDateTimeInput] = useState('')
    const [showPrice, setShowPrice] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const handleDateTimeAdd = () => {
        if (!dateTimeInput) {
            toast.error('Please choose a date and time')
            return
        }

        // datetime-local is in the admin's local time; store as an exact instant
        const selectedDate = new Date(dateTimeInput)

        if (Number.isNaN(selectedDate.getTime())) {
            toast.error('Please choose a valid date and time')
            return
        }

        if (selectedDate.getTime() <= Date.now()) {
            toast.error('Show time must be in the future')
            return
        }

        const isoDateTime = selectedDate.toISOString()

        if (showDateTimes.includes(isoDateTime)) {
            toast.error('This time slot is already added')
            return
        }

        setShowDateTimes((prev) => [...prev, isoDateTime].sort())
        setDateTimeInput('')
    }

    const removeDateTime = (isoDateTime) => {
        setShowDateTimes((prev) => prev.filter((time) => time !== isoDateTime))
    }

    const handleAddShow = async () => {
        if (!selectedMovie) {
            toast.error('Select a movie before creating a show')
            return
        }

        const numericPrice = Number(showPrice)

        if (!showPrice || Number.isNaN(numericPrice) || numericPrice <= 0) {
            toast.error('Enter a valid show price')
            return
        }

        if (showDateTimes.length === 0) {
            toast.error('Add at least one date and time slot')
            return
        }

        setIsSaving(true)

        try {
            const result = await apiRequest('/api/show/add', {
                method: 'POST',
                token: await getToken(),
                body: {
                    movieId: selectedMovie.id,
                    showPrice: numericPrice,
                    showDateTimes
                }
            })

            toast.success(result.message)
            setSelectedMovie(null)
            setShowPrice('')
            setShowDateTimes([])
        } catch (err) {
            toast.error(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) return <Loading />

    if (error) {
        return <ErrorMessage message={`Could not load now playing movies: ${error.message}`} onRetry={reload} />
    }

    return (
        <>
            <Title text1="Add" text2="Shows" />
            <p className="mt-10 text-lg font-medium">Now Playing Movies</p>

            <div className="overflow-x-auto pb-4">
                <div className="group flex flex-wrap gap-4 mt-4 w-max">
                    {nowPlayingMovies.map((movie) => (
                        <div
                            key={movie.id}
                            className="relative max-w-40 cursor-pointer group-hover:not-hover:opacity-40 hover:-translate-y-1 transition duration-300"
                            onClick={() => setSelectedMovie(movie)}
                        >
                            <div className="relative rounded-lg overflow-hidden">
                                <img src={tmdbImage(movie.poster_path, 'w342')} alt={movie.title} className="w-full object-cover brightness-90" />
                                <div className="text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                                    <p className="flex items-center gap-1 text-gray-400">
                                        <StarIcon className="w-4 h-4 text-primary fill-primary" />
                                        {(movie.vote_average || 0).toFixed(1)}
                                    </p>
                                    <p className="text-gray-300">{kConverter(movie.vote_count)} Votes</p>
                                </div>
                            </div>

                            {selectedMovie?.id === movie.id && (
                                <div className="absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded">
                                    <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                                </div>
                            )}

                            <p className="font-medium truncate mt-1">{movie.title}</p>
                            <p className="text-gray-400 text-sm">{movie.release_date}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Show Details */}
            <div className="mt-8 max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Base Show Price (Silver)
                        </label>

                        <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">
                            <span className="px-4 text-gray-400">{currency}</span>
                            <input
                                type="number"
                                min="1"
                                placeholder="Enter show price"
                                value={showPrice}
                                onChange={(e) => setShowPrice(e.target.value)}
                                className="w-full bg-transparent px-2 py-3 outline-none"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Gold is 1.2×, Premium 1.5×. Weekend, evening and busy-show surcharges are added automatically.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Select Date and Time
                        </label>

                        <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">
                            <input
                                type="datetime-local"
                                value={dateTimeInput}
                                onChange={(e) => setDateTimeInput(e.target.value)}
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

                {showDateTimes.length > 0 && (
                    <div className="mt-6">
                        <p className="text-sm font-medium mb-2">Selected show times</p>
                        <div className="flex flex-wrap gap-2">
                            {showDateTimes.map((time) => (
                                <span key={time} className="flex items-center gap-2 border border-primary/40 px-3 py-1 rounded text-sm">
                                    {new Date(time).toLocaleString()}
                                    <XIcon
                                        className="w-4 h-4 text-red-400 cursor-pointer"
                                        onClick={() => removeDateTime(time)}
                                    />
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-start">
                    <button
                        type="button"
                        onClick={handleAddShow}
                        disabled={isSaving}
                        className="bg-primary px-7 py-3 rounded-lg text-sm font-medium hover:bg-primary/80 transition disabled:opacity-50"
                    >
                        {isSaving ? 'Adding...' : 'Add Show'}
                    </button>
                </div>
            </div>
        </>
    )
}

export default AddShows
