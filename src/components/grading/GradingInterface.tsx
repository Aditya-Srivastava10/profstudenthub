import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Eye, Users, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Assignment {
  id: string;
  title: string;
  max_points: number;
  subject: {
    name: string;
    code: string;
  };
}

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  submitted_at: string;
  submitted_text: string;
  file_name: string;
  file_path: string;
  grade: number;
  feedback: string;
  is_late: boolean;
  graded_at: string;
  student: {
    first_name: string;
    last_name: string;
    email: string;
  };
  assignment: Assignment;
}

export const GradingInterface = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({ grade: "", feedback: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignments();
      fetchSubmissions();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedAssignment !== "all") {
      fetchSubmissions();
    }
  }, [selectedAssignment, user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          max_points,
          subjects!inner(name, code)
        `)
        .eq('professor_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      const formattedAssignments = (data as any)?.map((assignment: any) => ({
        ...assignment,
        subject: assignment.subjects,
      })) || [];

      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
        variant: "destructive",
      });
    }
  };

  const fetchSubmissions = async () => {
    try {
      let query = supabase
        .from('assignment_submissions')
        .select(`
          *,
          profiles!inner(first_name, last_name, email),
          assignments!inner(
            id, title, max_points,
            subjects!inner(name, code, professor_id)
          )
        `)
        .eq('assignments.subjects.professor_id', user?.id)
        .order('submitted_at', { ascending: false });

      if (selectedAssignment !== "all") {
        query = query.eq('assignment_id', selectedAssignment);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedSubmissions = (data as any)?.map((submission: any) => ({
        ...submission,
        student: submission.profiles,
        assignment: {
          ...submission.assignments,
          subject: submission.assignments.subjects,
        },
      })) || [];

      setSubmissions(formattedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeForm({
      grade: submission.grade?.toString() || "",
      feedback: submission.feedback || "",
    });
    setGradeDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;

    try {
      const grade = parseInt(gradeForm.grade);
      if (isNaN(grade) || grade < 0 || grade > selectedSubmission.assignment.max_points) {
        toast({
          title: "Invalid Grade",
          description: `Grade must be between 0 and ${selectedSubmission.assignment.max_points}`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: grade,
          feedback: gradeForm.feedback,
          graded_at: new Date().toISOString(),
          graded_by: user?.id,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Grade saved successfully",
      });

      setGradeDialogOpen(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: "Error",
        description: "Failed to save grade",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (submission: Submission) => {
    if (!submission.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('assignment-submissions')
        .download(submission.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = submission.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
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

  const getSubmissionStats = () => {
    const total = submissions.length;
    const graded = submissions.filter(s => s.grade !== null).length;
    const pending = total - graded;
    
    return { total, graded, pending };
  };

  const stats = getSubmissionStats();

  if (loading) {
    return <div>Loading grading interface...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total: {stats.total}</span>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Graded: {stats.graded}</span>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Pending: {stats.pending}</span>
            </div>
          </Card>
        </div>

        <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Filter by assignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            {assignments.map((assignment) => (
              <SelectItem key={assignment.id} value={assignment.id}>
                {assignment.subject.code} - {assignment.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No submissions found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {submission.student.first_name} {submission.student.last_name}
                    </CardTitle>
                    <p className="text-muted-foreground">{submission.student.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">
                        {submission.assignment.subject.code} - {submission.assignment.title}
                      </Badge>
                      {submission.is_late && (
                        <Badge variant="destructive">Late</Badge>
                      )}
                      {submission.grade !== null ? (
                        <Badge variant="default">
                          Graded: {submission.grade}/{submission.assignment.max_points}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending Grade</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {submission.file_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFile(submission)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGradeSubmission(submission)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {submission.grade !== null ? 'Edit Grade' : 'Grade'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Submitted:</strong> {formatDate(submission.submitted_at)}
                  </p>
                  {submission.submitted_text && (
                    <div>
                      <strong className="text-sm">Text Submission:</strong>
                      <p className="text-sm bg-muted p-2 rounded mt-1">{submission.submitted_text}</p>
                    </div>
                  )}
                  {submission.file_name && (
                    <p className="text-sm">
                      <strong>File:</strong> {submission.file_name}
                    </p>
                  )}
                  {submission.feedback && (
                    <div>
                      <strong className="text-sm">Feedback:</strong>
                      <p className="text-sm bg-muted p-2 rounded mt-1">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grading Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Grade Submission: {selectedSubmission?.assignment.title}
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">
                  {selectedSubmission.student.first_name} {selectedSubmission.student.last_name}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Submitted: {formatDate(selectedSubmission.submitted_at)}
                </p>
                {selectedSubmission.submitted_text && (
                  <div className="mb-2">
                    <strong className="text-sm">Text Submission:</strong>
                    <p className="text-sm mt-1">{selectedSubmission.submitted_text}</p>
                  </div>
                )}
                {selectedSubmission.file_name && (
                  <p className="text-sm">
                    <strong>File:</strong> {selectedSubmission.file_name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="grade">
                  Grade (0 - {selectedSubmission.assignment.max_points})
                </Label>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  max={selectedSubmission.assignment.max_points}
                  value={gradeForm.grade}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="feedback">Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  rows={4}
                  placeholder="Provide feedback for the student..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveGrade}>
                  Save Grade
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};