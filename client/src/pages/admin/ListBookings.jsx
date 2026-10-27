import Loading from '../../components/Loading'
import ErrorMessage from '../../components/ErrorMessage'
import Title from '../../components/admin/Title'
import { dateFormat } from '../../lib/dateFormat'
import { currency } from '../../lib/currency'
import useApi from '../../hooks/useApi'

const ListBookings = () => {
    const { data, error, loading, reload } = useApi('/api/admin/all-bookings', { auth: true })
    const bookings = data?.bookings || []

    if (loading) return <Loading />
    if (error) return <ErrorMessage message="Could not load bookings." onRetry={reload} />

    return (
        <>
            <Title text1="List" text2="Bookings" />

            <div className="max-w-4xl mt-6 overflow-x-auto">
                <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
                    <thead>
                        <tr className="bg-primary/20 text-left text-white">
                            <th className="p-2 font-medium pl-5">User Name</th>
                            <th className="p-2 font-medium">Movie Name</th>
                            <th className="p-2 font-medium">Show Time</th>
                            <th className="p-2 font-medium">Seats</th>
                            <th className="p-2 font-medium">Snacks</th>
                            <th className="p-2 font-medium">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-light">
                        {bookings.length === 0 && (
                            <tr><td colSpan="6" className="p-5 text-gray-400">No paid bookings yet.</td></tr>
                        )}
                        {bookings.map((item) => (
                            <tr key={item._id} className="border-b border-primary/20 bg-primary/5 even:bg-primary/10">
                                <td className="p-2 min-w-45 pl-5">{item.user.name}</td>
                                <td className="p-2">{item.show?.movie.title || 'Deleted show'}</td>
                                <td className="p-2">{item.show ? dateFormat(item.show.showDateTime) : '-'}</td>
                                <td className="p-2">{item.seats.map((seat) => seat.seat).join(', ')}</td>
                                <td className="p-2">
                                    {item.snacks.length
                                        ? item.snacks.map((snack) => `${snack.name} ×${snack.quantity}`).join(', ')
                                        : '-'}
                                </td>
                                <td className="p-2">{currency}{item.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}

export default ListBookings
