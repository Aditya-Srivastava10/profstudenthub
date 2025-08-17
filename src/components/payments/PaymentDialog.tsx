import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatPaymentMethod } from '@/lib/payment-utils'
import { CreditCard, Smartphone, Building2, Banknote } from 'lucide-react'

interface PaymentDialogProps {
  due: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentSuccess: () => void
}

const paymentMethods = [
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
  { id: 'upi', name: 'UPI', icon: Smartphone },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: Building2 },
  { id: 'cash', name: 'Cash', icon: Banknote },
]

export const PaymentDialog = ({ due, open, onOpenChange, onPaymentSuccess }: PaymentDialogProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedMethod, setSelectedMethod] = useState('card')
  const [paymentReference, setPaymentReference] = useState('')
  const [loading, setLoading] = useState(false)

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

  const handlePayment = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          student_id: user.id,
          due_id: due.id,
          amount: totalAmount,
          payment_method: selectedMethod as 'card' | 'upi' | 'bank_transfer' | 'cash',
          payment_reference: paymentReference || null,
          paid_at: new Date().toISOString(),
        })

      if (paymentError) throw paymentError

      // Update due status
      const { error: updateError } = await supabase
        .from('student_dues')
        .update({ status: 'paid' })
        .eq('id', due.id)

      if (updateError) throw updateError

      toast({
        title: "Payment Successful",
        description: `Payment of ${formatCurrency(totalAmount)} has been processed successfully.`,
      })

      // Generate receipt (in a real app, this would be handled by the payment gateway)
      const receiptData = {
        dueId: due.id,
        amount: totalAmount,
        method: selectedMethod,
        reference: paymentReference,
        timestamp: new Date().toISOString(),
      }

      console.log('Receipt data:', receiptData) // This would be sent to receipt generation service

      onPaymentSuccess()
      onOpenChange(false)
      setPaymentReference('')
    } catch (error) {
      console.error('Payment error:', error)
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            Complete your payment for {due.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
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
            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <Label className="text-sm font-medium">Payment Method</Label>
            <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod} className="mt-2">
              {paymentMethods.map((method) => {
                const IconComponent = method.icon
                return (
                  <div key={method.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={method.id} id={method.id} />
                    <Label htmlFor={method.id} className="flex items-center space-x-2 cursor-pointer">
                      <IconComponent className="h-4 w-4" />
                      <span>{method.name}</span>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Payment Reference */}
          <div>
            <Label htmlFor="reference" className="text-sm font-medium">
              Payment Reference (Optional)
            </Label>
            <Input
              id="reference"
              placeholder="Transaction ID, UPI reference, etc."
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Payment Instructions */}
          <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <strong>Payment Instructions:</strong>
            <ul className="mt-1 space-y-1">
              {selectedMethod === 'card' && (
                <li>• You will be redirected to secure payment gateway</li>
              )}
              {selectedMethod === 'upi' && (
                <li>• Scan QR code or use UPI ID for payment</li>
              )}
              {selectedMethod === 'bank_transfer' && (
                <li>• Use provided bank details for transfer</li>
              )}
              {selectedMethod === 'cash' && (
                <li>• Visit the office for cash payment</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePayment}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : `Pay ${formatCurrency(totalAmount)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}