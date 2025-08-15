import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onSuccess: () => void;
}

export const CreateAssignmentDialog = ({ open, onOpenChange, subjects, onSuccess }: CreateAssignmentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    due_date: '',
    max_points: 100,
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);

    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          title: formData.title,
          description: formData.description,
          subject_id: formData.subject_id,
          professor_id: user.id,
          due_date: formData.due_date || null,
          max_points: formData.max_points,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment created successfully",
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        subject_id: '',
        due_date: '',
        max_points: 100,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
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

          <div>
            <Label htmlFor="due_date">Due Date (Optional)</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="max_points">Maximum Points</Label>
            <Input
              id="max_points"
              type="number"
              min="1"
              value={formData.max_points}
              onChange={(e) => setFormData({ ...formData, max_points: parseInt(e.target.value) || 100 })}
            />
          </div>

          <Button type="submit" disabled={creating || !formData.subject_id || !formData.title}>
            {creating ? (
              "Creating..."
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};