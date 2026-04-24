import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import Features from "@/components/site/Features";
import HowItWorks from "@/components/site/HowItWorks";
import Marketplace from "@/components/site/Marketplace";
import Testimonials from "@/components/site/Testimonials";
import CTA from "@/components/site/CTA";
import Footer from "@/components/site/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Marketplace />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;
