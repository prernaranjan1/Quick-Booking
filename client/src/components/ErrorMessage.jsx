const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-gray-300">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export default ErrorMessage
