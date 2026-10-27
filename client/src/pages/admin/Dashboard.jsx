import { ChartLineIcon, CircleDollarSignIcon, PlayCircleIcon, StarIcon, UsersIcon } from 'lucide-react'
import Loading from '../../components/Loading'
import ErrorMessage from '../../components/ErrorMessage'
import useApi from '../../hooks/useApi'
import tmdbImage from '../../lib/tmdbImage'
import { currency } from '../../lib/currency'
import { dateFormat } from '../../lib/dateFormat'
import Title from '../../components/admin/Title'
import BlurCircle from '../../components/BlurCircle'

const Dashboard = () => {

    const { data, error, loading, reload } = useApi('/api/admin/dashboard', { auth: true })
    const dashboardData = data?.dashboardData || {
        totalBookings: 0,
        totalRevenue: 0,
        activeShows: [],
        totalUser: 0
    }

    const dashboardCards = [
        { title: "Total Bookings", value: dashboardData.totalBookings || "0", icon: ChartLineIcon },
        { title: "Total Revenue", value: currency + (dashboardData.totalRevenue || "0"), icon: CircleDollarSignIcon },
        { title: "Active Shows", value: dashboardData.activeShows.length || "0", icon: PlayCircleIcon },
        { title: "Total Users", value: dashboardData.totalUser || "0", icon: UsersIcon }
    ]

    if (error) return <ErrorMessage message="Could not load the dashboard." onRetry={reload} />

    return !loading ? (
        <>
            <Title text1="Admin" text2="Dashboard" />

            <div className="flex flex-wrap gap-4 mt-6">
                {dashboardCards.map((card, index) => (
                    <div key={index} className="flex items-center justify-between px-4 py-3 border rounded-md w-full max-w-50">
                        <div>
                            <h1 className="text-sm">{card.title}</h1>
                            <p className="text-xl font-medium mt-1">{card.value}</p>
                        </div>
                        <card.icon className="w-6 h-6" />
                    </div>
                ))}
            </div>

            <p className="mt-10 text-lg font-medium">Active Shows</p>
            <div className="relative flex flex-wrap gap-6 mt-4 max-w-5xl">
                <BlurCircle top="100px" left="-10%" />
                {dashboardData.activeShows.length === 0 && (
                    <p className="text-gray-400">No upcoming shows. Add one from Add Shows.</p>
                )}
                {dashboardData.activeShows.map((show) => (
                    <div
                        key={show._id}
                        className="w-55 rounded-lg overflow-hidden h-full pb-3 bg-primary/10 border border-primary/20 hover:-translate-y-1 transition duration-300"
                    >
                        <img src={tmdbImage(show.movie.poster_path, 'w342')} alt="" className="h-60 w-full object-cover" />
                        <p className="font-medium p-2 truncate">{show.movie.title}</p>
                        <div className="flex items-center justify-between px-2">
                            <p className="text-lg font-medium">{currency}{show.showPrice}</p>
                            <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
                                <StarIcon className="w-4 h-4 text-primary fill-primary" />
                                {show.movie.vote_average.toFixed(1)}
                            </p>
                        </div>
                        <p className="px-2 pt-2 text-sm text-gray-500">{dateFormat(show.showDateTime)}</p>
                    </div>
                ))}
            </div>
        </>
    ) : <Loading />
}

export default Dashboard