-- Fix RLS for invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_invoices ON invoices;
DROP POLICY IF EXISTS invoices_all_policy ON invoices;
DROP POLICY IF EXISTS invoices_public_policy ON invoices;

-- Create permissive policy
CREATE POLICY allow_all_invoices ON invoices 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Also create anon policy
CREATE POLICY anon_invoices ON invoices 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- And authenticated policy  
CREATE POLICY auth_invoices ON invoices 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
