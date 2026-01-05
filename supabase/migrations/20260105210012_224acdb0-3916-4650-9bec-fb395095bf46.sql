-- Add owais.maqsood@outlook.com as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('925c4ba9-0e81-4af2-8eb5-dec4aa0b4315', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure this user is approved
UPDATE public.profiles 
SET approval_status = 'approved'
WHERE id = '925c4ba9-0e81-4af2-8eb5-dec4aa0b4315';