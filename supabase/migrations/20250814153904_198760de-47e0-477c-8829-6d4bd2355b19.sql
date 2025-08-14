-- Create storage bucket for study materials
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', false);

-- Create study_materials table
CREATE TABLE public.study_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL,
  professor_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  topic TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_materials
CREATE POLICY "Professors can manage materials for their subjects" 
ON public.study_materials 
FOR ALL 
USING (
  professor_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = study_materials.subject_id 
    AND subjects.professor_id = auth.uid()
  )
);

CREATE POLICY "Students can view materials for enrolled subjects" 
ON public.study_materials 
FOR SELECT 
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.subject_id = study_materials.subject_id 
    AND enrollments.student_id = auth.uid()
    AND enrollments.is_active = true
  )
);

-- Storage policies for study materials
CREATE POLICY "Professors can upload materials for their subjects" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Professors can update their materials" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Professors can delete their materials" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view materials for enrolled subjects" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'study-materials' AND
  EXISTS (
    SELECT 1 FROM study_materials sm
    JOIN enrollments e ON e.subject_id = sm.subject_id
    WHERE sm.file_path = name
    AND e.student_id = auth.uid()
    AND e.is_active = true
    AND sm.is_active = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_study_materials_updated_at
BEFORE UPDATE ON public.study_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();