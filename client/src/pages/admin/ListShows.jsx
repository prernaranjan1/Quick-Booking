import Loading from '../../components/Loading'
import ErrorMessage from '../../components/ErrorMessage'
import Title from '../../components/admin/Title'
import { currency } from '../../lib/currency'
import useApi from '../../hooks/useApi'

const ListShows = () => {
    const { data, error, loading, reload } = useApi('/api/admin/all-shows', { auth: true })
    const shows = data?.shows || []

    if (loading) return <Loading />
    if (error) return <ErrorMessage message="Could not load shows." onRetry={reload} />

    return (
        <>
            <Title text1="List" text2="Shows" />

            <div className="max-w-4xl mt-6 overflow-x-auto">
                <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
                    <thead>
                        <tr className="bg-primary/20 text-left text-white">
                            <th className="p-2 font-medium pl-5">Movie Name</th>
                            <th className="p-2 font-medium">Show Time</th>
                            <th className="p-2 font-medium">Base Price</th>
                            <th className="p-2 font-medium">Seats Sold</th>
                            <th className="p-2 font-medium">Earnings</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-light">
                        {shows.length === 0 && (
                            <tr><td colSpan="5" className="p-5 text-gray-400">No shows yet.</td></tr>
                        )}
                        {shows.map((show) => (
                            <tr key={show._id} className="border-b border-primary/10 bg-primary/5 even:bg-primary/10">
                                <td className="p-2 min-w-45 pl-5">{show.movie.title}</td>
                                <td className="p-2">{new Date(show.showDateTime).toLocaleString()}</td>
                                <td className="p-2">{currency}{show.showPrice}</td>
                                <td className="p-2">{show.totalBookings}</td>
                                <td className="p-2">{currency}{show.earnings}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}

export default ListShows
