import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, calculateDaysLeft, getStatusColor } from '@/lib/payment-utils'
import { PaymentDialog } from './PaymentDialog'
import { PaymentHistory } from './PaymentHistory'
import { PaymentCountdown } from './PaymentCountdown'
import { Clock, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react'

interface StudentDue {
  id: string
  amount: number
  due_date: string
  description: string
  status: 'pending' | 'paid' | 'overdue' | 'failed'
  late_fee_percentage: number
  subject_id?: string
  subjects?: { name: string }
}

export const StudentPayments = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [dues, setDues] = useState<StudentDue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDue, setSelectedDue] = useState<StudentDue | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  useEffect(() => {
    fetchDues()
  }, [user])

  const fetchDues = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('student_dues')
        .select(`
          *,
          subjects (name)
        `)
        .eq('student_id', user.id)
        .order('due_date', { ascending: true })

      if (error) throw error
      setDues(data || [])
    } catch (error) {
      console.error('Error fetching dues:', error)
      toast({
        title: "Error",
        description: "Failed to load payment information",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = (due: StudentDue) => {
    setSelectedDue(due)
    setPaymentDialogOpen(true)
  }

  const calculateTotalAmount = (due: StudentDue) => {
    const today = new Date()
    const dueDate = new Date(due.due_date)
    
    if (today > dueDate && due.status !== 'paid') {
      const lateFee = Math.floor(due.amount * (due.late_fee_percentage / 100))
      return due.amount + lateFee
    }
    return due.amount
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const pendingDues = dues.filter(due => due.status === 'pending' || due.status === 'overdue')
  const upcomingDues = pendingDues.filter(due => {
    const daysLeft = calculateDaysLeft(due.due_date)
    return daysLeft > 0 && daysLeft <= 7
  })

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(pendingDues.reduce((sum, due) => sum + calculateTotalAmount(due), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingDues.length} pending payment{pendingDues.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDues.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(upcomingDues.reduce((sum, due) => sum + calculateTotalAmount(due), 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {dues.filter(due => due.status === 'overdue').length}
            </div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dues.filter(due => {
                const paidThisMonth = due.status === 'paid' && 
                  new Date(due.due_date).getMonth() === new Date().getMonth()
                return paidThisMonth
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
      {pendingDues.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Pending Payments</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingDues.map((due) => (
              <Card key={due.id} className={`border-l-4 ${getStatusColor(due.status, 'border')}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{due.description}</CardTitle>
                    <Badge variant={due.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {getStatusIcon(due.status)}
                      <span className="ml-1 capitalize">{due.status}</span>
                    </Badge>
                  </div>
                  {due.subjects && (
                    <p className="text-sm text-muted-foreground">Subject: {due.subjects.name}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">
                        {formatCurrency(calculateTotalAmount(due))}
                      </span>
                      {calculateTotalAmount(due) > due.amount && (
                        <Badge variant="destructive" className="text-xs">
                          +{formatCurrency(calculateTotalAmount(due) - due.amount)} late fee
                        </Badge>
                      )}
                    </div>
                    
                    <PaymentCountdown dueDate={due.due_date} status={due.status} />
                    
                    <Button 
                      onClick={() => handlePayment(due)}
                      className="w-full"
                      variant={due.status === 'overdue' ? 'destructive' : 'default'}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <PaymentHistory />

      {/* Payment Dialog */}
      <PaymentDialog 
        due={selectedDue}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onPaymentSuccess={fetchDues}
      />
    </div>
  )
}