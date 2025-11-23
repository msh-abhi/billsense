-- Update get_public_invoice to include payment gateway information
CREATE OR REPLACE FUNCTION get_public_invoice(p_payment_link text)
RETURNS json AS $$
  SELECT row_to_json(t)
  FROM (
    SELECT 
      i.id,
      i.user_id,
      i.client_id,
      i.invoice_number,
      i.issue_date,
      i.due_date,
      i.subtotal,
      i.tax_rate,
      i.tax_amount,
      i.total,
      i.currency,
      i.status,
      i.notes,
      i.payment_link,
      i.payment_gateway_id,
      row_to_json(c.*) as clients,
      row_to_json(p.*) as profiles,
      CASE 
        WHEN pg.id IS NOT NULL THEN
          json_build_object(
            'id', pg.id,
            'gateway', pg.gateway,
            'is_enabled', pg.is_enabled,
            'config', pg.config
          )
        ELSE NULL
      END as payment_gateway,
      array_to_json(
        array_agg(
          json_build_object(
            'description', ii.description,
            'quantity', ii.quantity,
            'rate', ii.rate,
            'amount', ii.amount
          )
        )
      ) as invoice_items
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN profiles p ON i.user_id = p.id
    LEFT JOIN payment_gateways pg ON i.payment_gateway_id = pg.id
    LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
    WHERE i.payment_link = p_payment_link
    GROUP BY i.id, c.id, p.id, pg.id, pg.gateway, pg.is_enabled, pg.config
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;
