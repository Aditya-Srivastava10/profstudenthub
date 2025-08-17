-- Create payment_methods enum
CREATE TYPE public.payment_method AS ENUM ('card', 'upi', 'bank_transfer', 'cash');

-- Create payment_status enum  
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'failed');

-- Create student_dues table
CREATE TABLE public.student_dues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  subject_id UUID,
  amount INTEGER NOT NULL, -- Amount in cents
  due_date DATE NOT NULL,
  description TEXT NOT NULL,
  late_fee_percentage DECIMAL(5,2) DEFAULT 5.00,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  due_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- Amount paid in cents
  payment_method payment_method NOT NULL,
  payment_reference TEXT,
  payment_gateway_id TEXT,
  receipt_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_reminders table
CREATE TABLE public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  due_id UUID NOT NULL,
  student_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- 'email' or 'sms'
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_dues
CREATE POLICY "Students can view their own dues" 
ON public.student_dues 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Professors can view dues for their students" 
ON public.student_dues 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'professor'
));

CREATE POLICY "Professors can manage dues" 
ON public.student_dues 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'professor'
));

-- RLS Policies for payments
CREATE POLICY "Students can view their own payments" 
ON public.payments 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Professors can view all payments" 
ON public.payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'professor'
));

-- RLS Policies for payment_reminders
CREATE POLICY "Students can view their own reminders" 
ON public.payment_reminders 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "System can manage reminders" 
ON public.payment_reminders 
FOR ALL 
USING (true);

-- Add foreign key constraints
ALTER TABLE public.student_dues 
ADD CONSTRAINT fk_student_dues_student 
FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.student_dues 
ADD CONSTRAINT fk_student_dues_subject 
FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_student 
FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_due 
FOREIGN KEY (due_id) REFERENCES public.student_dues(id) ON DELETE CASCADE;

ALTER TABLE public.payment_reminders 
ADD CONSTRAINT fk_reminders_due 
FOREIGN KEY (due_id) REFERENCES public.student_dues(id) ON DELETE CASCADE;

ALTER TABLE public.payment_reminders 
ADD CONSTRAINT fk_reminders_student 
FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_student_dues_student_id ON public.student_dues(student_id);
CREATE INDEX idx_student_dues_due_date ON public.student_dues(due_date);
CREATE INDEX idx_student_dues_status ON public.student_dues(status);
CREATE INDEX idx_payments_student_id ON public.payments(student_id);
CREATE INDEX idx_payments_due_id ON public.payments(due_id);
CREATE INDEX idx_reminders_due_date ON public.payment_reminders(due_id);

-- Create function to calculate late fees
CREATE OR REPLACE FUNCTION public.calculate_late_fee(
  due_amount INTEGER,
  due_date DATE,
  late_fee_percentage DECIMAL
) RETURNS INTEGER AS $$
BEGIN
  IF CURRENT_DATE > due_date THEN
    RETURN FLOOR(due_amount * (late_fee_percentage / 100));
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to update payment status based on payments
CREATE OR REPLACE FUNCTION public.update_due_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the due is fully paid
  IF (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE due_id = NEW.due_id) >= 
     (SELECT amount + calculate_late_fee(amount, due_date, late_fee_percentage) 
      FROM student_dues WHERE id = NEW.due_id) THEN
    UPDATE student_dues 
    SET status = 'paid', updated_at = now() 
    WHERE id = NEW.due_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update due status when payment is made
CREATE TRIGGER update_due_status_trigger
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_due_status();

-- Create function to auto-mark overdue payments
CREATE OR REPLACE FUNCTION public.mark_overdue_payments()
RETURNS void AS $$
BEGIN
  UPDATE student_dues 
  SET status = 'overdue', updated_at = now()
  WHERE due_date < CURRENT_DATE 
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_student_dues_updated_at
  BEFORE UPDATE ON public.student_dues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.student_dues (student_id, subject_id, amount, due_date, description) 
SELECT 
  p.id as student_id,
  s.id as subject_id,
  50000 as amount, -- $500.00
  CURRENT_DATE + INTERVAL '30 days' as due_date,
  'Monthly tuition fee for ' || s.name as description
FROM profiles p
CROSS JOIN subjects s
WHERE p.role = 'student'
LIMIT 5;