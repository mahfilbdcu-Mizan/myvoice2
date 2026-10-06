import { Wallet } from "lucide-react";

const paymentMethods = [
  { name: "bKash", dot: "bg-primary" },
  { name: "Nagad", dot: "bg-warning" },
  { name: "Rocket", dot: "bg-accent" },
  { name: "USDT (TRC20)", dot: "bg-success" },
];

export function PaymentMethods({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
        <Wallet className="h-4 w-4 text-primary" />
        Accepted Payment Methods
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {paymentMethods.map((method) => (
          <span
            key={method.name}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${method.dot}`} />
            {method.name}
          </span>
        ))}
      </div>
      <p className="max-w-xl text-center text-xs text-muted-foreground sm:text-sm">
        Pay with bKash, Nagad or Rocket, or send USDT on the TRC20 network. The numbers and wallet
        address are shown in your dashboard when you buy credits — credits are added after verification.
      </p>
    </div>
  );
}
