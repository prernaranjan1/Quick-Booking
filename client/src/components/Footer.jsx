import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <footer className="px-6 md:px-16 lg:px-24 xl:px-44 pt-20 pb-8 bg-[#181818] text-gray-400">
      <div className="flex flex-col md:flex-row justify-between gap-10">

        {/* Logo + Description */}
        <div className="max-w-sm">
          <img
            src={assets.logo}
            alt="QuickShow"
            className="w-32 mb-4"
          />

          <p className="text-sm leading-6">
            QuickShow makes movie booking simple and fast. Discover the latest
            movies, explore theaters, watch trailers, and book your tickets
            online with ease.
          </p>

          <div className="flex items-center gap-3 mt-5">
            <img
              src={assets.googlePlay}
              alt="Google Play"
              className="w-32 cursor-pointer"
            />

            <img
              src={assets.appStore}
              alt="App Store"
              className="w-32 cursor-pointer"
            />
          </div>
        </div>

        {/* Company */}
        <div>
          <h3 className="text-white font-medium mb-4">
            Company
          </h3>

          <ul className="space-y-2 text-sm">
            <li>
              <a href="/" className="hover:text-primary transition">
                Home
              </a>
            </li>

            <li>
              <a href="/movies" className="hover:text-primary transition">
                Movies
              </a>
            </li>

            <li>
              <a href="/theaters" className="hover:text-primary transition">
                Theaters
              </a>
            </li>

            <li>
              <a href="/favorites" className="hover:text-primary transition">
                Favorites
              </a>
            </li>
          </ul>
        </div>

        {/* Get in touch */}
        <div>
          <h3 className="text-white font-medium mb-4">
            Get in touch
          </h3>

          <ul className="space-y-2 text-sm">
            <li>+91 98765 43210</li>
            <li>support@quickshow.com</li>
            <li>Kolkata, India</li>
          </ul>
        </div>

      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800 mt-10 pt-5 text-center text-sm">
        © 2026 QuickShow. All rights reserved.
      </div>
    </footer>
  )
}

export default Footer