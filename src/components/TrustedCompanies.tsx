import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

const companies = [
  "Amazon",
  "Microsoft", 
  "Google",
  "Meta",
  "Apple",
  "Tesla",
  "Netflix",
  "Spotify",
  "Uber",
  "Airbnb",
  "Shopify",
  "Salesforce"
];

const TrustedCompanies = () => {
  return (
    <section className="py-16 border-t border-border/40 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Trusted by leading brands
          </p>
        </div>
        
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {companies.map((company, index) => (
              <CarouselItem key={index} className="pl-2 md:pl-4 basis-1/3 md:basis-1/5 lg:basis-1/6">
                <div className="flex items-center justify-center h-16 px-4">
                  <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200">
                    {company}
                  </span>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
};

export default TrustedCompanies;