import infiniteWorldLogo from "@/assets/infinite-world-logo.jpg";
import wishAndWillowLogo from "@/assets/wish-and-willow-logo.jpg";

const companies = [
  { name: "Infinite World", logo: infiniteWorldLogo },
  { name: "Wish & Willow", logo: wishAndWillowLogo },
];

const TrustedCompanies = () => {
  return (
    <section className="py-16 border-t border-border/40 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Powering top brands globally
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-16 md:gap-24">
          {companies.map((company, index) => (
            <div key={index} className="flex items-center justify-center h-16">
              <img 
                src={company.logo} 
                alt={company.name} 
                className="h-12 md:h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedCompanies;
