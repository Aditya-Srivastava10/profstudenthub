import { useAuth } from "@/hooks/useAuth";
import { ProfessorAssignments } from "@/components/assignments/ProfessorAssignments";
import { StudentAssignments } from "@/components/assignments/StudentAssignments";

const Assignments = () => {
  const { profile } = useAuth();

  if (!profile) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Assignments</h1>
      {profile.role === 'professor' ? <ProfessorAssignments /> : <StudentAssignments />}
    </div>
  );
};

export default Assignments;