import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: any | null
          logo_url: string | null
          vat_tin: string | null
          currency: string
          timezone: string
          invoice_prefix: string
          invoice_next_number: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: any | null
          logo_url?: string | null
          vat_tin?: string | null
          currency?: string
          timezone?: string
          invoice_prefix?: string
          invoice_next_number?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: any | null
          logo_url?: string | null
          vat_tin?: string | null
          currency?: string
          timezone?: string
          invoice_prefix?: string
          invoice_next_number?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          company_name: string | null
          avatar_url: string | null
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          company_name?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          company_name?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_users: {
        Row: {
          id: string
          client_id: string
          email: string
          password_hash: string | null
          is_active: boolean
          invited_at: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          email: string
          password_hash?: string | null
          is_active?: boolean
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          email?: string
          password_hash?: string | null
          is_active?: boolean
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          name: string
          description: string | null
          hourly_rate: number
          currency: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          name: string
          description?: string | null
          hourly_rate: number
          currency?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          name?: string
          description?: string | null
          hourly_rate?: number
          currency?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          company_id: string
          project_id: string
          name: string
          description: string | null
          estimated_hours: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          project_id: string
          name: string
          description?: string | null
          estimated_hours?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          project_id?: string
          name?: string
          description?: string | null
          estimated_hours?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          project_id: string
          task_id: string | null
          description: string | null
          start_time: string
          end_time: string | null
          duration: number | null
          is_running: boolean
          is_billable: boolean
          hourly_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          task_id?: string | null
          description?: string | null
          start_time: string
          end_time?: string | null
          duration?: number | null
          is_running?: boolean
          is_billable?: boolean
          hourly_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          task_id?: string | null
          description?: string | null
          start_time?: string
          end_time?: string | null
          duration?: number | null
          is_running?: boolean
          is_billable?: boolean
          hourly_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      quotations: {
        Row: {
          id: string
          company_id: string
          client_id: string
          quote_number: string
          issue_date: string
          expiry_date: string | null
          status: string
          subtotal: number
          tax_rate: number
          tax_amount: number
          discount_type: string
          discount_value: number
          discount_amount: number
          total: number
          notes: string | null
          terms: string | null
          template_id: string | null
          sent_at: string | null
          accepted_at: string | null
          rejected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          client_id: string
          quote_number: string
          issue_date: string
          expiry_date?: string | null
          status?: string
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_type?: string
          discount_value?: number
          discount_amount?: number
          total?: number
          notes?: string | null
          terms?: string | null
          template_id?: string | null
          sent_at?: string | null
          accepted_at?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          client_id?: string
          quote_number?: string
          issue_date?: string
          expiry_date?: string | null
          status?: string
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_type?: string
          discount_value?: number
          discount_amount?: number
          total?: number
          notes?: string | null
          terms?: string | null
          template_id?: string | null
          sent_at?: string | null
          accepted_at?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          company_id: string | null
          user_id: string
          client_id: string
          project_id: string | null
          quotation_id: string | null
          invoice_number: string
          issue_date: string
          due_date: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          discount_type: string | null
          discount_value: number | null
          discount_amount: number | null
          total: number
          amount_paid: number | null
          amount_due: number | null
          currency: string
          status: string
          notes: string | null
          terms: string | null
          payment_link: string | null
          is_recurring: boolean
          recurring_invoice_id: string | null
          sent_at: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          user_id: string
          client_id: string
          project_id?: string | null
          quotation_id?: string | null
          invoice_number: string
          issue_date: string
          due_date?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          discount_amount?: number | null
          total: number
          amount_paid?: number | null
          amount_due?: number | null
          currency?: string
          status?: string
          notes?: string | null
          terms?: string | null
          payment_link?: string | null
          is_recurring?: boolean
          recurring_invoice_id?: string | null
          sent_at?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          user_id?: string
          client_id?: string
          project_id?: string | null
          quotation_id?: string | null
          invoice_number?: string
          issue_date?: string
          due_date?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          discount_amount?: number | null
          total?: number
          amount_paid?: number | null
          amount_due?: number | null
          currency?: string
          status?: string
          notes?: string | null
          terms?: string | null
          payment_link?: string | null
          is_recurring?: boolean
          recurring_invoice_id?: string | null
          sent_at?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string | null
          quotation_id: string | null
          description: string
          quantity: number
          rate: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          quotation_id?: string | null
          description: string
          quantity?: number
          rate: number
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          quotation_id?: string | null
          description?: string
          quantity?: number
          rate?: number
          amount?: number
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          company_id: string
          invoice_id: string
          amount: number
          payment_date: string
          payment_method: string
          payment_gateway_id: string | null
          status: string
          transaction_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invoice_id: string
          amount: number
          payment_date: string
          payment_method?: string
          payment_gateway_id?: string | null
          status?: string
          transaction_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          invoice_id?: string
          amount?: number
          payment_date?: string
          payment_method?: string
          payment_gateway_id?: string | null
          status?: string
          transaction_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          company_id: string
          payment_id: string
          transaction_id: string
          gateway: string
          amount: number
          currency: string
          status: string
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          payment_id: string
          transaction_id: string
          gateway: string
          amount: number
          currency?: string
          status: string
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          payment_id?: string
          transaction_id?: string
          gateway?: string
          amount?: number
          currency?: string
          status?: string
          metadata?: any | null
          created_at?: string
        }
      }
      recurring_invoices: {
        Row: {
          id: string
          company_id: string
          client_id: string
          template_invoice_id: string | null
          frequency: string
          start_date: string
          end_date: string | null
          next_invoice_date: string
          is_active: boolean
          auto_send: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          client_id: string
          template_invoice_id?: string | null
          frequency: string
          start_date: string
          end_date?: string | null
          next_invoice_date: string
          is_active?: boolean
          auto_send?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          client_id?: string
          template_invoice_id?: string | null
          frequency?: string
          start_date?: string
          end_date?: string | null
          next_invoice_date?: string
          is_active?: boolean
          auto_send?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          company_id: string
          project_id: string | null
          category: string
          amount: number
          currency: string
          expense_date: string
          description: string | null
          receipt_url: string | null
          is_billable: boolean
          is_invoiced: boolean
          invoice_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          project_id?: string | null
          category: string
          amount: number
          currency?: string
          expense_date: string
          description?: string | null
          receipt_url?: string | null
          is_billable?: boolean
          is_invoiced?: boolean
          invoice_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          project_id?: string | null
          category?: string
          amount?: number
          currency?: string
          expense_date?: string
          description?: string | null
          receipt_url?: string | null
          is_billable?: boolean
          is_invoiced?: boolean
          invoice_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          company_id: string
          invoice_terms: string
          invoice_footer: string | null
          email_signature: string | null
          pdf_template: string
          pdf_colors: any
          notification_preferences: any
          currency: string
          timezone: string
          date_format: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invoice_terms?: string
          invoice_footer?: string | null
          email_signature?: string | null
          pdf_template?: string
          pdf_colors?: any
          notification_preferences?: any
          currency?: string
          timezone?: string
          date_format?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          invoice_terms?: string
          invoice_footer?: string | null
          email_signature?: string | null
          pdf_template?: string
          pdf_colors?: any
          notification_preferences?: any
          currency?: string
          timezone?: string
          date_format?: string
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          company_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      invoice_tags: {
        Row: {
          invoice_id: string
          tag_id: string
        }
        Insert: {
          invoice_id: string
          tag_id: string
        }
        Update: {
          invoice_id?: string
          tag_id?: string
        }
      }
      payment_gateways: {
        Row: {
          id: string
          company_id: string
          gateway: string
          is_enabled: boolean
          config: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          gateway: string
          is_enabled?: boolean
          config?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          gateway?: string
          is_enabled?: boolean
          config?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      pdf_settings: {
        Row: {
          id: string
          company_id: string
          show_logo: boolean
          show_signature: boolean
          signature_url: string | null
          template: string
          custom_css: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          show_logo?: boolean
          show_signature?: boolean
          signature_url?: string | null
          template?: string
          custom_css?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          show_logo?: boolean
          show_signature?: boolean
          signature_url?: string | null
          template?: string
          custom_css?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          company_id: string
          type: string
          subject: string
          body: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          type: string
          subject: string
          body: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          type?: string
          subject?: string
          body?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          company_id: string
          user_id: string
          type: string
          title: string
          message: string
          is_read: boolean
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          type: string
          title: string
          message: string
          is_read?: boolean
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          is_read?: boolean
          metadata?: any | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: {
        Args: { company_uuid: string }
        Returns: string
      }
      generate_quote_number: {
        Args: { company_uuid: string }
        Returns: string
      }
      calculate_totals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
