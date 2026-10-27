// TMDB returns image paths like "/abc.jpg"; older dummy data uses full URLs
const tmdbImage = (path, size = 'original') => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export default tmdbImage
