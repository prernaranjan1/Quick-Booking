import { useNavigate } from 'react-router-dom'

const MovieNotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center gap-6 h-[80vh] px-6 text-center">
      <h1 className="text-3xl font-medium">Movie not found</h1>
      <p className="text-gray-400">
        This movie may no longer be showing.
      </p>
      <button
        type="button"
        onClick={() => navigate('/movies')}
        className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
      >
        Browse Movies
      </button>
    </div>
  )
}

export default MovieNotFound
