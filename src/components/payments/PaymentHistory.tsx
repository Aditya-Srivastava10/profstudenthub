import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatPaymentMethod } from '@/lib/payment-utils'
import { Download, Receipt } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_reference: string | null
  paid_at: string
  student_dues: {
    description: string
    subjects?: { name: string }
  }
}

export const PaymentHistory = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [user])

  const fetchPayments = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          student_dues (
            description,
            subjects (name)
          )
        `)
        .eq('student_id', user.id)
        .order('paid_at', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payment history:', error)
      toast({
        title: "Error",
        description: "Failed to load payment history",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateReceipt = (payment: Payment) => {
    // In a real application, this would generate a PDF receipt
    const receiptData = {
      id: payment.id,
      amount: payment.amount,
      date: payment.paid_at,
      method: payment.payment_method,
      reference: payment.payment_reference,
      description: payment.student_dues.description,
      subject: payment.student_dues.subjects?.name
    }

    // Mock receipt generation
    const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${payment.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Receipt Downloaded",
      description: "Your payment receipt has been downloaded.",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Payment History</h3>
            <p className="text-muted-foreground">
              Your payment history will appear here once you make your first payment.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium max-w-xs truncate">
                  {payment.student_dues.description}
                </TableCell>
                <TableCell>
                  {payment.student_dues.subjects?.name || '-'}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(payment.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {formatPaymentMethod(payment.payment_method)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(payment.paid_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {payment.payment_reference || '-'}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateReceipt(payment)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Receipt
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}