import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentCountdown } from "./PaymentCountdown";
import { PaymentDialog } from "./PaymentDialog";
import { PaymentHistory } from "./PaymentHistory";
import { formatCurrency, getStatusColor } from "@/lib/payment-utils";
import { Calendar, CreditCard, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentDue {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'failed';
  late_fee_percentage: number;
  created_at: string;
  subject_id?: string;
}

export function StudentPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dues, setDues] = useState<StudentDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDue, setSelectedDue] = useState<StudentDue | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDues();
    }
  }, [user]);

  const fetchDues = async () => {
    try {
      const { data, error } = await supabase
        .from('student_dues')
        .select('*')
        .eq('student_id', user?.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setDues(data || []);
    } catch (error) {
      console.error('Error fetching dues:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    fetchDues();
    setPaymentDialogOpen(false);
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed successfully",
    });
  };

  const calculateLateFee = (due: StudentDue) => {
    const dueDate = new Date(due.due_date);
    const today = new Date();
    if (today > dueDate && due.status === 'pending') {
      return Math.floor(due.amount * (due.late_fee_percentage / 100));
    }
    return 0;
  };

  const pendingDues = dues.filter(due => due.status === 'pending' || due.status === 'overdue');
  const paidDues = dues.filter(due => due.status === 'paid');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(pendingDues.reduce((sum, due) => sum + due.amount + calculateLateFee(due), 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {pendingDues.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paid This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidDues.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Dues */}
      {pendingDues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Pending Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingDues.map((due) => {
                const lateFee = calculateLateFee(due);
                const totalAmount = due.amount + lateFee;
                
                return (
                  <div
                    key={due.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground">{due.description}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(due.due_date).toLocaleDateString()}
                            </span>
                            <Badge variant={getStatusColor(due.status)} className="text-xs">
                              {due.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            {formatCurrency(totalAmount)}
                          </div>
                          {lateFee > 0 && (
                            <div className="text-xs text-destructive">
                              Late fee: {formatCurrency(lateFee)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <PaymentCountdown dueDate={due.due_date} />
                    </div>
                    
                    <div className="ml-4">
                      <Button
                        onClick={() => {
                          setSelectedDue(due);
                          setPaymentDialogOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Pay Now
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <PaymentHistory studentId={user?.id} />

      {/* Payment Dialog */}
      {selectedDue && (
        <PaymentDialog
          due={selectedDue}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}