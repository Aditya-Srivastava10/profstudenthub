import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import Header from '@/components/Header'

const Index = () => {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Welcome to Academic Portal
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            {profile?.role === 'professor' 
              ? 'Manage your students, assignments, and course materials'
              : 'Access your course materials, assignments, and track your progress'
            }
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {profile?.role === 'professor' ? (
              <>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">Student Management</h3>
                  <p className="text-muted-foreground mb-4">Add, remove, and manage student enrollments</p>
                  <Button variant="outline" className="w-full">Manage Students</Button>
                </div>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">Study Materials</h3>
                  <p className="text-muted-foreground mb-4">Upload and organize course materials</p>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/materials')}>Upload Materials</Button>
                </div>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">Assignments</h3>
                  <p className="text-muted-foreground mb-4">Create assignments and grade submissions</p>
                  <Button variant="outline" className="w-full">Manage Assignments</Button>
                </div>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">Fee Management</h3>
                  <p className="text-muted-foreground mb-4">Track payments and generate invoices</p>
                  <Button variant="outline" className="w-full">Manage Fees</Button>
                </div>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">Subjects</h3>
                  <p className="text-muted-foreground mb-4">Organize content by subjects</p>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/subjects')}>Manage Subjects</Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">My Subjects</h3>
                  <p className="text-muted-foreground mb-4">View your enrolled subjects</p>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/subjects')}>View Subjects</Button>
                </div>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">Study Materials</h3>
                  <p className="text-muted-foreground mb-4">Access course materials and resources</p>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/materials')}>View Materials</Button>
                </div>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">Assignments</h3>
                  <p className="text-muted-foreground mb-4">View assignments and submit work</p>
                  <Button variant="outline" className="w-full">View Assignments</Button>
                </div>
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2 text-card-foreground">My Fees</h3>
                  <p className="text-muted-foreground mb-4">Check payment status and history</p>
                  <Button variant="outline" className="w-full">View Fees</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
};

export default Index;
