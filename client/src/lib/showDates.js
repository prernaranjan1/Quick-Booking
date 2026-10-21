// "YYYY-MM-DD" in the viewer's local time zone
export const localDateKey = (dateTime) => {
  const date = new Date(dateTime)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Parses "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") would be UTC)
export const parseDateKey = (key) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// [{ showId, showDateTime }] -> { "YYYY-MM-DD": [{ time, showId }] }
export const groupShowsByDate = (shows) => {
  const groups = {}
  shows.forEach((show) => {
    const key = localDateKey(show.showDateTime)
    if (!groups[key]) groups[key] = []
    groups[key].push({ time: show.showDateTime, showId: show.showId })
  })
  return groups
}
