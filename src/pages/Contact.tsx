import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, Youtube, Facebook, Send, ExternalLink, Headphones, Clock, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ContactLink {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  href: string;
  color: string;
  bgColor: string;
  gradient: string;
}

const defaultContactLinks: ContactLink[] = [
  {
    icon: Send,
    title: "Telegram Channel",
    value: "@BDYTAUTOMATION",
    href: "https://t.me/BDYTAUTOMATION",
    color: "text-[hsl(200,90%,50%)]",
    bgColor: "bg-[hsl(200,90%,50%)]/10",
    gradient: "from-[hsl(200,90%,50%)] to-[hsl(200,90%,40%)]",
  },
  {
    icon: MessageCircle,
    title: "Telegram Support",
    value: "@BDTYAUTOMATIONSupport",
    href: "https://t.me/BDTYAUTOMATIONSupport",
    color: "text-[hsl(200,90%,50%)]",
    bgColor: "bg-[hsl(200,90%,50%)]/10",
    gradient: "from-[hsl(200,90%,50%)] to-[hsl(220,90%,50%)]",
  },
  {
    icon: Phone,
    title: "WhatsApp",
    value: "+8801757433586",
    href: "https://wa.me/8801757433586",
    color: "text-[hsl(140,70%,45%)]",
    bgColor: "bg-[hsl(140,70%,45%)]/10",
    gradient: "from-[hsl(140,70%,45%)] to-[hsl(140,70%,35%)]",
  },
  {
    icon: Facebook,
    title: "Facebook",
    value: "Abdus Samad",
    href: "https://www.facebook.com/AbdusSamad2979/",
    color: "text-[hsl(220,90%,55%)]",
    bgColor: "bg-[hsl(220,90%,55%)]/10",
    gradient: "from-[hsl(220,90%,55%)] to-[hsl(220,90%,45%)]",
  },
  {
    icon: Youtube,
    title: "YouTube Channel",
    value: "@BDTYAUTOMATION",
    href: "https://www.youtube.com/@BDTYAUTOMATION/videos",
    color: "text-[hsl(0,85%,55%)]",
    bgColor: "bg-[hsl(0,85%,55%)]/10",
    gradient: "from-[hsl(0,85%,55%)] to-[hsl(0,85%,45%)]",
  },
];

