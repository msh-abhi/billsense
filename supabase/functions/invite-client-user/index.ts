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
              redirectTo: `${req.headers.get('origin') || Deno.env.get('SITE_URL')}/client/setup-password`
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
              subject: 'Welcome to Your Client Portal',
              htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1F2937; margin-bottom: 20px;">Welcome to Your Client Portal!</h2>
                  <p style="color: #4B5563; line-height: 1.6;">Hello,</p>
                  <p style="color: #4B5563; line-height: 1.6;">You have been invited to access your client portal where you can view projects, invoices, and track progress.</p>
                  <p style="color: #1F2937; font-weight: 600; margin-top: 24px;">Next Step: Set Up Your Password</p>
                  <p style="color: #4B5563; line-height: 1.6;">Click the button below to create your password and access your account.</p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${actionLink}" style="background-color: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                      Set Up Your Password
                    </a>
                  </div>
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="color: #6B7280; font-size: 12px; word-break: break-all; background-color: #F3F4F6; padding: 12px; border-radius: 6px;">${actionLink}</p>
                  <hr style="margin: 32px 0; border: none; border-top: 1px solid #E5E7EB;">
                  <p style="color: #9CA3AF; font-size: 12px; line-height: 1.6;">This invitation link will expire in 24 hours for security reasons.</p>
                  <p style="color: #9CA3AF; font-size: 12px; line-height: 1.6;">If you didn't expect this invitation, you can safely ignore this email.</p>
                </div>
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
        // User exists - send them a password reset email so they can access the client portal
        // Redirect to password setup page so they can set/confirm their password
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: `${req.headers.get('origin') || Deno.env.get('SITE_URL')}/client/setup-password`
        })

        if (resetError) {
          throw new Error(`Error sending access email: ${resetError.message}`)
        }

        userId = existingUser.id
        emailSent = true
      } else {
        // User doesn't exist, invite them (creates user and sends email)
        const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${req.headers.get('origin') || Deno.env.get('SITE_URL')}/client/setup-password`,
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
      ? 'User already has an account. Access notification email sent!'
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