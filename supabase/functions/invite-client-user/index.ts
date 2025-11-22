// supabase/functions/invite-client-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { client_id, email, is_resend } = await req.json()

    if (!client_id || !email) {
      throw new Error('Client ID and email are required')
    }

    // Check if user already exists by email
    // UPDATED: Use listUsers instead of getUserByEmail
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      throw new Error(`Error checking existing users: ${listError.message}`)
    }

    const existingUser = existingUsers.users.find(user => user.email === email)

    let userId: string

    if (existingUser) {
      // User exists
      userId = existingUser.id

      if (is_resend) {
        // For resend, just send a password reset email
        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
        })

        if (resetError) {
          throw new Error(`Error sending reset email: ${resetError.message}`)
        }

        return new Response(
          JSON.stringify({
            message: 'Password reset email sent successfully!',
            user_id: userId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
      // If existing user and not resend, we still need to ensure they are linked
      // and potentially send an invite if they are being invited to a *new* client.
      // The Brevo logic below will handle sending an invite if configured.
    }

    // 3. Get company settings to check for custom email provider
    const { data: clientData } = await supabaseAdmin
      .from('clients')
      .select('company_id')
      .eq('id', client_id)
      .single()

    let emailSent = false

    if (clientData?.company_id) {
      const { data: settings } = await supabaseAdmin
        .from('settings')
        .select('email_settings')
        .eq('company_id', clientData.company_id)
        .single()

      const emailSettings = settings?.email_settings

      // If Brevo is configured, try to send via Brevo
      if (emailSettings?.provider === 'brevo' && emailSettings?.api_key) {
        try {
          console.log('Sending invite via Brevo...')

          // Let's use generateLink to get the action link
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
              redirectTo: `${req.headers.get('origin')}/client/dashboard`
            }
          })

          if (linkError) throw linkError

          const actionLink = linkData.properties.action_link

          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': emailSettings.api_key,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              sender: {
                name: emailSettings.sender_name || 'InvoiceAI',
                email: emailSettings.sender_email || 'no-reply@invoiceai.com'
              },
              to: [{ email: email }],
              subject: 'You have been invited to the Client Portal',
              htmlContent: `
                <p>Hello,</p>
                <p>You have been invited to access the Client Portal.</p>
                <p><a href="${actionLink}">Click here to accept your invitation</a></p>
                <p>If you cannot click the link, copy and paste this URL into your browser:</p>
                <p>${actionLink}</p>
              `
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('Brevo API Error:', errorData)
            throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`)
          }

          emailSent = true
          userId = linkData.user.id
        } catch (error) {
          console.error('Failed to send via Brevo, falling back to system default:', error)
          // Fallback will happen below
        }
      }
    }

    if (!emailSent) {
      // System default sending (Supabase built-in)
      if (existingUser) {
        // User exists, just link them (logic handled below)
        userId = existingUser.id
      } else {
        // User doesn't exist, invite them (creates user and sends email)
        const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            invited_for_client: client_id
          }
        })

        if (inviteError) {
          throw new Error(`Error sending invitation: ${inviteError.message}`)
        }

        userId = newUser.user.id
      }
    }

    // Create or update client_users record
    const { error: linkError } = await supabaseAdmin
      .from('client_users')
      .upsert({
        client_id: client_id,
        email: email,
        id: userId, // Link to the auth user
        is_active: true,
        invited_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })

    if (linkError) {
      throw new Error(`Error linking user to client: ${linkError.message}`)
    }

    // Also update the clients table for backward compatibility/reference if needed
    // But primarily we rely on client_users table now
    await supabaseAdmin
      .from('clients')
      .update({ client_user_id: userId })
      .eq('id', client_id)

    const message = existingUser && !is_resend
      ? 'User already exists and has been linked to client!'
      : is_resend
        ? 'Password reset email sent successfully!'
        : 'Invitation sent successfully!'

    return new Response(
      JSON.stringify({
        message,
        user_id: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in invitation process:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 so client can parse the error message
      }
    )
  }
})