import { Mic, Languages, FileAudio, Globe, Zap } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Text to Speech",
    description: "Convert any text into natural, expressive speech with our advanced AI voices.",
  },
  {
    icon: Languages,
    title: "AI Dubbing",
    description: "Automatically translate and dub your content into 29+ languages.",
  },
  {
    icon: FileAudio,
    title: "Speech to Text",
    description: "Transcribe audio and video files with high accuracy and speaker detection.",
  },
  {
    icon: Globe,
    title: "29+ Languages",
    description: "Create content in multiple languages with native-sounding voices.",
  },
];

export function FeaturesSection() {
  return (
    <section className="border-y border-border/50 bg-gradient-to-b from-muted/20 via-primary/3 to-muted/20 py-16 sm:py-20 lg:py-28">
      <div className="container px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold mb-4 sm:mb-6">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            <span className="text-primary">Powerful Features</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight">
            Everything You Need for <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Audio Content</span>
          </h2>
          <p className="mt-3 sm:mt-4 lg:mt-5 text-sm sm:text-base lg:text-lg text-muted-foreground">
            Powerful AI tools to create, translate, and transcribe audio at scale
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl sm:rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 sm:p-6 lg:p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
            >
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/15 transition-transform group-hover:scale-105">
                  <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary-foreground" />
                </div>
                <h3 className="mt-4 sm:mt-5 lg:mt-6 text-lg sm:text-xl font-bold">{feature.title}</h3>
                <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
