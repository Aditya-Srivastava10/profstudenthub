import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Header from '@/components/Header'
import { ProfessorDashboard } from '@/components/dashboard/ProfessorDashboard'
import { StudentDashboard } from '@/components/dashboard/StudentDashboard'

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            Welcome back, {profile?.first_name || 'User'}!
          </h1>
          <p className="text-xl text-muted-foreground">
            {profile?.role === 'professor' 
              ? 'Here\'s an overview of your courses and student activities'
              : 'Track your progress and stay up to date with your courses'
            }
          </p>
        </div>

        {profile?.role === 'professor' ? (
          <ProfessorDashboard />
        ) : (
          <StudentDashboard />
        )}
      </main>
    </div>
  )
};

export default Index;