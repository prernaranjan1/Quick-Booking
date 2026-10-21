import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import useApi from '../hooks/useApi'

const Movies = () => {
  const { data, error, loading, reload } = useApi('/api/show/all')
  const movies = data?.movies || []

  if (loading) return <Loading />

  return (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle />

      <h1 className="text-lg font-medium my-4">
        Now Showing
      </h1>

      {error ? (
        <ErrorMessage message="Could not load movies." onRetry={reload} />
      ) : movies.length === 0 ? (
        <p className="text-gray-400 py-16 text-center">No shows are scheduled right now. Check back soon.</p>
      ) : (
        <div className="flex flex-wrap max-sm:justify-center gap-8">
          {movies.map((movie) => (
            <MovieCard
              key={movie.tmdbId}
              movie={movie}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Movies
