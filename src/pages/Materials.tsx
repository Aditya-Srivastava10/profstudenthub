import { useAuth } from "@/hooks/useAuth";
import { ProfessorMaterials } from "@/components/materials/ProfessorMaterials";
import { StudentMaterials } from "@/components/materials/StudentMaterials";

const Materials = () => {
  const { profile } = useAuth();

  if (!profile) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Study Materials</h1>
      {profile.role === 'professor' ? <ProfessorMaterials /> : <StudentMaterials />}
    </div>
  );
};

export default Materials;