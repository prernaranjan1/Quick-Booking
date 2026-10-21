import AdminNavbar from '../../components/admin/AdminNavbar'
import AdminSidebar from '../../components/admin/AdminSidebar'
import Loading from '../../components/Loading'
import useIsAdmin from '../../hooks/useIsAdmin'
import { Navigate, Outlet } from 'react-router-dom'

const Layout = () => {
  const isAdmin = useIsAdmin()

  if (isAdmin === null) {
    return <Loading />
  }

  // Non-admins are sent home; the server also rejects their admin API calls
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <AdminNavbar />

      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </>
  )
}

export default Layout
