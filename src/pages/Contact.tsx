import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, Youtube, Facebook, Send } from "lucide-react";

const contactLinks = [
  {
    icon: Send,
    title: "Telegram Channel",
    value: "@BDYTAUTOMATION",
    href: "https://t.me/BDYTAUTOMATION",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: MessageCircle,
    title: "Telegram Support",
    value: "@BDTYAUTOMATIONSupport",
    href: "https://t.me/BDTYAUTOMATIONSupport",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Phone,
    title: "WhatsApp",
    value: "+8801757433586",
    href: "https://wa.me/8801757433586",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Facebook,
    title: "Facebook",
    value: "Abdus Samad",
    href: "https://www.facebook.com/AbdusSamad2979/",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
  },
  {
    icon: Youtube,
    title: "YouTube Channel",
    value: "@BDTYAUTOMATION",
    href: "https://www.youtube.com/@BDTYAUTOMATION/videos",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
];

export default function Contact() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20 lg:py-24">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          </div>
          
          <div className="container relative px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-4">
                Contact
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">
                Get in <span className="text-primary">Touch With Us</span>
              </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
                For any questions or assistance, feel free to contact us through any of the channels below.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="py-16 sm:py-20">
          <div className="container px-4 sm:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {contactLinks.map((contact) => (
                  <a
                    key={contact.title}
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
                      <CardHeader className="pb-3">
                        <div className={`w-12 h-12 rounded-xl ${contact.bgColor} flex items-center justify-center mb-3`}>
                          <contact.icon className={`h-6 w-6 ${contact.color}`} />
                        </div>
                        <CardTitle className="text-lg">{contact.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className={`font-medium ${contact.color} group-hover:underline`}>
                          {contact.value}
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>

              {/* Additional Info */}
              <Card className="mt-8 sm:mt-12 border-primary/20 bg-primary/5">
                <CardContent className="py-8 text-center">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4">
                    🎯 BD YT Automation
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    We are always ready to help you. For any issues or inquiries, please contact us through any of the channels above. We strive to respond as quickly as possible.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}