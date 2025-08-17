-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.calculate_late_fee(
  due_amount INTEGER,
  due_date DATE,
  late_fee_percentage DECIMAL
) RETURNS INTEGER 
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

CREATE OR REPLACE FUNCTION public.mark_overdue_payments()
RETURNS void 
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