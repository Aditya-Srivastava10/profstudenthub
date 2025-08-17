import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatPaymentMethod, getStatusColor } from '@/lib/payment-utils'
import { Send, Download } from 'lucide-react'

interface PaymentDetailsDialogProps {
  due: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_reference: string | null
  paid_at: string
}

export const PaymentDetailsDialog = ({ due, open, onOpenChange }: PaymentDetailsDialogProps) => {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && due) {
      fetchPayments()
    }
  }, [open, due])

  const fetchPayments = async () => {
    if (!due) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('due_id', due.id)
        .order('paid_at', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast({
        title: "Error",
        description: "Failed to load payment details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const sendReminder = async () => {
    if (!due) return

    try {
      // Create a reminder record
      const { error } = await supabase
        .from('payment_reminders')
        .insert({
          due_id: due.id,
          student_id: due.student_id,
          reminder_type: 'email',
          days_before: 0,
          sent_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: "Reminder Sent",
        description: "Payment reminder has been sent to the student.",
      })
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive"
      })
    }
  }

  const exportPaymentData = () => {
    if (!due) return

    const exportData = {
      student: {
        name: `${due.profiles.first_name} ${due.profiles.last_name}`,
        email: due.profiles.email
      },
      due: {
        description: due.description,
        amount: due.amount,
        dueDate: due.due_date,
        status: due.status,
        subject: due.subjects?.name
      },
      payments: payments.map(payment => ({
        amount: payment.amount,
        method: payment.payment_method,
        reference: payment.payment_reference,
        date: payment.paid_at
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-details-${due.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Data Exported",
      description: "Payment details have been exported successfully.",
    })
  }

  if (!due) return null

  const calculateTotalAmount = () => {
    const today = new Date()
    const dueDate = new Date(due.due_date)
    
    if (today > dueDate && due.status !== 'paid') {
      const lateFee = Math.floor(due.amount * (due.late_fee_percentage / 100))
      return due.amount + lateFee
    }
    return due.amount
  }

  const totalAmount = calculateTotalAmount()
  const lateFee = totalAmount - due.amount
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const outstanding = totalAmount - totalPaid

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            Detailed information for {due.profiles.first_name} {due.profiles.last_name}'s payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Student Information</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {due.profiles.first_name} {due.profiles.last_name}</p>
                <p><strong>Email:</strong> {due.profiles.email}</p>
                {due.subjects && (
                  <p><strong>Subject:</strong> {due.subjects.name}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Due Information</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Description:</strong> {due.description}</p>
                <p><strong>Due Date:</strong> {new Date(due.due_date).toLocaleDateString()}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <Badge 
                    variant={due.status === 'paid' ? 'default' : due.status === 'overdue' ? 'destructive' : 'secondary'}
                    className={getStatusColor(due.status, 'text')}
                  >
                    {due.status}
                  </Badge>
                </p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Base Amount:</span>
                <span>{formatCurrency(due.amount)}</span>
              </div>
              {lateFee > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Late Fee ({due.late_fee_percentage}%):</span>
                  <span>+{formatCurrency(lateFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total Amount:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Total Paid:</span>
                <span>{formatCurrency(totalPaid)}</span>
              </div>
              {outstanding > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Outstanding:</span>
                  <span>{formatCurrency(outstanding)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Payment History</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatPaymentMethod(payment.payment_method)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {payment.payment_reference || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.paid_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            {due.status !== 'paid' && (
              <Button onClick={sendReminder} variant="outline">
                <Send className="mr-2 h-4 w-4" />
                Send Reminder
              </Button>
            )}
            <Button onClick={exportPaymentData} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button onClick={() => onOpenChange(false)} className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}