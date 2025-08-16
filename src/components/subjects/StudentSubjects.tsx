import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, DollarSign, Calendar, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  fee_amount: number;
  created_at: string;
  isEnrolled?: boolean;
  enrollmentId?: string;
}

export const StudentSubjects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    try {
      // Fetch all active subjects
      const { data: allSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (subjectsError) throw subjectsError;

      // Fetch student's enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('subject_id, id')
        .eq('student_id', user?.id)
        .eq('is_active', true);

      if (enrollmentsError) throw enrollmentsError;

      // Combine the data
      const subjectsWithEnrollment = allSubjects?.map(subject => ({
        ...subject,
        isEnrolled: enrollments?.some(e => e.subject_id === subject.id),
        enrollmentId: enrollments?.find(e => e.subject_id === subject.id)?.id
      })) || [];

      setSubjects(subjectsWithEnrollment);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (subjectId: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: user?.id,
          subject_id: subjectId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully enrolled in the subject",
      });

      fetchSubjects();
    } catch (error) {
      console.error('Error enrolling:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in subject",
        variant: "destructive",
      });
    }
  };

  const handleUnenroll = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ is_active: false })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully unenrolled from the subject",
      });

      fetchSubjects();
    } catch (error) {
      console.error('Error unenrolling:', error);
      toast({
        title: "Error",
        description: "Failed to unenroll from subject",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading subjects...</div>;
  }

  const enrolledSubjects = subjects.filter(s => s.isEnrolled);
  const availableSubjects = subjects.filter(s => !s.isEnrolled);

  return (
    <div className="space-y-8">
      {/* Enrolled Subjects */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">My Enrolled Subjects</h2>
        {enrolledSubjects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">You're not enrolled in any subjects yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledSubjects.map((subject) => (
              <Card key={subject.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {subject.code}
                      </Badge>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Enrolled
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {subject.description}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>${subject.fee_amount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Enrolled {new Date(subject.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => subject.enrollmentId && handleUnenroll(subject.enrollmentId)}
                    className="w-full"
                  >
                    Unenroll
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Subjects */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Available Subjects</h2>
        {availableSubjects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No additional subjects available for enrollment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableSubjects.map((subject) => (
              <Card key={subject.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {subject.code}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {subject.description}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>${subject.fee_amount}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleEnroll(subject.id)}
                    className="w-full"
                  >
                    Enroll Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};