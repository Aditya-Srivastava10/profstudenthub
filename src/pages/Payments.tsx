import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { StudentPayments } from "@/components/payments/StudentPayments";
import { ProfessorPayments } from "@/components/payments/ProfessorPayments";

const Payments = () => {
  const { user, profile } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Please log in to view payments.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Payments & Dues
          </h1>
          <p className="text-muted-foreground">
            {profile?.role === 'professor' 
              ? 'Manage student dues and track payments' 
              : 'View and pay your dues'}
          </p>
        </div>
        
        {profile?.role === 'professor' ? (
          <ProfessorPayments />
        ) : (
          <StudentPayments />
        )}
      </div>
    </div>
  );
};

export default Payments;