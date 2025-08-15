import { useAuth } from "@/hooks/useAuth";
import { GradingInterface } from "@/components/grading/GradingInterface";

const Grading = () => {
  const { profile } = useAuth();

  if (!profile) {
    return <div className="p-6">Loading...</div>;
  }

  if (profile.role !== 'professor') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Only professors can access the grading interface.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Grading Center</h1>
      <GradingInterface />
    </div>
  );
};

export default Grading;