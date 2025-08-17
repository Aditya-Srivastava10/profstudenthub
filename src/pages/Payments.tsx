import { useAuth } from '@/hooks/useAuth'
import { StudentPayments } from '@/components/payments/StudentPayments'
import { ProfessorPayments } from '@/components/payments/ProfessorPayments'

const Payments = () => {
  const { user, profile } = useAuth()

  if (!user || !profile) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to view payments.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Payments and Dues</h1>
        <p className="text-muted-foreground mt-2">
          {profile.role === 'student' 
            ? 'Manage your tuition payments and due dates'
            : 'Monitor student payments and manage dues'
          }
        </p>
      </div>

      {profile.role === 'student' ? (
        <StudentPayments />
      ) : (
        <ProfessorPayments />
      )}
    </div>
  )
}

export default Payments