export default function Contact() {
  const [contactLinks, setContactLinks] = useState<ContactLink[]>(defaultContactLinks);

  useEffect(() => {
    const fetchContactSettings = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .like("key", "contact_%");

      if (data && data.length > 0) {
        const settings: Record<string, string> = {};
        data.forEach((s) => {
          if (s.value) settings[s.key] = s.value;
        });

        setContactLinks([
          {
            icon: Send,
            title: "Telegram Channel",
            value: settings.contact_telegram_channel_name || "@BDYTAUTOMATION",
            href: settings.contact_telegram_channel || "https://t.me/BDYTAUTOMATION",
            color: "text-[hsl(200,90%,50%)]",
            bgColor: "bg-[hsl(200,90%,50%)]/10",
            gradient: "from-[hsl(200,90%,50%)] to-[hsl(200,90%,40%)]",
          },
          {
            icon: MessageCircle,
            title: "Telegram Support",
            value: settings.contact_telegram_support_name || "@BDTYAUTOMATIONSupport",
            href: settings.contact_telegram_support || "https://t.me/BDTYAUTOMATIONSupport",
            color: "text-[hsl(200,90%,50%)]",
            bgColor: "bg-[hsl(200,90%,50%)]/10",
            gradient: "from-[hsl(200,90%,50%)] to-[hsl(220,90%,50%)]",
          },
          {
            icon: Phone,
            title: "WhatsApp",
            value: settings.contact_whatsapp_number || "+8801757433586",
            href: settings.contact_whatsapp || "https://wa.me/8801757433586",
            color: "text-[hsl(140,70%,45%)]",
            bgColor: "bg-[hsl(140,70%,45%)]/10",
            gradient: "from-[hsl(140,70%,45%)] to-[hsl(140,70%,35%)]",
          },
          {
            icon: Facebook,
            title: "Facebook",
            value: settings.contact_facebook_name || "Abdus Samad",
            href: settings.contact_facebook || "https://www.facebook.com/AbdusSamad2979/",
            color: "text-[hsl(220,90%,55%)]",
            bgColor: "bg-[hsl(220,90%,55%)]/10",
            gradient: "from-[hsl(220,90%,55%)] to-[hsl(220,90%,45%)]",
          },
          {
            icon: Youtube,
            title: "YouTube Channel",
            value: settings.contact_youtube_name || "@BDTYAUTOMATION",
            href: settings.contact_youtube || "https://www.youtube.com/@BDTYAUTOMATION/videos",
            color: "text-[hsl(0,85%,55%)]",
            bgColor: "bg-[hsl(0,85%,55%)]/10",
            gradient: "from-[hsl(0,85%,55%)] to-[hsl(0,85%,45%)]",
          },
        ]);
      }
    };

    fetchContactSettings();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border py-20 sm:py-28 lg:py-36">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-1/4 -left-1/4 h-[800px] w-[800px] rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
          </div>
          
          <div className="container relative px-4 sm:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
                📞 Contact Us
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight">
                Get in <span className="gradient-text">Touch</span>
              </h1>
              <p className="mt-6 sm:mt-8 text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Have questions? Need support? We're here to help you 24/7. Reach out through any of our channels.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 sm:py-16 border-b border-border bg-muted/30">
          <div className="container px-4 sm:px-6">
            <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">24/7</div>
                <div className="text-muted-foreground mt-1">Support Available</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <Headphones className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">&lt;1hr</div>
                <div className="text-muted-foreground mt-1">Response Time</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">5+</div>
                <div className="text-muted-foreground mt-1">Contact Channels</div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Cards Section */}
        <section className="py-16 sm:py-24 lg:py-32">
          <div className="container px-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Connect With Us
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Choose your preferred platform to reach our team
                </p>
              </div>

              <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {contactLinks.map((contact, index) => (
                  <a
                    key={contact.title}
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Card className="h-full transition-all duration-300 hover:shadow-elevated hover:border-primary/50 hover:-translate-y-2 overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${contact.gradient}`} />
                      <CardContent className="p-6 sm:p-8">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${contact.bgColor} flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
                          <contact.icon className={`h-8 w-8 sm:h-10 sm:w-10 ${contact.color}`} />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-2">{contact.title}</h3>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-lg ${contact.color} group-hover:underline`}>
                            {contact.value}
                          </p>
                          <ExternalLink className={`h-4 w-4 ${contact.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24 bg-muted/30 border-t border-border">
          <div className="container px-4 sm:px-6">
            <div className="mx-auto max-w-4xl">
              <Card className="overflow-hidden border-primary/30">
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-8 sm:p-12 lg:p-16">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-6">
                      <Headphones className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                      🎯 BD YT Automation
                    </h3>
                    <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
                      We are always ready to help you. For any issues or inquiries, please contact us through any of the channels above. We strive to respond as quickly as possible.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <a
                        href="https://t.me/BDTYAUTOMATIONSupport"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-8 rounded-xl hover:opacity-90 transition-all hover:scale-105"
                      >
                        <MessageCircle className="h-5 w-5" />
                        Chat on Telegram
                      </a>
                      <a
                        href="https://wa.me/8801757433586"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[hsl(140,70%,45%)] text-white font-semibold py-3 px-8 rounded-xl hover:opacity-90 transition-all hover:scale-105"
                      >
                        <Phone className="h-5 w-5" />
                        WhatsApp Us
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24">
          <div className="container px-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-muted-foreground">
                  Quick answers to common questions
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    question: "What is the best way to contact support?",
                    answer: "The fastest way to reach us is through Telegram. Our support team is available 24/7 and typically responds within an hour.",
                  },
                  {
                    question: "How do I report a technical issue?",
                    answer: "You can report technical issues through any of our contact channels. Please include screenshots and a detailed description of the problem for faster resolution.",
                  },
                  {
                    question: "What are your support hours?",
                    answer: "Our support team is available 24/7. We strive to respond to all inquiries within 1 hour during peak hours.",
                  },
                  {
                    question: "Can I request a feature?",
                    answer: "Absolutely! We love hearing from our users. Share your feature requests through Telegram or Facebook, and we'll consider them for future updates.",
                  },
                ].map((faq, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-lg mb-2">{faq.question}</h4>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
