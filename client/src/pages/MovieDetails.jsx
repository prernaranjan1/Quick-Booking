import { useNavigate, useParams } from 'react-router-dom'
import { PlayCircleIcon, Heart } from 'lucide-react'
import { dummyDateTimeData, dummyShowsData } from '../assets/assets'
import BlurCircle from '../components/BlurCircle'
import { DateSelect } from '../components/DataSelect'
import MovieCard from '../components/MovieCard'
import Loading from '../components/Loading'

const MovieDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const show = dummyShowsData.find((item) => item._id === id)

 if (!show) {
  return <Loading />
}

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
        <img
          src={show.poster_path}
          alt={show.title}
          className="max-md:mx-auto rounded-xl h-104 max-w-70 object-cover"
        />

        <div className="relative flex flex-col gap-3">
          <BlurCircle top="-100px" left="-100px" />

          <p className="text-sm uppercase tracking-[0.2em] text-gray-400">
            {show.original_language}
          </p>

          <h1 className="text-4xl md:text-5xl font-semibold">
            {show.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <span>{new Date(show.release_date).getFullYear()}</span>
            <span>•</span>
            <span>{show.genres.map((genre) => genre.name).slice(0, 3).join(' | ')}</span>
            <span>•</span>
            <span>{Math.floor(show.runtime / 60)}h {show.runtime % 60}m</span>
          </div>

          <p className="max-w-xl text-gray-300">{show.overview}</p>

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-300">
            <span className="font-medium">Rating:</span>
            <span>{show.vote_average.toFixed(1)} / 10</span>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-4 mt-4">
        <button className="flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95">
          <PlayCircleIcon className="w-5 h-5" />
          Watch Trailer
        </button>

       <button
  type="button"
  onClick={() => {
    document.getElementById('dateSelect')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }}
  className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95"
>
  Buy Tickets
</button>

        <button className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95">
          <Heart className="w-5 h-5" />
        </button>
      </div>

      <p className="text-lg font-medium mt-20">
        Your Favorite Cast
      </p>

      <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
        <div className="flex items-center gap-4 w-max px-4">
          {show.casts.slice(0, 12).map((cast, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center"
            >
              <img
                src={cast.profile_path}
                alt=""
                className="rounded-full h-20 md:h-20 aspect-square object-cover"
              />

              <p className="font-medium text-xs mt-3">
                {cast.name}
              </p>
            </div>
          ))}
        </div>
      </div>
      <DateSelect dateTime={dummyDateTimeData} id={id} />

      <p className="text-lg font-medium mt-20 mb-8">
        You May Also Like
      </p>

      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {dummyShowsData.slice(0, 4).map((movie, index) => (
          <MovieCard key={index} movie={movie} />
        ))}
      </div>

      <div className="flex justify-center mt-20">
        <button
          onClick={() => {navigate('/movies');scrollTo(0,0)}}
          className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
        >
          Show more
        </button>
      </div>
    </div>
  )
}

export default MovieDetails