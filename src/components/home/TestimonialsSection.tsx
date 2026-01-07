import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Content Creator",
    avatar: "SC",
    content: "VoiceStudio has completely transformed my workflow. I can create professional voiceovers in minutes!",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Marketing Director",
    avatar: "MJ",
    content: "The quality of AI voices is incredible. Our clients can't tell the difference from human recordings.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Course Instructor",
    avatar: "ER",
    content: "I've created over 50 hours of course content with VoiceStudio. It's a game-changer for educators.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="border-y border-border bg-muted/10 py-16 sm:py-20 lg:py-24">
      <div className="container px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            Loved by <span className="text-primary">Creators</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-muted-foreground">
            Join thousands of creators who trust VoiceStudio for their audio needs
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="rounded-xl sm:rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all hover:shadow-lg hover:border-primary/30"
            >
              {/* Rating */}
              <div className="flex items-center gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-primary text-primary" />
                ))}
              </div>
              
              {/* Quote */}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div className="mt-4 sm:mt-6 flex items-center gap-3">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10 text-xs sm:text-sm font-semibold text-primary">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">{testimonial.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
