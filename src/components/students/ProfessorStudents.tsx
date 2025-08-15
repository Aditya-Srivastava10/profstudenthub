import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EnrollStudentDialog } from "./EnrollStudentDialog";

interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  enrolled_at: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export const ProfessorStudents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudents();
      fetchSubjects();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          enrolled_at,
          subjects!inner(id, name, code),
          profiles!inner(id, email, first_name, last_name)
        `)
        .eq('subjects.professor_id', user?.id)
        .eq('is_active', true)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      const formattedStudents = (data as any)?.map((enrollment: any) => ({
        id: enrollment.profiles.id,
        email: enrollment.profiles.email,
        first_name: enrollment.profiles.first_name,
        last_name: enrollment.profiles.last_name,
        enrolled_at: enrollment.enrolled_at,
        subject: enrollment.subjects,
      })) || [];

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to fetch students",
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

  const handleUnenroll = async (studentId: string, subjectId: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ is_active: false })
        .eq('student_id', studentId)
        .eq('subject_id', subjectId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student unenrolled successfully",
      });

      fetchStudents();
    } catch (error) {
      console.error('Error unenrolling student:', error);
      toast({
        title: "Error",
        description: "Failed to unenroll student",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = selectedSubject === "all" 
    ? students 
    : students.filter(student => student.subject.id === selectedSubject);

  if (loading) {
    return <div>Loading students...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Enrolled Students</h2>
        <Button onClick={() => setEnrollDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Enroll Student
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.code} - {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No students enrolled yet.</p>
            <Button onClick={() => setEnrollDialogOpen(true)} className="mt-4">
              Enroll Your First Student
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student) => (
            <Card key={`${student.id}-${student.subject.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {student.first_name} {student.last_name}
                    </CardTitle>
                    <p className="text-muted-foreground">{student.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">
                        {student.subject.code} - {student.subject.name}
                      </Badge>
                      <Badge variant="outline">
                        Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnenroll(student.id, student.subject.id)}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Unenroll
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <EnrollStudentDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        subjects={subjects}
        onSuccess={fetchStudents}
      />
    </div>
  );
};