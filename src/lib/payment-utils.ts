export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount / 100) // Convert from cents to dollars
}

export const calculateDaysLeft = (dueDate: string) => {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export const getStatusColor = (status: string, type: 'border' | 'text' | 'bg' = 'text') => {
  const colors = {
    pending: {
      border: 'border-l-blue-500',
      text: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    paid: {
      border: 'border-l-green-500',
      text: 'text-green-600', 
      bg: 'bg-green-50'
    },
    overdue: {
      border: 'border-l-red-500',
      text: 'text-red-600',
      bg: 'bg-red-50'
    },
    failed: {
      border: 'border-l-gray-500',
      text: 'text-gray-600',
      bg: 'bg-gray-50'
    }
  }

  return colors[status as keyof typeof colors]?.[type] || colors.pending[type]
}

export const formatPaymentMethod = (method: string) => {
  const methods = {
    card: 'Credit/Debit Card',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash'
  }
  
  return methods[method as keyof typeof methods] || method
}