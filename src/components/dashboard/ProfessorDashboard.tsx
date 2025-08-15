import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, FileText, ClipboardList, Calendar, TrendingUp, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalSubjects: number;
  totalStudents: number;
  totalMaterials: number;
  totalAssignments: number;
  pendingSubmissions: number;
}

interface RecentActivity {
  id: string;
  type: 'submission' | 'enrollment' | 'material';
  title: string;
  subtitle: string;
  timestamp: string;
}

export const ProfessorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalSubjects: 0,
    totalStudents: 0,
    totalMaterials: 0,
    totalAssignments: 0,
    pendingSubmissions: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch subjects count
      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('professor_id', user?.id)
        .eq('is_active', true);

      // Fetch students count
      const { count: studentsCount } = await supabase
        .from('enrollments')
        .select(`
          *,
          subjects!inner(professor_id)
        `, { count: 'exact', head: true })
        .eq('subjects.professor_id', user?.id)
        .eq('is_active', true);

      // Fetch materials count
      const { count: materialsCount } = await supabase
        .from('study_materials')
        .select('*', { count: 'exact', head: true })
        .eq('professor_id', user?.id)
        .eq('is_active', true);

      // Fetch assignments count
      const { count: assignmentsCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('professor_id', user?.id)
        .eq('is_active', true);

      // Fetch pending submissions count
      const { count: pendingCount } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          assignments!inner(professor_id)
        `, { count: 'exact', head: true })
        .eq('assignments.professor_id', user?.id)
        .is('grade', null);

      setStats({
        totalSubjects: subjectsCount || 0,
        totalStudents: studentsCount || 0,
        totalMaterials: materialsCount || 0,
        totalAssignments: assignmentsCount || 0,
        pendingSubmissions: pendingCount || 0,
      });

      // Fetch recent activity
      await fetchRecentActivity();
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

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent submissions
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          submitted_at,
          assignments!inner(title, professor_id),
          profiles!inner(first_name, last_name)
        `)
        .eq('assignments.professor_id', user?.id)
        .order('submitted_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = (submissions as any)?.map((sub: any) => ({
        id: sub.id,
        type: 'submission' as const,
        title: `New submission for ${sub.assignments.title}`,
        subtitle: `by ${sub.profiles.first_name} ${sub.profiles.last_name}`,
        timestamp: sub.submitted_at,
      })) || [];

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Materials</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMaterials}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingSubmissions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/subjects')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Manage Subjects</h3>
                <p className="text-sm text-muted-foreground">Create and organize courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/students')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Manage Students</h3>
                <p className="text-sm text-muted-foreground">Enroll and track students</p>
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
                <p className="text-sm text-muted-foreground">Create and grade assignments</p>
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
                <p className="text-sm text-muted-foreground">Upload course resources</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/grading')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Grading Center</h3>
                <p className="text-sm text-muted-foreground">Grade student submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-muted">
                  <div className="flex-1">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString()}
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