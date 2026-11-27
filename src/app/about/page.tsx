
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const values = [
  {
    icon: "⚡",
    title: "Simplicity",
    description:
      "Make delivery booking and order management straightforward.",
  },
  {
    icon: "🔍",
    title: "Transparency",
    description:
      "Help users understand estimated charges and track order progress.",
  },
  {
    icon: "💡",
    title: "Innovation",
    description:
      "Build useful digital tools for a better parcel delivery experience.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F4FAFA]">
      <Navbar />

      <main>
        <section className="bg-gradient-to-br from-[#E0F8F7] via-white to-[#F4FAFA] px-6 py-24 text-center">
          <div className="mx-auto max-w-4xl">
            <span className="rounded-full bg-white px-5 py-2 text-sm font-bold text-[#008F84] shadow-sm">
              ABOUT INSHIP
            </span>

            <h1 className="mt-8 text-4xl font-extrabold text-[#142B49] md:text-5xl">
              Making Parcel Delivery
              <span className="block text-[#00BFAF]">
                Smarter & Simpler.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              InShip is a parcel delivery booking and tracking
              platform designed to make the process of arranging
              and managing deliveries more convenient.
            </p>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#008F84]">
                Our Mission
              </p>

              <h2 className="mt-4 text-3xl font-extrabold text-[#142B49] md:text-4xl">
                A Better Way to Manage Deliveries
              </h2>

              <p className="mt-6 leading-8 text-gray-600">
                Our goal is to simplify parcel booking by bringing
                address entry, estimated pricing, order management
                and shipment tracking into one digital experience.
              </p>

              <p className="mt-4 leading-8 text-gray-600">
                We are building InShip around an easy-to-use
                interface and clear delivery information.
              </p>

              <Link
                href="/orders/new"
                className="mt-8 inline-block rounded-xl bg-[#00BFAF] px-7 py-3 font-bold text-white transition hover:bg-[#009F93]"
              >
                Book Your First Delivery →
              </Link>
            </div>

            <div className="rounded-3xl bg-[#E0F8F7] p-10">
              <div className="rounded-2xl bg-white p-8 shadow-sm">
                <div className="text-6xl">🚚</div>

                <h3 className="mt-6 text-2xl font-bold text-[#142B49]">
                  One Platform. Simple Deliveries.
                </h3>

                <p className="mt-4 leading-7 text-gray-600">
                  Book a parcel, view an estimated charge,
                  manage your orders and check their status
                  from one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-extrabold text-[#142B49]">
              What We Value
            </h2>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="rounded-2xl border border-[#DCEFEB] bg-[#F4FAFA] p-8 text-center"
                >
                  <div className="text-4xl">{value.icon}</div>

                  <h3 className="mt-5 text-xl font-bold text-[#142B49]">
                    {value.title}
                  </h3>

                  <p className="mt-3 leading-7 text-gray-600">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-[#142B49]">
            Experience InShip
          </h2>

          <p className="mt-4 text-gray-600">
            Explore the platform and start a new booking.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/orders/new"
              className="rounded-xl bg-[#00BFAF] px-7 py-3 font-bold text-white hover:bg-[#009F93]"
            >
              Book Delivery →
            </Link>

            <Link
              href="/#how-it-works"
              className="rounded-xl border border-[#00BFAF] bg-white px-7 py-3 font-bold text-[#008F84] hover:bg-[#E0F8F7]"
            >
              How It Works
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
