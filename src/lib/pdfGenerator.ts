import jsPDF from 'jspdf'
import { supabase } from './supabase'
import { templates } from './pdfTemplates'

interface PDFSettings {
  font_family?: 'helvetica' | 'times' | 'courier';
  template?: string;
  [key: string]: any;
}

interface InvoiceData {
  id: string;
  user_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  notes: string | null;
  clients: { name: string; email: string;[key: string]: any; } | null;
  profiles: { id: string; full_name: string; email: string;[key: string]: any; } | null;
  invoice_items: Array<{ description: string; quantity: number; amount: number; }>;
}

const getDefaultSettings = (): PDFSettings => ({
  font_family: 'helvetica',
  template: 'invoma_classic',
  primary_color: '#3B82F6',
  secondary_color: '#64748B',
  text_color: '#1F2937',
  border_color: '#E5E7EB'
});

export const generatePDF = async (invoiceData: InvoiceData) => {
  try {
    if (!invoiceData || !invoiceData.profiles || !invoiceData.clients) {
      throw new Error("Cannot generate PDF: Missing data.");
    }

    let settings: PDFSettings = getDefaultSettings();

    // Fetch company settings
    if (invoiceData.profiles.id) {
      // First get company_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', invoiceData.profiles.id)
        .single();

      if (profile?.company_id) {
        const { data: settingsData } = await supabase
          .from('pdf_settings')
          .select('*')
          .eq('company_id', profile.company_id)
          .single();

        if (settingsData) {
          settings = { ...settings, ...settingsData };
        }
      }
    }

    const pdf = new jsPDF();
    const templateName = settings.template || 'invoma_classic';
    console.log('Generating PDF with template:', templateName);
    console.log('Settings used:', settings);

    const renderer = templates[templateName] || templates.invoma_classic;
    console.log('Renderer selected:', renderer ? 'Found' : 'Defaulting to Invoma Classic');

    renderer(pdf, { invoice: invoiceData, settings });

    pdf.save(`Invoice-${invoiceData.invoice_number}.pdf`);
  } catch (error) {
    console.error('Error in generatePDF:', error);
    throw new Error('Failed to generate PDF due to an internal error.');
  }
};