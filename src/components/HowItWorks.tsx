const steps = [
  {
    number: "01",
    icon: "📍",
    title: "Enter Locations",
    description: "Enter your pickup and delivery addresses.",
  },
  {
    number: "02",
    icon: "🧮",
    title: "Get a Quote",
    description: "View the estimated distance and delivery price.",
  },
  {
    number: "03",
    icon: "📦",
    title: "Place Your Order",
    description: "Confirm your booking and receive an order ID.",
  },
  {
    number: "04",
    icon: "🚚",
    title: "Track Delivery",
    description: "Check your parcel's delivery status.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-[#F4FAFA] px-6 py-20">
      <div className="mx-auto max-w-7xl">

        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-[#142B49] md:text-4xl">
            How InShip Works
          </h2>

          <p className="mt-3 text-gray-600">
            Four simple steps to deliver your parcel.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl bg-white p-6 text-center shadow-sm"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E0F8F7] text-3xl">
                {step.icon}
              </div>

              <p className="mb-2 text-sm font-bold text-[#00BFAF]">
                STEP {step.number}
              </p>

              <h3 className="text-lg font-bold text-[#142B49]">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}