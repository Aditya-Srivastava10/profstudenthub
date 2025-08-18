import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateDueDialog } from "./CreateDueDialog";
import { PaymentDetailsDialog } from "./PaymentDetailsDialog";
import { formatCurrency, getStatusColor } from "@/lib/payment-utils";
import { Plus, Users, DollarSign, Clock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentDueWithProfile {
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
  } | null | any;
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
}

export function ProfessorPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dues, setDues] = useState<StudentDueWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<StudentDueWithProfile | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDues();
    }
  }, [user]);

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
          subjects:subject_id (
            name,
            code
          ),
          payments (
            id,
            amount,
            payment_method,
            paid_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDues(data || []);
    } catch (error) {
      console.error('Error fetching dues:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dues data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDueCreated = () => {
    fetchDues();
    setCreateDialogOpen(false);
    toast({
      title: "Due Created",
      description: "Student due has been created successfully",
    });
  };

  const totalOutstanding = dues
    .filter(due => due.status === 'pending' || due.status === 'overdue')
    .reduce((sum, due) => sum + due.amount, 0);

  const totalCollected = dues
    .filter(due => due.status === 'paid')
    .reduce((sum, due) => sum + due.amount, 0);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {new Set(dues.map(due => due.student_id)).size}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalOutstanding)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCollected)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {dues.filter(due => due.status === 'pending' || due.status === 'overdue').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Due
        </Button>
      </div>

      {/* Dues Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Dues Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-muted-foreground">Student</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dues.map((due) => (
                  <tr key={due.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium text-foreground">
                          {due.profiles?.first_name} {due.profiles?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {due.profiles?.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium text-foreground">{due.description}</div>
                        {due.subjects && (
                          <div className="text-sm text-muted-foreground">
                            {due.subjects.name} ({due.subjects.code})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 font-medium text-foreground">
                      {formatCurrency(due.amount)}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(due.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-2">
                      <Badge variant={getStatusColor(due.status)} className="text-xs">
                        {due.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDue(due);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {dues.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No dues found. Create your first due to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateDueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onDueCreated={handleDueCreated}
      />

      {selectedDue && (
        <PaymentDetailsDialog
          due={selectedDue}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </div>
  );
}