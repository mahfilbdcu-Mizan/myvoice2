import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [telegramLink, setTelegramLink] = useState("https://t.me/BDTYAUTOMATIONSupport");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["chatbot_enabled", "chatbot_telegram_link"]);

      if (data) {
        data.forEach((setting) => {
          if (setting.key === "chatbot_enabled") {
            setChatbotEnabled(setting.value === "true");
          } else if (setting.key === "chatbot_telegram_link" && setting.value) {
            setTelegramLink(setting.value);
          }
        });
      }
    };

    fetchSettings();
  }, []);

  if (!chatbotEnabled) return null;

  const handleChatClick = () => {
    window.open(telegramLink, "_blank");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Tooltip */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-72 animate-scale-in">
          <div className="rounded-2xl bg-card border border-border shadow-elevated overflow-hidden">
            <div className="bg-primary p-4">
              <h3 className="text-primary-foreground font-semibold text-lg">
                💬 Need Help?
              </h3>
              <p className="text-primary-foreground/80 text-sm mt-1">
                Chat with us on Telegram!
              </p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Click the button below to start a conversation with our support team.
              </p>
              <button
                onClick={handleChatClick}
                className="w-full flex items-center justify-center gap-2 bg-[hsl(200,90%,50%)] hover:bg-[hsl(200,90%,45%)] text-white font-medium py-3 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.869 4.326-2.96-.924c-.643-.203-.657-.643.136-.953l11.566-4.458c.537-.194 1.006.128.832.939z"/>
                </svg>
                Open Telegram
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-glow"
      >
        {isOpen ? (
          <X className="h-7 w-7" />
        ) : (
          <>
            <MessageCircle className="h-7 w-7" />
            {/* Pulse animation */}
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-success"></span>
            </span>
          </>
        )}
      </button>
    </div>
  );
}
