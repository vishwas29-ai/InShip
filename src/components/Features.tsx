const features = [
  {
    icon: "⚡",
    title: "Fast Delivery",
    description: "Simple and efficient parcel booking.",
  },
  {
    icon: "🛡️",
    title: "Secure & Reliable",
    description: "Your parcels, our priority.",
  },
  {
    icon: "📍",
    title: "Order Tracking",
    description: "Stay updated on your parcel status.",
  },
  {
    icon: "💰",
    title: "Affordable Pricing",
    description: "Transparent delivery charges.",
  },
];

export default function Features() {
  return (
    <section id="services" className="scroll-mt-24 bg-white px-6 py-16">
      <div className="mx-auto max-w-7xl">

        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-[#142B49]">
            Why Choose InShip?
          </h2>

          <p className="mt-3 text-gray-600">
            Making parcel delivery simple and convenient.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-[#D9F2F0] bg-[#F4FAFA] p-6 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 text-4xl">
                {feature.icon}
              </div>

              <h3 className="text-lg font-bold text-[#142B49]">
                {feature.title}
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}