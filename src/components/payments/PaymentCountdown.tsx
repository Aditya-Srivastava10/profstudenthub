import { useEffect, useState } from "react";
import { getDaysUntilDue } from "@/lib/payment-utils";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface PaymentCountdownProps {
  dueDate: string;
}

export function PaymentCountdown({ dueDate }: PaymentCountdownProps) {
  const [daysLeft, setDaysLeft] = useState(getDaysUntilDue(dueDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setDaysLeft(getDaysUntilDue(dueDate));
    }, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [dueDate]);

  const getCountdownDisplay = () => {
    if (daysLeft > 0) {
      return {
        text: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`,
        icon: Clock,
        className: daysLeft <= 3 ? "text-destructive" : daysLeft <= 7 ? "text-accent" : "text-muted-foreground"
      };
    } else if (daysLeft === 0) {
      return {
        text: "Due today",
        icon: AlertTriangle,
        className: "text-destructive animate-pulse"
      };
    } else {
      return {
        text: `${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? 'day' : 'days'} overdue`,
        icon: AlertTriangle,
        className: "text-destructive font-bold"
      };
    }
  };

  const { text, icon: Icon, className } = getCountdownDisplay();

  return (
    <div className={`flex items-center gap-1 text-sm ${className}`}>
      <Icon className="h-3 w-3" />
      <span>{text}</span>
    </div>
  );
}