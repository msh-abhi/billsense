import jsPDF from 'jspdf';

export interface PDFTemplateData {
    invoice: any;
    settings: any;
}

export type PDFTemplateRenderer = (doc: jsPDF, data: PDFTemplateData) => void;

const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Convert hex color to RGB values for jsPDF
const hexToRgb = (hex: string): [number, number, number] => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return [r, g, b];
};

export const templates: Record<string, PDFTemplateRenderer> = {
    // Invoma Classic Template - Clean and Professional
    invoma_classic: (doc, { invoice, settings }) => {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Colors
        const primaryColor = settings.primary_color || '#3B82F6';
        const secondaryColor = settings.secondary_color || '#64748B';
        const textColor = settings.text_color || '#1F2937';
        const [pr, pg, pb] = hexToRgb(primaryColor);
        const [sr, sg, sb] = hexToRgb(secondaryColor);
        const [tr, tg, tb] = hexToRgb(textColor);

        let y = 25;

        // Header Section - Logo left, INVOICE right
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(tr, tg, tb);
        doc.text(invoice.profiles?.company_name || 'Company Name', 20, y);

        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pr, pg, pb);
        doc.text('INVOICE', pageWidth - 20, y, { align: 'right' });

        y += 10;

        // Horizontal separator line
        doc.setDrawColor(pr, pg, pb);
        doc.setLineWidth(0.5);
        doc.line(20, y, pageWidth - 20, y);

        y += 15;

        // Invoice Details - compact format
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);

        const detailsY = y;
        doc.text('Invoice Number:', 20, detailsY);
        doc.setTextColor(tr, tg, tb);
        doc.setFont('helvetica', 'bold');
        doc.text(invoice.invoice_number, 55, detailsY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        doc.text('Date:', 20, detailsY + 6);
        doc.setTextColor(tr, tg, tb);
        doc.text(formatDate(invoice.issue_date), 55, detailsY + 6);

        doc.setTextColor(sr, sg, sb);
        doc.text('Due Date:', 20, detailsY + 12);
        doc.setTextColor(tr, tg, tb);
        doc.text(formatDate(invoice.due_date), 55, detailsY + 12);

        y += 30;

        // Billing Section - Two columns
        const col1 = 20;
        const col2 = pageWidth / 2 + 10;

        // Invoice To (Left)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pr, pg, pb);
        doc.text('INVOICE TO', col1, y);

        y += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(tr, tg, tb);
        doc.text(invoice.clients?.name || '', col1, y);

        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        doc.text(invoice.clients?.email || '', col1, y);

        // Pay To (Right)
        y -= 12;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pr, pg, pb);
        doc.text('PAY TO', col2, y);

        y += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(tr, tg, tb);
        doc.text(invoice.profiles?.company_name || '', col2, y);

        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        doc.text(invoice.profiles?.email || '', col2, y);

        y += 20;

        // Items Table
        doc.setFillColor(pr, pg, pb);
        doc.rect(20, y - 7, pageWidth - 40, 10, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('DESCRIPTION', 25, y);
        doc.text('QTY', pageWidth - 80, y, { align: 'right' });
        doc.text('RATE', pageWidth - 55, y, { align: 'right' });
        doc.text('AMOUNT', pageWidth - 25, y, { align: 'right' });

        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(tr, tg, tb);

        (invoice.invoice_items || []).forEach((item: any, index: number) => {
            if (index % 2 === 1) {
                doc.setFillColor(249, 250, 251);
                doc.rect(20, y - 6, pageWidth - 40, 9, 'F');
            }

            doc.setFontSize(9);
            doc.text(item.description || '', 25, y);
            doc.text((item.quantity || 0).toString(), pageWidth - 80, y, { align: 'right' });
            doc.text(formatCurrency(item.rate || 0, invoice.currency), pageWidth - 55, y, { align: 'right' });
            doc.text(formatCurrency(item.amount || 0, invoice.currency), pageWidth - 25, y, { align: 'right' });
            y += 9;
        });

        y += 5;
        doc.setDrawColor(sr, sg, sb);
        doc.setLineWidth(0.3);
        doc.line(20, y, pageWidth - 20, y);
        y += 15;

        // Bottom Section - Payment Info (Left) and Calculations (Right)
        const bottomY = y;

        // Payment Info (Left)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pr, pg, pb);
        doc.text('PAYMENT INFORMATION', 20, bottomY);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        doc.text(settings.payment_terms || 'Payment is due within 30 days', 20, bottomY + 7);

        // Calculations (Right)
        const calcX = pageWidth - 80;
        const valueX = pageWidth - 25;

        doc.setFontSize(9);
        doc.setTextColor(sr, sg, sb);
        doc.text('Subtotal:', calcX, bottomY);
        doc.setTextColor(tr, tg, tb);
        doc.text(formatCurrency(invoice.subtotal, invoice.currency), valueX, bottomY, { align: 'right' });

        let calcY = bottomY + 6;

        if (invoice.tax_amount > 0) {
            doc.setTextColor(sr, sg, sb);
            doc.text(`Tax (${invoice.tax_rate}%):`, calcX, calcY);
            doc.setTextColor(tr, tg, tb);
            doc.text(formatCurrency(invoice.tax_amount, invoice.currency), valueX, calcY, { align: 'right' });
            calcY += 6;
        }

        if (invoice.discount_amount > 0) {
            doc.setTextColor(sr, sg, sb);
            doc.text('Discount:', calcX, calcY);
            doc.setTextColor(tr, tg, tb);
            doc.text(`-${formatCurrency(invoice.discount_amount, invoice.currency)}`, valueX, calcY, { align: 'right' });
            calcY += 6;
        }

        // Total with background
        calcY += 3;
        doc.setFillColor(pr, pg, pb);
        doc.rect(calcX - 5, calcY - 7, (valueX - calcX) + 30, 12, 'F');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL:', calcX, calcY);
        doc.text(formatCurrency(invoice.total, invoice.currency), valueX, calcY, { align: 'right' });

        // Terms and Footer
        const footerY = pageHeight - 30;

        if (invoice.notes) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(pr, pg, pb);
            doc.text('TERMS & CONDITIONS', 20, footerY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(sr, sg, sb);
            doc.setFontSize(7);
            const lines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
            doc.text(lines, 20, footerY + 5);
        }

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(sr, sg, sb);
        doc.text(settings.footer_text || 'Thank you for your business!', pageWidth / 2, pageHeight - 15, { align: 'center' });
    },

    // Invoma Modern Template - Detailed Company Info
    invoma_modern: (doc, { invoice, settings }) => {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Colors
        const primaryColor = settings.primary_color || '#3B82F6';
        const secondaryColor = settings.secondary_color || '#64748B';
        const textColor = settings.text_color || '#1F2937';
        const borderColor = settings.border_color || '#E5E7EB';
        const [pr, pg, pb] = hexToRgb(primaryColor);
        const [sr, sg, sb] = hexToRgb(secondaryColor);
        const [tr, tg, tb] = hexToRgb(textColor);
        const [br, bg, bb] = hexToRgb(borderColor);

        let y = 25;

        // Header Section - Company Info (Left) and Invoice Box (Right)

        // Company Info (Left)
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pr, pg, pb);
        doc.text(invoice.profiles?.company_name || 'Company Name', 20, y);

        y += 7;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        doc.text(invoice.profiles?.email || '', 20, y);

        // Invoice Box (Right)
        const boxX = pageWidth - 75;
        const boxY = 20;
        const boxWidth = 55;
        const boxHeight = 35;

        // Box border
        doc.setDrawColor(pr, pg, pb);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxY, boxWidth, boxHeight);

        // Box header
        doc.setFillColor(pr, pg, pb);
        doc.rect(boxX, boxY, boxWidth, 10, 'F');

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('INVOICE', boxX + boxWidth / 2, boxY + 7, { align: 'center' });

        // Box content
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        doc.text('Number:', boxX + 3, boxY + 16);
        doc.setTextColor(tr, tg, tb);
        doc.setFont('helvetica', 'bold');
        doc.text(invoice.invoice_number, boxX + 3, boxY + 21);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        doc.text('Date:', boxX + 3, boxY + 27);
        doc.setTextColor(tr, tg, tb);
        doc.text(formatDate(invoice.issue_date), boxX + 3, boxY + 32);

        y = boxY + boxHeight + 15;

        // Invoice To Section
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pr, pg, pb);
        doc.text('INVOICE TO', 20, y);

        y += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(tr, tg, tb);
        doc.text(invoice.clients?.name || '', 20, y);

        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        doc.text(invoice.clients?.email || '', 20, y);

        y += 15;

        // Items Table
        doc.setFillColor(pr, pg, pb);
        doc.rect(20, y - 7, pageWidth - 40, 10, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('DESCRIPTION', 25, y);
        doc.text('QTY', pageWidth - 80, y, { align: 'right' });
        doc.text('RATE', pageWidth - 55, y, { align: 'right' });
        doc.text('AMOUNT', pageWidth - 25, y, { align: 'right' });

        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(tr, tg, tb);

        (invoice.invoice_items || []).forEach((item: any, index: number) => {
            if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(20, y - 6, pageWidth - 40, 9, 'F');
            }

            doc.setFontSize(9);
            doc.text(item.description || '', 25, y);
            doc.text((item.quantity || 0).toString(), pageWidth - 80, y, { align: 'right' });
            doc.text(formatCurrency(item.rate || 0, invoice.currency), pageWidth - 55, y, { align: 'right' });
            doc.text(formatCurrency(item.amount || 0, invoice.currency), pageWidth - 25, y, { align: 'right' });
            y += 9;
        });

        y += 10;

        // Bottom Section - Payment (Left) and Calculations (Right)
        const bottomY = y;

        // Payment Info (Left) - in a box
        const payBoxWidth = 85;
        const payBoxHeight = 25;

        doc.setDrawColor(br, bg, bb);
        doc.setLineWidth(0.3);
        doc.rect(20, bottomY, payBoxWidth, payBoxHeight);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pr, pg, pb);
        doc.text('PAYMENT INFO', 23, bottomY + 6);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(sr, sg, sb);
        const paymentText = settings.payment_terms || 'Payment is due within 30 days of invoice date.';
        const paymentLines = doc.splitTextToSize(paymentText, payBoxWidth - 6);
        doc.text(paymentLines, 23, bottomY + 12);

        // Add Bank Details if available
        if (invoice.payment_gateways && invoice.payment_gateways.gateway === 'wise') {
            let bankY = bottomY + 12 + (paymentLines.length * 3) + 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Bank Details:', 23, bankY);
            doc.setFont('helvetica', 'normal');
            bankY += 4;

            const config = invoice.payment_gateways.config;
            if (config.bank_name) {
                doc.text(`Bank: ${config.bank_name}`, 23, bankY);
                bankY += 3.5;
            }
            if (config.account_number) {
                doc.text(`Account: ${config.account_number}`, 23, bankY);
                bankY += 3.5;
            }
            if (config.routing_number) {
                doc.text(`Routing: ${config.routing_number}`, 23, bankY);
                bankY += 3.5;
            }
            if (config.iban) {
                doc.text(`IBAN: ${config.iban}`, 23, bankY);
                bankY += 3.5;
            }
            if (config.swift_code) {
                doc.text(`SWIFT: ${config.swift_code}`, 23, bankY);
                bankY += 3.5;
            }
        }

        // Calculations (Right)
        const calcX = pageWidth - 80;
        const valueX = pageWidth - 25;

        doc.setFontSize(9);
        doc.setTextColor(sr, sg, sb);
        doc.text('Subtotal:', calcX, bottomY + 5);
        doc.setTextColor(tr, tg, tb);
        doc.text(formatCurrency(invoice.subtotal, invoice.currency), valueX, bottomY + 5, { align: 'right' });

        let calcY = bottomY + 11;

        if (invoice.tax_amount > 0) {
            doc.setTextColor(sr, sg, sb);
            doc.text(`Tax (${invoice.tax_rate}%):`, calcX, calcY);
            doc.setTextColor(tr, tg, tb);
            doc.text(formatCurrency(invoice.tax_amount, invoice.currency), valueX, calcY, { align: 'right' });
            calcY += 6;
        }

        if (invoice.discount_amount > 0) {
            doc.setTextColor(sr, sg, sb);
            doc.text('Discount:', calcX, calcY);
            doc.setTextColor(tr, tg, tb);
            doc.text(`-${formatCurrency(invoice.discount_amount, invoice.currency)}`, valueX, calcY, { align: 'right' });
            calcY += 6;
        }

        // Total
        calcY += 3;
        doc.setFillColor(pr, pg, pb);
        doc.rect(calcX - 5, calcY - 7, (valueX - calcX) + 30, 12, 'F');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL:', calcX, calcY);
        doc.text(formatCurrency(invoice.total, invoice.currency), valueX, calcY, { align: 'right' });

        // Terms & Notes Section
        const termsY = bottomY + payBoxHeight + 15;

        if (invoice.notes) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(pr, pg, pb);
            doc.text('TERMS & NOTES', 20, termsY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(sr, sg, sb);
            doc.setFontSize(7);
            const lines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
            doc.text(lines, 20, termsY + 5);
        }

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(sr, sg, sb);
        doc.text(settings.footer_text || 'Thank you for your business!', pageWidth / 2, pageHeight - 15, { align: 'center' });
    }
};
