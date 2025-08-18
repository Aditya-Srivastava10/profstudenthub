import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateDueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDueCreated: () => void;
}

interface Student {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface Subject {
  id: string;
  name: string;
}

export function CreateDueDialog({ open, onOpenChange, onDueCreated }: CreateDueDialogProps) {
  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    description: '',
    amount: '',
    due_date: '',
    late_fee_percentage: '5',
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
        .eq('role', 'student');

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
        .select('id, name')
        .eq('is_active', true);

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
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_dues')
        .insert([{
          student_id: formData.student_id,
          subject_id: formData.subject_id || null,
          description: formData.description,
          amount: parseInt(formData.amount),
          due_date: formData.due_date,
          late_fee_percentage: parseFloat(formData.late_fee_percentage),
        }]);

      if (error) throw error;

      onDueCreated();
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
        description: "Failed to create due",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStudentDisplayName = (student: Student) => {
    const name = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    return name || student.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Due</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="student">Student *</Label>
            <Select value={formData.student_id} onValueChange={(value) => setFormData(prev => ({ ...prev, student_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {getStudentDisplayName(student)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Select value={formData.subject_id} onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Subject</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter due description"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="late_fee">Late Fee (%)</Label>
              <Input
                id="late_fee"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.late_fee_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, late_fee_percentage: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Due'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}