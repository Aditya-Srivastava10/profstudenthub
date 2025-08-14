import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, BookOpen, Users, DollarSign } from 'lucide-react'
import Header from '@/components/Header'

interface Subject {
  id: string
  name: string
  description: string | null
  code: string
  fee_amount: number
  is_active: boolean
  created_at: string
  professor_id: string
  enrollments?: any[]
  professor?: { first_name: string; last_name: string }
}

const Subjects = () => {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    fee_amount: 0
  })

  useEffect(() => {
    fetchSubjects()
  }, [profile])

  const fetchSubjects = async () => {
    if (!profile) return

    try {
      if (profile.role === 'professor') {
        // For professors, get their subjects with enrollment count
        const { data, error } = await supabase
          .from('subjects')
          .select(`
            *,
            enrollments(count)
          `)
          .eq('professor_id', profile.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setSubjects((data || []) as Subject[])
      } else {
        // For students, get subjects they're enrolled in
        const { data: enrollmentData, error } = await supabase
          .from('enrollments')
          .select(`
            subjects(
              id, name, description, code, fee_amount, is_active, created_at, professor_id,
              profiles!subjects_professor_id_fkey(first_name, last_name)
            )
          `)
          .eq('student_id', profile.id)
          .eq('is_active', true)

        if (error) throw error

        // Transform the data for students
        const transformedData = enrollmentData?.map((enrollment: any) => ({
          ...enrollment.subjects,
          professor: enrollment.subjects.profiles
        })) || []
        setSubjects(transformedData)
      }
    } catch (error: any) {
      toast({
        title: "Error fetching subjects",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    try {
      const { error } = await supabase
        .from('subjects')
        .insert({
          name: formData.name,
          description: formData.description,
          code: formData.code,
          fee_amount: formData.fee_amount * 100, // Convert to cents
          professor_id: profile.id
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Subject created successfully"
      })

      setIsDialogOpen(false)
      setFormData({ name: '', description: '', code: '', fee_amount: 0 })
      fetchSubjects()
    } catch (error: any) {
      toast({
        title: "Error creating subject",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading subjects...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {profile?.role === 'professor' ? 'My Subjects' : 'Enrolled Subjects'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {profile?.role === 'professor' 
                ? 'Manage your subjects and track enrollments'
                : 'View your enrolled subjects and course details'
              }
            </p>
          </div>
          
          {profile?.role === 'professor' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Subject</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubject} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Subject Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Subject Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g., MATH101"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fee_amount">Fee Amount ($)</Label>
                    <Input
                      id="fee_amount"
                      type="number"
                      value={formData.fee_amount}
                      onChange={(e) => setFormData({ ...formData, fee_amount: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Subject</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {profile?.role === 'professor' ? 'No subjects created yet' : 'No subjects enrolled'}
            </h3>
            <p className="text-muted-foreground">
              {profile?.role === 'professor' 
                ? 'Create your first subject to get started'
                : 'Contact your professor to get enrolled in subjects'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <Card key={subject.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {subject.code}
                      </CardDescription>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4 mr-1" />
                      ${(subject.fee_amount / 100).toFixed(2)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {subject.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {subject.description}
                    </p>
                  )}
                  
                  {profile?.role === 'professor' && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      {(subject as any).enrollments?.[0]?.count || 0} students enrolled
                    </div>
                  )}

                  {profile?.role === 'student' && (subject as any).professor && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Professor:</span>{' '}
                      {(subject as any).professor.first_name} {(subject as any).professor.last_name}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Subjects