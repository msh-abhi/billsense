-- Function to get invoice details by payment link for public view
CREATE OR REPLACE FUNCTION get_public_invoice(p_payment_link text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id uuid;
  v_result json;
BEGIN
  -- First, find the invoice ID from the payment link
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE payment_link = p_payment_link;

  IF v_invoice_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Construct the JSON result
  SELECT json_build_object(
    'id', i.id,
    'user_id', i.user_id,
    'invoice_number', i.invoice_number,
    'issue_date', i.issue_date,
    'due_date', i.due_date,
    'subtotal', i.subtotal,
    'tax_rate', i.tax_rate,
    'tax_amount', i.tax_amount,
    'total', i.total,
    'currency', i.currency,
    'status', i.status,
    'notes', i.notes,
    'clients', (
      SELECT json_build_object(
        'name', c.name,
        'email', c.email
        -- Add address fields if they exist in clients table, otherwise they will be null/undefined
        -- 'address_line1', c.address_line1
      )
      FROM clients c
      WHERE c.id = i.client_id
    ),
    'profiles', (
      SELECT json_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'company_name', p.company_name,
        'email', p.email,
        -- Map company address fields if available
        'address_line1', co.address->>'line1',
        'address_line2', co.address->>'line2',
        'city', co.address->>'city',
        'state_province', co.address->>'state',
        'postal_code', co.address->>'postal_code',
        'country', co.address->>'country',
        'vat_number', co.vat_tin
      )
      FROM profiles p
      LEFT JOIN companies co ON p.company_id = co.id
      WHERE p.id = i.user_id
    ),
    'company', (
       SELECT json_build_object(
          'pdf_settings', (
             SELECT row_to_json(ps)
             FROM pdf_settings ps
             WHERE ps.company_id = i.company_id
          )
       )
    ),
    'invoice_items', (
      SELECT json_agg(
        json_build_object(
          'description', ii.description,
          'quantity', ii.quantity,
          'rate', ii.rate,
          'amount', ii.amount
        )
      )
      FROM invoice_items ii
      WHERE ii.invoice_id = i.id
    )
  ) INTO v_result
  FROM invoices i
  WHERE i.id = v_invoice_id;

  RETURN v_result;
END;
$$;
