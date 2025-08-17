import { useState, useEffect } from 'react'
import { calculateDaysLeft } from '@/lib/payment-utils'
import { Clock, AlertTriangle, Calendar } from 'lucide-react'

interface PaymentCountdownProps {
  dueDate: string
  status: string
}

export const PaymentCountdown = ({ dueDate, status }: PaymentCountdownProps) => {
  const [daysLeft, setDaysLeft] = useState(calculateDaysLeft(dueDate))

  useEffect(() => {
    const interval = setInterval(() => {
      setDaysLeft(calculateDaysLeft(dueDate))
    }, 1000 * 60 * 60) // Update every hour

    return () => clearInterval(interval)
  }, [dueDate])

  if (status === 'paid') {
    return (
      <div className="flex items-center text-green-600 text-sm">
        <Calendar className="mr-2 h-4 w-4" />
        Payment completed
      </div>
    )
  }

  if (daysLeft < 0) {
    return (
      <div className="flex items-center text-red-600 text-sm">
        <AlertTriangle className="mr-2 h-4 w-4" />
        {Math.abs(daysLeft)} days overdue
      </div>
    )
  }

  if (daysLeft === 0) {
    return (
      <div className="flex items-center text-orange-600 text-sm">
        <Clock className="mr-2 h-4 w-4" />
        Due today
      </div>
    )
  }

  const urgencyColor = daysLeft <= 3 ? 'text-orange-600' : daysLeft <= 7 ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className={`flex items-center text-sm ${urgencyColor}`}>
      <Clock className="mr-2 h-4 w-4" />
      {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
    </div>
  )
}