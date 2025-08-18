import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateDueDialog } from './CreateDueDialog';
import { PaymentDetailsDialog } from './PaymentDetailsDialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/payment-utils';
import { Plus, Users, DollarSign, Clock, CheckCircle } from 'lucide-react';

interface StudentProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
  payment_reference: string | null;
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

export function ProfessorPayments() {
  const [dues, setDues] = useState<StudentDueWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDue, setSelectedDue] = useState<StudentDueWithProfile | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();

  const fetchDues = async () => {
    try {
      const { data, error } = await supabase
        .from('student_dues')
        .select(`
          *,
          profiles:student_id (
            first_name,
            last_name,
            email
          ),
          subjects (
            name
          ),
          payments (
            id,
            amount,
            payment_method,
            paid_at,
            payment_reference
          )
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Type-safe transformation to handle potential null profiles
      const transformedData: StudentDueWithProfile[] = (data || []).map(due => ({
        ...due,
        profiles: Array.isArray(due.profiles) ? due.profiles[0] || null : due.profiles,
        subjects: Array.isArray(due.subjects) ? due.subjects[0] || null : due.subjects,
        payments: due.payments || []
      }));

      setDues(transformedData);
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

  useEffect(() => {
    fetchDues();
  }, []);

  const handleDueCreated = () => {
    fetchDues();
    setShowCreateDialog(false);
    toast({
      title: "Success",
      description: "Due created successfully",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getTotalPaid = (payments: PaymentRecord[]) => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const stats = {
    totalDues: dues.length,
    totalAmount: dues.reduce((sum, due) => sum + due.amount, 0),
    paidDues: dues.filter(due => due.status === 'paid').length,
    overdueDues: dues.filter(due => due.status === 'overdue').length,
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading dues...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Due
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dues</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDues}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidDues}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueDues}</div>
          </CardContent>
        </Card>
      </div>

      {/* Dues List */}
      <Card>
        <CardHeader>
          <CardTitle>Student Dues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dues.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No dues created yet</p>
            ) : (
              dues.map((due) => (
                <div
                  key={due.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => {
                    setSelectedDue(due);
                    setShowDetailsDialog(true);
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{due.description}</h3>
                      <Badge variant={getStatusBadgeVariant(due.status)}>
                        {due.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Student: {due.profiles ? `${due.profiles.first_name || ''} ${due.profiles.last_name || ''}`.trim() || due.profiles.email : 'Unknown'}
                      {due.subjects && ` • Subject: ${due.subjects.name}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(due.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(due.amount)}</p>
                    {due.payments.length > 0 && (
                      <p className="text-sm text-green-600">
                        Paid: {formatCurrency(getTotalPaid(due.payments))}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <CreateDueDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onDueCreated={handleDueCreated}
      />

      {selectedDue && (
        <PaymentDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          due={selectedDue}
          onRefresh={fetchDues}
        />
      )}
    </div>
  );
}