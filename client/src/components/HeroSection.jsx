import { CalendarIcon, ClockIcon, ArrowRight } from 'lucide-react'
import { assets, dummyShowsData } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {
  const navigate = useNavigate()
  const movie = dummyShowsData[0]

  const movieGenres = movie.genres.slice(0, 3).map((genre) => genre.name).join(' | ')
  const movieRuntime = `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`

  return (
    <div
      className="flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-cover bg-center h-screen"
      style={{ backgroundImage: `url(${assets.backgroundImage})` }}
    >
      <h1 className="text-5xl md:text-[70px] md:leading-[1.1] font-semibold max-w-[1100px]">
        {movie.title}
      </h1>

      <div className="flex items-center gap-4 text-gray-300">
        <span>{movieGenres}</span>

        <div className="flex items-center gap-1">
          <CalendarIcon className="w-4 h-4" />
          {new Date(movie.release_date).getFullYear()}
        </div>

        <div className="flex items-center gap-1">
          <ClockIcon className="w-4 h-4" />
          {movieRuntime}
        </div>
      </div>

      <p className="max-w-md text-gray-300">{movie.overview}</p>

      <button
        onClick={() => navigate('/movies')}
        className="flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
      >
        Explore Movies
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )
}

export default HeroSection