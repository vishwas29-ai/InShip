import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import TrackParcel from "@/components/TrackParcel";
import Footer from "@/components/Footer";
import DeliveryQuote from "@/components/DeliveryQuote";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F4FAFA]">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <TrackParcel />
      <DeliveryQuote />
      <Footer />
    </main>
  );
}