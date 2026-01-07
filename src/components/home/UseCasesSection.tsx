import { MessageSquare, Users, Wand2, Globe } from "lucide-react";

const useCases = [
  {
    icon: MessageSquare,
    title: "Content Creators",
    description: "Create engaging voiceovers for YouTube, TikTok, podcasts, and more.",
  },
  {
    icon: Users,
    title: "E-Learning",
    description: "Generate narration for courses, tutorials, and educational content.",
  },
  {
    icon: Wand2,
    title: "Marketing",
    description: "Produce professional ads, explainer videos, and promotional content.",
  },
  {
    icon: Globe,
    title: "Localization",
    description: "Translate and dub content to reach global audiences in their language.",
  },
];

export function UseCasesSection() {
  return (
    <section className="py-16 sm:py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3" />
      <div className="container relative px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold mb-4 sm:mb-6">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
            <span className="text-accent">Use Cases</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight">
            Built for <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Every Use Case</span>
          </h2>
          <p className="mt-3 sm:mt-4 lg:mt-5 text-sm sm:text-base lg:text-lg text-muted-foreground">
            From content creators to enterprises, VoiceStudio powers audio at any scale
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((useCase, index) => (
            <div 
              key={index} 
              className="text-center group p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl transition-all duration-300 hover:bg-card/80 hover:shadow-xl hover:shadow-accent/5"
            >
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-accent to-primary shadow-xl shadow-primary/20 transition-transform group-hover:scale-105">
                <useCase.icon className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary-foreground" />
              </div>
              <h3 className="mt-4 sm:mt-5 lg:mt-6 text-lg sm:text-xl font-bold">{useCase.title}</h3>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
