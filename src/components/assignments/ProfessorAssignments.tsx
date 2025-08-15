import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Calendar, Users, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  created_at: string;
  subject: {
    name: string;
    code: string;
  };
  submission_count?: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export const ProfessorAssignments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAssignments();
      fetchSubjects();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects!inner(name, code)
        `)
        .eq('professor_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch submission counts for each assignment
      const assignmentsWithCounts = await Promise.all(
        (data || []).map(async (assignment: any) => {
          const { count } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id);

          return {
            ...assignment,
            subject: assignment.subjects,
            submission_count: count || 0,
          };
        })
      );

      setAssignments(assignmentsWithCounts);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('professor_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleDelete = async (assignment: Assignment) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ is_active: false })
        .eq('id', assignment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });

      fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return <div>Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">My Assignments</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No assignments created yet.</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
              Create Your First Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">
                        {assignment.subject.code} - {assignment.subject.name}
                      </Badge>
                      <Badge variant="outline">
                        {assignment.max_points} points
                      </Badge>
                      {assignment.due_date && (
                        <Badge variant={isOverdue(assignment.due_date) ? "destructive" : "default"}>
                          <Calendar className="h-3 w-3 mr-1" />
                          Due: {formatDate(assignment.due_date)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(assignment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{assignment.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{assignment.submission_count} submissions</span>
                  </div>
                  <span>Created: {formatDate(assignment.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAssignmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        subjects={subjects}
        onSuccess={fetchAssignments}
      />
    </div>
  );
};