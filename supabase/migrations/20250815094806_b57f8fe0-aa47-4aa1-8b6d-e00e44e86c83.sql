-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID NOT NULL,
  professor_id UUID NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  max_points INTEGER DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL,
  student_id UUID NOT NULL,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  submitted_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  grade INTEGER,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  is_late BOOLEAN DEFAULT false,
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignments
CREATE POLICY "Professors can manage assignments for their subjects" 
ON public.assignments 
FOR ALL 
USING (professor_id = auth.uid() AND EXISTS (
  SELECT 1 FROM subjects 
  WHERE subjects.id = assignments.subject_id 
  AND subjects.professor_id = auth.uid()
));

CREATE POLICY "Students can view assignments for enrolled subjects" 
ON public.assignments 
FOR SELECT 
USING (is_active = true AND EXISTS (
  SELECT 1 FROM enrollments 
  WHERE enrollments.subject_id = assignments.subject_id 
  AND enrollments.student_id = auth.uid() 
  AND enrollments.is_active = true
));

-- RLS policies for assignment submissions
CREATE POLICY "Students can manage their own submissions" 
ON public.assignment_submissions 
FOR ALL 
USING (student_id = auth.uid());

CREATE POLICY "Professors can view submissions for their assignments" 
ON public.assignment_submissions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM assignments 
  WHERE assignments.id = assignment_submissions.assignment_id 
  AND assignments.professor_id = auth.uid()
));

CREATE POLICY "Professors can update grades and feedback" 
ON public.assignment_submissions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM assignments 
  WHERE assignments.id = assignment_submissions.assignment_id 
  AND assignments.professor_id = auth.uid()
));

-- Create storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-submissions', 'assignment-submissions', false);

-- Create storage policies for assignment submissions
CREATE POLICY "Students can upload their own assignment submissions" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'assignment-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view their own assignment submissions" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'assignment-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Professors can view submissions for their assignments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'assignment-submissions' AND EXISTS (
  SELECT 1 FROM assignment_submissions 
  JOIN assignments ON assignments.id = assignment_submissions.assignment_id 
  WHERE assignments.professor_id = auth.uid() 
  AND assignment_submissions.file_path = name
));

-- Add triggers for updated_at
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_assignments_subject_id ON public.assignments(subject_id);
CREATE INDEX idx_assignments_professor_id ON public.assignments(professor_id);
CREATE INDEX idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);