import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, ClipboardList, Calendar, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentStats {
  enrolledSubjects: number;
  availableMaterials: number;
  assignmentsDue: number;
  submittedAssignments: number;
}

interface UpcomingAssignment {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  max_points: number;
  is_submitted: boolean;
}

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<StudentStats>({
    enrolledSubjects: 0,
    availableMaterials: 0,
    assignmentsDue: 0,
    submittedAssignments: 0,
  });
  const [upcomingAssignments, setUpcomingAssignments] = useState<UpcomingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch enrolled subjects count
      const { count: subjectsCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user?.id)
        .eq('is_active', true);

      // Fetch available materials count
      const { count: materialsCount } = await supabase
        .from('study_materials')
        .select(`
          *,
          subjects!inner(id),
          enrollments!inner(student_id, subject_id)
        `, { count: 'exact', head: true })
        .eq('enrollments.student_id', user?.id)
        .eq('is_active', true);

      // Fetch assignments for enrolled subjects
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects!inner(name, code),
          assignment_submissions(id, student_id)
        `)
        .eq('assignment_submissions.student_id', user?.id)
        .eq('is_active', true);

      const assignmentsDue = (assignments as any)?.filter((a: any) => 
        a.due_date && new Date(a.due_date) > new Date() && 
        !a.assignment_submissions?.length
      ).length || 0;

      const submittedCount = (assignments as any)?.filter((a: any) => 
        a.assignment_submissions?.length > 0
      ).length || 0;

      setStats({
        enrolledSubjects: subjectsCount || 0,
        availableMaterials: materialsCount || 0,
        assignmentsDue,
        submittedAssignments: submittedCount,
      });

      // Set upcoming assignments
      const upcoming = (assignments as any)
        ?.filter((a: any) => 
          a.due_date && new Date(a.due_date) > new Date()
        )
        ?.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        ?.slice(0, 5)
        ?.map((a: any) => ({
          id: a.id,
          title: a.title,
          subject: `${a.subjects.code} - ${a.subjects.name}`,
          due_date: a.due_date,
          max_points: a.max_points,
          is_submitted: a.assignment_submissions?.length > 0,
        })) || [];

      setUpcomingAssignments(upcoming);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    if (diffDays < 7) return `Due in ${diffDays} days`;
    
    return `Due ${date.toLocaleDateString()}`;
  };

  const getDueDateVariant = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return "destructive";
    if (diffDays <= 3) return "secondary";
    return "outline";
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enrolledSubjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Materials</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableMaterials}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments Due</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.assignmentsDue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.submittedAssignments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/subjects')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">My Subjects</h3>
                <p className="text-sm text-muted-foreground">View enrolled courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/assignments')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Assignments</h3>
                <p className="text-sm text-muted-foreground">View and submit work</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/materials')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Study Materials</h3>
                <p className="text-sm text-muted-foreground">Access course resources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAssignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No upcoming assignments</p>
          ) : (
            <div className="space-y-4">
              {upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <h4 className="font-medium">{assignment.title}</h4>
                    <p className="text-sm text-muted-foreground">{assignment.subject}</p>
                    <p className="text-sm text-muted-foreground">{assignment.max_points} points</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {assignment.is_submitted ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Submitted
                      </Badge>
                    ) : (
                      <Badge variant={getDueDateVariant(assignment.due_date)}>
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDueDate(assignment.due_date)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};