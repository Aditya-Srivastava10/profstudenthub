import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, calculateLateFee } from "@/lib/payment-utils";
import { CreditCard, Smartphone, Building2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentDialogProps {
  due: {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    late_fee_percentage: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: () => void;
}

type PaymentMethod = 'card' | 'upi' | 'bank_transfer' | 'cash';

const paymentMethods = [
  {
    id: 'card' as PaymentMethod,
    name: 'Credit/Debit Card',
    icon: CreditCard,
    description: 'Pay securely with your card'
  },
  {
    id: 'upi' as PaymentMethod,
    name: 'UPI',
    icon: Smartphone,
    description: 'Pay with PhonePe, GPay, or Paytm'
  },
  {
    id: 'bank_transfer' as PaymentMethod,
    name: 'Bank Transfer',
    icon: Building2,
    description: 'Direct bank account transfer'
  },
  {
    id: 'cash' as PaymentMethod,
    name: 'Cash',
    icon: DollarSign,
    description: 'Pay in cash at office'
  },
];

export function PaymentDialog({ due, open, onOpenChange, onPaymentSuccess }: PaymentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [processing, setProcessing] = useState(false);

  const lateFee = calculateLateFee(due.amount, due.due_date, due.late_fee_percentage);
  const totalAmount = due.amount + lateFee;

  const handlePayment = async () => {
    if (!user) return;

    setProcessing(true);
    
    try {
      // Simulate payment processing based on method
      const paymentReference = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In a real app, this would integrate with actual payment gateways
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Record the payment
      const { error } = await supabase
        .from('payments')
        .insert({
          student_id: user.id,
          due_id: due.id,
          amount: totalAmount,
          payment_method: selectedMethod,
          payment_reference: paymentReference,
          payment_gateway_id: paymentReference,
        });

      if (error) throw error;

      onPaymentSuccess();
      
      toast({
        title: "Payment Successful!",
        description: `Your payment of ${formatCurrency(totalAmount)} has been processed.`,
      });
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-medium">{due.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span>{formatCurrency(due.amount)}</span>
                </div>
                {lateFee > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Late Fee:</span>
                    <span>{formatCurrency(lateFee)}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Select Payment Method</Label>
            <RadioGroup
              value={selectedMethod}
              onValueChange={(value) => setSelectedMethod(value as PaymentMethod)}
              className="space-y-2"
            >
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label 
                    htmlFor={method.id} 
                    className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <method.icon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-muted-foreground">{method.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Payment Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                `Pay ${formatCurrency(totalAmount)}`
              )}
            </Button>
          </div>
          
          {/* Security Note */}
          <p className="text-xs text-muted-foreground text-center">
            🔒 Your payment information is secure and encrypted
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}