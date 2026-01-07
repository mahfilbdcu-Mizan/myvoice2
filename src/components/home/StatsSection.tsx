import { Headphones, Mic, Globe, Shield } from "lucide-react";

const stats = [
  { value: "1M+", label: "Audio Minutes", icon: Headphones },
  { value: "100+", label: "Premium Voices", icon: Mic },
  { value: "29", label: "Languages", icon: Globe },
  { value: "99.9%", label: "Uptime", icon: Shield },
];

export function StatsSection() {
  return (
    <section className="border-b border-border/50 bg-gradient-to-b from-primary/5 via-accent/3 to-transparent py-12 sm:py-16 lg:py-20">
      <div className="container px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="group text-center p-4 sm:p-6 rounded-xl sm:rounded-2xl transition-all hover:bg-card/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 transition-all group-hover:from-primary/25 group-hover:to-accent/25 group-hover:scale-105">
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary" />
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
