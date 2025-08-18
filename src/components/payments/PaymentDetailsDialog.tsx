import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getTotalAmountWithLateFee } from '@/lib/payment-utils';

interface PaymentRecord {
  id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
  payment_reference: string | null;
}

interface StudentProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface StudentDueWithProfile {
  id: string;
  student_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'failed';
  late_fee_percentage: number | null;
  created_at: string;
  updated_at: string;
  subject_id: string | null;
  profiles: StudentProfile | null;
  subjects: { name: string } | null;
  payments: PaymentRecord[];
}

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  due: StudentDueWithProfile;
  onRefresh: () => void;
}

export function PaymentDetailsDialog({ open, onOpenChange, due }: PaymentDetailsDialogProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const totalPaid = due.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalAmount = getTotalAmountWithLateFee(
    due.amount, 
    due.due_date, 
    due.late_fee_percentage || 0
  );
  const remainingAmount = Math.max(0, totalAmount - totalPaid);

  const getStudentName = () => {
    if (!due.profiles) return 'Unknown Student';
    const name = `${due.profiles.first_name || ''} ${due.profiles.last_name || ''}`.trim();
    return name || due.profiles.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Due Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Due Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <p className="font-medium">{due.description}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Student:</span>
                  <p className="font-medium">{getStudentName()}</p>
                </div>
                {due.subjects && (
                  <div>
                    <span className="text-muted-foreground">Subject:</span>
                    <p className="font-medium">{due.subjects.name}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <p className="font-medium">{new Date(due.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={getStatusBadgeVariant(due.status)} className="ml-2">
                    {due.status}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Amount Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Amount:</span>
                  <span className="font-medium">{formatCurrency(due.amount)}</span>
                </div>
                {due.late_fee_percentage && new Date() > new Date(due.due_date) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Late Fee ({due.late_fee_percentage}%):</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(totalAmount - due.amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-semibold">{formatCurrency(remainingAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h3 className="font-medium mb-2">Payment History</h3>
            {due.payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payments made yet</p>
            ) : (
              <div className="space-y-2">
                {due.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.payment_method.toUpperCase()} • {new Date(payment.paid_at).toLocaleDateString()}
                      </p>
                      {payment.payment_reference && (
                        <p className="text-xs text-muted-foreground">Ref: {payment.payment_reference}</p>
                      )}
                    </div>
                    <Badge variant="default">Paid</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}