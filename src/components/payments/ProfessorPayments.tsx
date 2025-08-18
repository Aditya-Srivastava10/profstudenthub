import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, getStatusColor } from '@/lib/payment-utils'
import { CreateDueDialog } from './CreateDueDialog'
import { PaymentDetailsDialog } from './PaymentDetailsDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Users, DollarSign, Clock, AlertTriangle } from 'lucide-react'

interface StudentDueWithProfile {
  id: string
  amount: number
  due_date: string
  description: string
  status: 'pending' | 'paid' | 'overdue' | 'failed'
  late_fee_percentage: number
  student_id: string
  subject_id?: string
  profiles: { first_name: string; last_name: string; email: string } | null | any
  subjects?: { name: string } | null
  payments: { amount: number; paid_at: string; payment_method: string }[]
}

export const ProfessorPayments = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [dues, setDues] = useState<StudentDueWithProfile[]>([])
  const [filteredDues, setFilteredDues] = useState<StudentDueWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDue, setSelectedDue] = useState<StudentDueWithProfile | null>(null)
  const [createDueOpen, setCreateDueOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    fetchDues()
  }, [user])

  useEffect(() => {
    filterDues()
  }, [dues, searchTerm])

  const fetchDues = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('student_dues')
        .select(`
          *,
          profiles!student_dues_student_id_fkey (first_name, last_name, email),
          subjects (name),
          payments (amount, paid_at, payment_method)
        `)
        .order('due_date', { ascending: false })

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

  const filterDues = () => {
    if (!searchTerm) {
      setFilteredDues(dues)
      return
    }

    const filtered = dues.filter(due => 
      due.profiles && (
        due.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        due.profiles.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        due.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      due.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (due.subjects?.name && due.subjects.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredDues(filtered)
  }

  const calculateTotalAmount = (due: StudentDueWithProfile) => {
    const today = new Date()
    const dueDate = new Date(due.due_date)
    
    if (today > dueDate && due.status !== 'paid') {
      const lateFee = Math.floor(due.amount * (due.late_fee_percentage / 100))
      return due.amount + lateFee
    }
    return due.amount
  }

  const totalOutstanding = filteredDues
    .filter(due => due.status === 'pending' || due.status === 'overdue')
    .reduce((sum, due) => sum + calculateTotalAmount(due), 0)

  const overdueCount = filteredDues.filter(due => due.status === 'overdue').length
  const paidThisMonth = filteredDues.filter(due => {
    const paidThisMonth = due.status === 'paid' && 
      new Date(due.due_date).getMonth() === new Date().getMonth()
    return paidThisMonth
  }).length

  const totalStudents = new Set(filteredDues.map(due => due.student_id)).size

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search students, subjects, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>
        <Button onClick={() => setCreateDueOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Due
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              From {filteredDues.filter(due => due.status !== 'paid').length} pending dues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Active student accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <Clock className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidThisMonth}</div>
            <p className="text-xs text-muted-foreground">Successfully collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Dues Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDues.map((due) => (
                <TableRow key={due.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {due.profiles ? `${due.profiles.first_name} ${due.profiles.last_name}` : 'Unknown Student'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {due.profiles?.email || 'No email'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{due.description}</TableCell>
                  <TableCell>{due.subjects?.name || '-'}</TableCell>
                  <TableCell className="font-medium">
                    <div>
                      {formatCurrency(calculateTotalAmount(due))}
                      {calculateTotalAmount(due) > due.amount && (
                        <div className="text-xs text-destructive">
                          +{formatCurrency(calculateTotalAmount(due) - due.amount)} late fee
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(due.due_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={due.status === 'paid' ? 'default' : due.status === 'overdue' ? 'destructive' : 'secondary'}
                      className={getStatusColor(due.status, 'text')}
                    >
                      {due.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedDue(due)
                        setDetailsOpen(true)
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateDueDialog 
        open={createDueOpen}
        onOpenChange={setCreateDueOpen}
        onDueCreated={fetchDues}
      />

      <PaymentDetailsDialog 
        due={selectedDue}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}