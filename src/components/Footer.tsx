import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#142B49] px-6 pt-16 pb-6 text-white">
      <div className="mx-auto max-w-7xl">

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand Section */}
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="rounded-lg bg-[#00BFAF] p-2">
                <span className="text-xl font-bold">↗</span>
              </div>

              <span className="text-2xl font-bold">
                InShip
              </span>
            </Link>

            <p className="mt-5 text-sm leading-7 text-gray-300">
              Making parcel delivery simpler, smarter,
              and more accessible across India.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-5 text-lg font-semibold">
              Quick Links
            </h3>

            <ul className="space-y-3 text-sm text-gray-300">
              <li><Link href="/" className="hover:text-[#00BFAF]">Home</Link></li>
              <li><Link href="/track" className="hover:text-[#00BFAF]">Track Order</Link></li>
              <li><Link href="/services" className="hover:text-[#00BFAF]">Services</Link></li>
              <li><Link href="/about" className="hover:text-[#00BFAF]">About Us</Link></li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="mb-5 text-lg font-semibold">
              Account
            </h3>

            <ul className="space-y-3 text-sm text-gray-300">
              <li><Link href="/login" className="hover:text-[#00BFAF]">Login</Link></li>
              <li><Link href="/signup" className="hover:text-[#00BFAF]">Sign Up</Link></li>
              <li><Link href="/orders" className="hover:text-[#00BFAF]">My Orders</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="mb-5 text-lg font-semibold">
              Support
            </h3>

            <ul className="space-y-3 text-sm text-gray-300">
              <li><Link href="/help" className="hover:text-[#00BFAF]">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-[#00BFAF]">Contact Us</Link></li>
              <li><Link href="/privacy" className="hover:text-[#00BFAF]">Privacy Policy</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Section */}
        <div className="mt-12 flex flex-col gap-3 border-t border-gray-600 pt-6 text-center text-sm text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© 2026 InShip. All rights reserved.</p>

          <p className="text-[#00BFAF]">
            Made for smarter deliveries
          </p>
        </div>

      </div>
    </footer>
  );
}