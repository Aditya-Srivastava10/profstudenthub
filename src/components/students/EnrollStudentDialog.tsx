import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface EnrollStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onSuccess: () => void;
}

export const EnrollStudentDialog = ({ open, onOpenChange, subjects, onSuccess }: EnrollStudentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    subject_id: '',
  });
  const [enrolling, setEnrolling] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setEnrolling(true);

    try {
      // First, find the student by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', formData.email)
        .single();

      if (profileError || !profileData) {
        throw new Error('Student not found with this email');
      }

      if (profileData.role !== 'student') {
        throw new Error('User is not a student');
      }

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', profileData.id)
        .eq('subject_id', formData.subject_id)
        .eq('is_active', true)
        .single();

      if (existingEnrollment) {
        throw new Error('Student is already enrolled in this subject');
      }

      // Enroll the student
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          student_id: profileData.id,
          subject_id: formData.subject_id,
        });

      if (enrollError) throw enrollError;

      toast({
        title: "Success",
        description: "Student enrolled successfully",
      });

      // Reset form
      setFormData({
        email: '',
        subject_id: '',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to enroll student",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enroll Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Student Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="student@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.code} - {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={enrolling || !formData.subject_id || !formData.email}>
            {enrolling ? (
              "Enrolling..."
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Enroll Student
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};