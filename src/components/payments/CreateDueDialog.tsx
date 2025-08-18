import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface CreateDueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDueCreated: () => void;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export function CreateDueDialog({ open, onOpenChange, onDueCreated }: CreateDueDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    description: '',
    amount: '',
    due_date: '',
    late_fee_percentage: '5',
  });

  useEffect(() => {
    if (open) {
      fetchStudents();
      fetchSubjects();
    }
  }, [open]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'student')
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('professor_id', user?.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id || !formData.description || !formData.amount || !formData.due_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('student_dues')
        .insert({
          student_id: formData.student_id,
          subject_id: formData.subject_id || null,
          description: formData.description,
          amount: Math.round(parseFloat(formData.amount) * 100), // Convert to paisa
          due_date: formData.due_date,
          late_fee_percentage: parseFloat(formData.late_fee_percentage),
        });

      if (error) throw error;

      onDueCreated();
      
      // Reset form
      setFormData({
        student_id: '',
        subject_id: '',
        description: '',
        amount: '',
        due_date: '',
        late_fee_percentage: '5',
      });
      
    } catch (error) {
      console.error('Error creating due:', error);
      toast({
        title: "Error",
        description: "Failed to create due. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Due</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student_id">Student *</Label>
            <Select
              value={formData.student_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, student_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} ({student.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject_id">Subject (Optional)</Label>
            <Select
              value={formData.subject_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Enter description for this due"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="late_fee_percentage">Late Fee (%)</Label>
              <Input
                id="late_fee_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.late_fee_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, late_fee_percentage: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              required
            />
          </div>

          <div className="flex gap-3">
            <Button 
              type="button"
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Due"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}