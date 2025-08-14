-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE NOT NULL,
  professor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  fee_amount INTEGER DEFAULT 0, -- in cents
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Create policies for subjects
CREATE POLICY "Professors can manage their own subjects"
ON public.subjects
FOR ALL
USING (professor_id = auth.uid());

CREATE POLICY "Students can view active subjects"
ON public.subjects
FOR SELECT
USING (is_active = true);

-- Create enrollments table to track student-subject relationships
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(student_id, subject_id)
);

-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for enrollments
CREATE POLICY "Students can view their own enrollments"
ON public.enrollments
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Professors can manage enrollments for their subjects"
ON public.enrollments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.subjects 
    WHERE subjects.id = enrollments.subject_id 
    AND subjects.professor_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_subjects_professor_id ON public.subjects(professor_id);
CREATE INDEX idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_subject_id ON public.enrollments(subject_id);