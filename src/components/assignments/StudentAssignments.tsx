import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Upload, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SubmitAssignmentDialog } from "./SubmitAssignmentDialog";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  created_at: string;
  subjects: {
    name: string;
    code: string;
  };
  assignment_submissions?: {
    id: string;
    submitted_at: string;
    grade: number;
    feedback: string;
    is_late: boolean;
  }[];
}

export const StudentAssignments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects!inner(name, code),
          assignment_submissions(id, submitted_at, grade, feedback, is_late)
        `)
        .eq('is_active', true)
        .eq('assignment_submissions.student_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments((data as any) || []);
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

  const handleSubmit = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmitDialogOpen(true);
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

  const getSubmissionStatus = (assignment: Assignment) => {
    const submission = assignment.assignment_submissions?.[0];
    if (!submission) {
      if (assignment.due_date && isOverdue(assignment.due_date)) {
        return { status: 'overdue', color: 'destructive' as const };
      }
      return { status: 'pending', color: 'secondary' as const };
    }
    
    if (submission.grade !== null) {
      return { status: 'graded', color: 'default' as const };
    }
    
    return { status: 'submitted', color: 'secondary' as const };
  };

  if (loading) {
    return <div>Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">My Assignments</h2>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No assignments available for your enrolled subjects.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const submission = assignment.assignment_submissions?.[0];
            const status = getSubmissionStatus(assignment);
            
            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">
                          {assignment.subjects.code} - {assignment.subjects.name}
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
                        <Badge variant={status.color}>
                          {status.status === 'submitted' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {status.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    {!submission && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSubmit(assignment)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Submit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{assignment.description}</p>
                  
                  {submission && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Your Submission</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Submitted: {formatDate(submission.submitted_at)}</p>
                        {submission.is_late && (
                          <p className="text-destructive">Late submission</p>
                        )}
                        {submission.grade !== null && (
                          <p>Grade: {submission.grade}/{assignment.max_points}</p>
                        )}
                        {submission.feedback && (
                          <p>Feedback: {submission.feedback}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedAssignment && (
        <SubmitAssignmentDialog
          open={submitDialogOpen}
          onOpenChange={setSubmitDialogOpen}
          assignment={selectedAssignment}
          onSuccess={fetchAssignments}
        />
      )}
    </div>
  );
};