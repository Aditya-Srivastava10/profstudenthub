-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'failed');

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('card', 'upi', 'bank_transfer', 'cash');

-- Create student_dues table
CREATE TABLE public.student_dues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  subject_id UUID NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents/paisa
  due_date DATE NOT NULL,
  late_fee_percentage DECIMAL(5,2) DEFAULT 5.00,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  due_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents/paisa
  payment_method payment_method NOT NULL,
  payment_reference TEXT, -- For tracking payment gateway transactions
  payment_gateway_id TEXT, -- Gateway transaction ID
  receipt_url TEXT, -- URL to receipt
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment_reminders table
CREATE TABLE public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  due_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- 'email', 'sms', 'system'
  days_before INTEGER NOT NULL, -- Days before due date
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_dues
CREATE POLICY "Students can view their own dues" ON public.student_dues
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Professors can view dues for their students" ON public.student_dues
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'professor'::user_role
  ));

CREATE POLICY "Professors can manage dues" ON public.student_dues
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'professor'::user_role
  ));

-- RLS Policies for payments
CREATE POLICY "Students can view their own payments" ON public.payments
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can create their own payments" ON public.payments
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Professors can view all payments" ON public.payments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'professor'::user_role
  ));

-- RLS Policies for payment_reminders
CREATE POLICY "Students can view their own reminders" ON public.payment_reminders
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "System can manage reminders" ON public.payment_reminders
  FOR ALL
  USING (true);

-- Create function to calculate late fees
CREATE OR REPLACE FUNCTION public.calculate_late_fee(due_amount INTEGER, due_date DATE, late_fee_percentage DECIMAL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF CURRENT_DATE > due_date THEN
    RETURN FLOOR(due_amount * (late_fee_percentage / 100));
  END IF;
  RETURN 0;
END;
$$;

-- Create function to update payment status when payment is made
CREATE OR REPLACE FUNCTION public.update_due_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if the due is fully paid
  IF (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE due_id = NEW.due_id) >= 
     (SELECT amount + public.calculate_late_fee(amount, due_date, late_fee_percentage) 
      FROM public.student_dues WHERE id = NEW.due_id) THEN
    UPDATE public.student_dues 
    SET status = 'paid', updated_at = now() 
    WHERE id = NEW.due_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update due status when payment is made
CREATE TRIGGER update_due_status_trigger
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_due_status();

-- Create function to mark overdue payments
CREATE OR REPLACE FUNCTION public.mark_overdue_payments()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.student_dues 
  SET status = 'overdue', updated_at = now()
  WHERE due_date < CURRENT_DATE 
    AND status = 'pending';
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_student_dues_updated_at
  BEFORE UPDATE ON public.student_dues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();