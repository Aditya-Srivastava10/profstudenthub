import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  due_date: string;
}

interface SubmitAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
  onSuccess: () => void;
}

export const SubmitAssignmentDialog = ({ open, onOpenChange, assignment, onSuccess }: SubmitAssignmentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    submitted_text: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      let filePath = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        fileName = file.name;
        filePath = `${user.id}/${assignment.id}/${Date.now()}.${fileExt}`;
        fileSize = file.size;
        fileType = file.type;

        const { error: uploadError } = await supabase.storage
          .from('assignment-submissions')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
      }

      // Check if submission is late
      const isLate = assignment.due_date ? new Date() > new Date(assignment.due_date) : false;

      // Save submission record to database
      const { error: dbError } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignment.id,
          student_id: user.id,
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          file_type: fileType,
          submitted_text: formData.submitted_text || null,
          is_late: isLate,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: isLate ? "Assignment submitted successfully (late submission)" : "Assignment submitted successfully",
      });

      // Reset form
      setFormData({
        submitted_text: '',
      });
      setFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to submit assignment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Assignment: {assignment.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="submitted_text">Text Submission (Optional)</Label>
            <Textarea
              id="submitted_text"
              value={formData.submitted_text}
              onChange={(e) => setFormData({ ...formData, submitted_text: e.target.value })}
              rows={4}
              placeholder="Enter your text submission here..."
            />
          </div>

          <div>
            <Label htmlFor="file">File Submission (Optional)</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {assignment.due_date && new Date() > new Date(assignment.due_date) && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-destructive text-sm">
                This assignment is past its due date. Your submission will be marked as late.
              </p>
            </div>
          )}

          <Button type="submit" disabled={submitting || (!file && !formData.submitted_text.trim())}>
            {submitting ? (
              "Submitting..."
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submit Assignment
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};