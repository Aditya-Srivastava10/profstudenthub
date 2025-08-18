import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getStatusColor } from "@/lib/payment-utils";
import { Calendar, User, BookOpen, Receipt, Clock } from "lucide-react";

interface PaymentDetailsDialogProps {
  due: {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid' | 'overdue' | 'failed';
    late_fee_percentage: number;
    created_at: string;
    student_id: string;
    subject_id?: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
    } | null;
    subjects?: {
      name: string;
      code: string;
    } | null;
    payments: Array<{
      id: string;
      amount: number;
      payment_method: string;
      paid_at: string;
    }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDetailsDialog({ due, open, onOpenChange }: PaymentDetailsDialogProps) {
  const totalPaid = due.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = due.amount - totalPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Due Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Due Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Student
                  </div>
                  <div className="font-medium">
                    {due.profiles?.first_name} {due.profiles?.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {due.profiles?.email}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </div>
                  <div className="font-medium">
                    {new Date(due.due_date).toLocaleDateString()}
                  </div>
                  <Badge variant={getStatusColor(due.status)} className="text-xs w-fit">
                    {due.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {due.subjects && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    Subject
                  </div>
                  <div className="font-medium">
                    {due.subjects.name} ({due.subjects.code})
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="font-medium">{due.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Original Amount</div>
                  <div className="text-lg font-bold">{formatCurrency(due.amount)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Late Fee %</div>
                  <div className="text-lg font-bold">{due.late_fee_percentage}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(totalPaid)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Remaining</div>
                  <div className="text-lg font-bold text-destructive">
                    {formatCurrency(Math.max(0, remainingAmount))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {due.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {due.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{formatCurrency(payment.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.payment_method.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          {new Date(payment.paid_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.paid_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium">Due Created</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(due.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {due.payments.map((payment, index) => (
                  <div key={payment.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium">
                        Payment Received - {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(payment.paid_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {due.status === 'paid' && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-green-600">Due Fully Paid</div>
                      <div className="text-xs text-muted-foreground">
                        Payment completed
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}