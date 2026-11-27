
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const services = [
  {
    icon: "📦",
    title: "Parcel Delivery",
    description:
      "Book parcel deliveries with a simple pickup and destination form.",
    href: "/orders/new",
    action: "Book Delivery",
  },
  {
    icon: "🚚",
    title: "Order Tracking",
    description:
      "Track your parcel's current delivery status using your Order ID.",
    href: "/#track",
    action: "Track Parcel",
  },
  {
    icon: "💰",
    title: "Delivery Price Estimation",
    description:
      "Calculate an estimated delivery charge using pickup and destination PIN codes.",
    href: "/#quote",
    action: "Get a Quote",
  },
  {
    icon: "📋",
    title: "Order Management",
    description:
      "View your bookings, delivery charges and order information.",
    href: "/orders",
    action: "View Orders",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#F4FAFA]">
      <Navbar />

      <main>
        <section className="bg-gradient-to-br from-[#E0F8F7] via-white to-[#F4FAFA] px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl">
            <span className="rounded-full bg-white px-5 py-2 text-sm font-bold text-[#008F84] shadow-sm">
              OUR SERVICES
            </span>

            <h1 className="mt-7 text-4xl font-extrabold tracking-tight text-[#142B49] md:text-5xl">
              Smart Delivery Services
              <span className="block text-[#00BFAF]">
                Made Simple.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              From booking parcels to checking delivery progress,
              InShip brings your essential delivery tools together
              in one place.
            </p>

            <Link
              href="/orders/new"
              className="mt-8 inline-block rounded-xl bg-[#00BFAF] px-8 py-4 font-bold text-white shadow-md transition hover:bg-[#009F93]"
            >
              Book a Delivery →
            </Link>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-extrabold text-[#142B49]">
                Explore Our Services
              </h2>
              <p className="mt-3 text-gray-600">
                Everything you need to manage your parcel deliveries.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="rounded-2xl border border-[#DCEFEB] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E0F8F7] text-3xl">
                    {service.icon}
                  </div>

                  <h3 className="mt-6 text-2xl font-bold text-[#142B49]">
                    {service.title}
                  </h3>

                  <p className="mt-3 leading-7 text-gray-600">
                    {service.description}
                  </p>

                  <Link
                    href={service.href}
                    className="mt-6 inline-flex items-center gap-2 font-bold text-[#008F84] hover:underline"
                  >
                    {service.action} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#142B49] px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-bold">
            Ready to Send Your Parcel?
          </h2>

          <p className="mt-4 text-gray-300">
            Start your delivery booking with InShip.
          </p>

          <Link
            href="/orders/new"
            className="mt-7 inline-block rounded-xl bg-[#00BFAF] px-8 py-4 font-bold transition hover:bg-[#009F93]"
          >
            Get Started →
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
