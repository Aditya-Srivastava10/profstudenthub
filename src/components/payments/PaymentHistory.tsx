import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/payment-utils";
import { Download, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  paid_at: string;
  receipt_url?: string;
  student_dues: {
    description: string;
    subject_id?: string;
  };
  subjects?: {
    name: string;
    code: string;
  };
}

interface PaymentHistoryProps {
  studentId?: string;
}

export function PaymentHistory({ studentId }: PaymentHistoryProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchPayments();
    }
  }, [studentId]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          student_dues!inner (
            description,
            subject_id,
            subjects:subject_id (
              name,
              code
            )
          )
        `)
        .eq('student_id', studentId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReceipt = async (payment: Payment) => {
    // In a real app, this would generate and download a PDF receipt
    const receiptData = {
      paymentId: payment.id,
      amount: payment.amount,
      method: payment.payment_method,
      date: payment.paid_at,
      description: payment.student_dues.description,
      reference: payment.payment_reference,
    };

    // Simulate receipt generation
    toast({
      title: "Receipt Generated",
      description: "Receipt has been downloaded to your device",
    });

    // Create a simple text receipt for demo
    const receiptText = `
PAYMENT RECEIPT
===============
Payment ID: ${receiptData.paymentId}
Date: ${new Date(receiptData.date).toLocaleString()}
Description: ${receiptData.description}
Amount: ${formatCurrency(receiptData.amount)}
Method: ${receiptData.method.toUpperCase()}
Reference: ${receiptData.reference}

Thank you for your payment!
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length > 0 ? (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {payment.student_dues.description}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{new Date(payment.paid_at).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {payment.payment_method.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Ref: {payment.payment_reference}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Paid
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateReceipt(payment)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Receipt
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment history found</p>
            <p className="text-sm">Your completed payments will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}