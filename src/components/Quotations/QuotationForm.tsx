import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { X, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Client {
    id: string
    name: string
    email: string
    currency: string
}

interface QuotationItem {
    description: string
    quantity: number
    amount: number
}

interface QuotationFormData {
    client_id: string
    quote_number: string
    issue_date: string
    expiry_date: string
    items: QuotationItem[]
    tax_rate: number
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    notes: string
    terms: string
    currency: string
}

interface QuotationFormProps {
    quotation?: any
    onSuccess: () => void
    onCancel: () => void
}

export const QuotationForm: React.FC<QuotationFormProps> = ({ quotation, onSuccess, onCancel }) => {
    const { user } = useAuth()
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [currency, setCurrency] = useState('USD')

    const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<QuotationFormData>({
        defaultValues: {
            client_id: quotation?.client_id || '',
            quote_number: quotation?.quote_number || '',
            issue_date: quotation?.issue_date || new Date().toISOString().split('T')[0],
            expiry_date: quotation?.expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: quotation?.invoice_items || [{ description: '', quantity: 1, amount: 0 }],
            tax_rate: quotation?.tax_rate || 0,
            discount_type: quotation?.discount_type || 'percentage',
            discount_value: quotation?.discount_value || 0,
            notes: quotation?.notes || '',
            terms: quotation?.terms || '',
            currency: quotation?.currency || 'USD'
        }
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items'
    })

    const watchedItems = watch('items')
    const watchedTaxRate = watch('tax_rate')
    const watchedDiscountType = watch('discount_type')
    const watchedDiscountValue = watch('discount_value')
    const watchedClientId = watch('client_id')

    useEffect(() => {
        if (user) {
            loadInitialData()
        }
    }, [user])

    useEffect(() => {
        if (!quotation) {
            generateQuoteNumber()
        }
    }, [quotation])

    useEffect(() => {
        if (watchedClientId) {
            const client = clients.find(c => c.id === watchedClientId)
            if (client) {
                setCurrency(client.currency)
                setValue('currency', client.currency)
            }
        }
    }, [watchedClientId, clients])

    const loadInitialData = async () => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user!.id)
                .single()

            if (!profile?.company_id) {
                setClients([])
                return
            }

            const { data: clientsData } = await supabase
                .from('clients')
                .select('id, name, email, currency')
                .eq('company_id', profile.company_id)
                .order('name')

            setClients(clientsData || [])

            // If editing, set initial currency
            if (quotation && quotation.client_id) {
                const client = clientsData?.find(c => c.id === quotation.client_id)
                if (client) {
                    setCurrency(client.currency)
                }
            }
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoadingData(false)
        }
    }

    const generateQuoteNumber = async () => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user!.id)
                .single()

            if (!profile?.company_id) return

            // Use a simple count for now, ideally use the DB function
            const { count } = await supabase
                .from('quotations')
                .select('*', { count: 'exact' })
                .eq('company_id', profile.company_id)

            const quoteNumber = `Q-INV${String((count || 0) + 1).padStart(4, '0')}`
            setValue('quote_number', quoteNumber)
        } catch (error) {
            console.error('Error generating quote number:', error)
        }
    }

    const calculateSubtotal = () => {
        if (!watchedItems) return 0
        return watchedItems.reduce((sum, item) => {
            const amount = Number(item.amount) || 0
            return sum + amount
        }, 0)
    }

    const calculateTax = (subtotal: number) => {
        const taxRate = Number(watchedTaxRate) || 0
        return (subtotal * taxRate) / 100
    }

    const calculateDiscount = (subtotal: number) => {
        const value = Number(watchedDiscountValue) || 0
        if (watchedDiscountType === 'percentage') {
            return (subtotal * value) / 100
        }
        return value
    }

    const calculateTotal = () => {
        const subtotal = calculateSubtotal()
        const tax = calculateTax(subtotal)
        const discount = calculateDiscount(subtotal)
        return subtotal + tax - discount
    }

    const onSubmit = async (data: QuotationFormData) => {
        setLoading(true)
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user!.id)
                .single()

            if (!profile?.company_id) {
                alert('Company profile not found')
                return
            }

            const subtotal = calculateSubtotal()
            const taxAmount = calculateTax(subtotal)
            const discountAmount = calculateDiscount(subtotal)
            const total = calculateTotal()

            const quotationData = {
                company_id: profile.company_id,
                client_id: data.client_id,
                quote_number: data.quote_number,
                issue_date: data.issue_date,
                expiry_date: data.expiry_date,
                subtotal,
                tax_rate: Number(data.tax_rate) || 0,
                tax_amount: taxAmount,
                discount_type: data.discount_type,
                discount_value: Number(data.discount_value) || 0,
                discount_amount: discountAmount,
                total,
                currency: currency, // Use the selected currency
                status: quotation?.status || 'draft',
                notes: data.notes || null,
                terms: data.terms || null
            }

            let quotationId = quotation?.id

            if (quotation) {
                const { error } = await supabase
                    .from('quotations')
                    .update(quotationData)
                    .eq('id', quotation.id)

                if (error) throw error
            } else {
                const { data: newQuotation, error } = await supabase
                    .from('quotations')
                    .insert(quotationData)
                    .select()
                    .single()

                if (error) throw error
                quotationId = newQuotation.id
            }

            // Delete existing items if editing
            if (quotation) {
                await supabase
                    .from('invoice_items')
                    .delete()
                    .eq('quotation_id', quotation.id)
            }

            // Insert new items
            const itemsData = data.items.map(item => ({
                quotation_id: quotationId,
                invoice_id: null, // Explicitly set invoice_id to null
                description: item.description,
                quantity: Number(item.quantity) || 0,
                rate: 0,
                amount: Number(item.amount) || 0
            }))

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(itemsData)

            if (itemsError) throw itemsError

            onSuccess()
        } catch (error) {
            console.error('Error saving quotation:', error)
            alert('Failed to save quotation')
        } finally {
            setLoading(false)
        }
    }

    if (loadingData) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {quotation ? 'Edit Quotation' : 'Create New Quotation'}
                    </h2>
                    <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                            <select
                                {...register('client_id', { required: 'Client is required' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a client</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            {errors.client_id && <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quote Number</label>
                            <input
                                {...register('quote_number', { required: 'Quote number is required' })}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                            <input
                                {...register('issue_date', { required: 'Issue date is required' })}
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                            <input
                                {...register('expiry_date')}
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Items</h3>
                            <button
                                type="button"
                                onClick={() => append({ description: '', quantity: 1, amount: 0 })}
                                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4 mr-1" /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-6">
                                        <input
                                            {...register(`items.${index}.description`, { required: true })}
                                            placeholder="Description"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            {...register(`items.${index}.quantity`, { required: true, valueAsNumber: true })}
                                            type="number"
                                            placeholder="Qty"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                                {currency}
                                            </span>
                                            <input
                                                {...register(`items.${index}.amount`, { required: true, valueAsNumber: true })}
                                                type="number"
                                                placeholder="Amount"
                                                className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <button type="button" onClick={() => remove(index)} className="p-2 text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                                    <input
                                        {...register('tax_rate', { valueAsNumber: true })}
                                        type="number"
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Discount Type</label>
                                        <select
                                            {...register('discount_type')}
                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="percentage">Percentage (%)</option>
                                            <option value="fixed">Fixed Amount</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Discount Value</label>
                                        <input
                                            {...register('discount_value', { valueAsNumber: true })}
                                            type="number"
                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2 text-right">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-medium">{currency} {calculateSubtotal().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Tax:</span>
                                    <span className="font-medium">{currency} {calculateTax(calculateSubtotal()).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Discount:</span>
                                    <span className="font-medium">-{currency} {calculateDiscount(calculateSubtotal()).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Total:</span>
                                    <span>{currency} {calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea {...register('notes')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Terms</label>
                        <textarea {...register('terms')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Saving...' : (quotation ? 'Update Quotation' : 'Create Quotation')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
