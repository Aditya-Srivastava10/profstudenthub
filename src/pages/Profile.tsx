import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Calendar, BookOpen, Users, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { profile, user, fetchProfile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    subjectsCount: 0,
    studentsCount: 0,
    materialsCount: 0,
    assignmentsCount: 0
  });
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    avatar_url: ""
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        avatar_url: profile.avatar_url || ""
      });
      fetchUserStats();
    }
  }, [profile]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      if (profile?.role === "professor") {
        // Fetch professor stats
        const [subjectsRes, materialsRes, assignmentsRes] = await Promise.all([
          supabase.from('subjects').select('id').eq('professor_id', user.id).eq('is_active', true),
          supabase.from('study_materials').select('id').eq('professor_id', user.id).eq('is_active', true),
          supabase.from('assignments').select('id').eq('professor_id', user.id).eq('is_active', true)
        ]);

        // Count enrolled students across all subjects
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student_id')
          .in('subject_id', subjectsRes.data?.map(s => s.id) || [])
          .eq('is_active', true);

        setStats({
          subjectsCount: subjectsRes.data?.length || 0,
          studentsCount: new Set(enrollments?.map(e => e.student_id)).size || 0,
          materialsCount: materialsRes.data?.length || 0,
          assignmentsCount: assignmentsRes.data?.length || 0
        });
      } else {
        // Fetch student stats
        const [enrollmentsRes, submissionsRes] = await Promise.all([
          supabase.from('enrollments').select('id').eq('student_id', user.id).eq('is_active', true),
          supabase.from('assignment_submissions').select('id').eq('student_id', user.id)
        ]);

        setStats({
          subjectsCount: enrollmentsRes.data?.length || 0,
          studentsCount: 0,
          materialsCount: 0,
          assignmentsCount: submissionsRes.data?.length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          avatar_url: formData.avatar_url
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      await fetchProfile();
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const first = profile?.first_name?.[0] || "";
    const last = profile?.last_name?.[0] || "";
    return (first + last).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
            <CardContent className="relative p-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">
                      {profile?.first_name} {profile?.last_name}
                    </h1>
                    <Badge variant={profile?.role === "professor" ? "default" : "secondary"}>
                      {profile?.role === "professor" ? (
                        <>
                          <GraduationCap className="h-3 w-3 mr-1" />
                          Professor
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-3 w-3 mr-1" />
                          Student
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {profile?.email}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Calendar className="h-4 w-4" />
                    Member since {new Date(profile?.created_at || "").toLocaleDateString()}
                  </div>
                </div>
                <Button 
                  onClick={() => editing ? handleSave() : setEditing(true)}
                  disabled={loading}
                  variant={editing ? "default" : "outline"}
                >
                  {loading ? "Saving..." : editing ? "Save Changes" : "Edit Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {profile?.role === "professor" ? (
              <>
                <Card>
                  <CardContent className="p-4 text-center">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.subjectsCount}</div>
                    <div className="text-sm text-muted-foreground">Subjects</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.studentsCount}</div>
                    <div className="text-sm text-muted-foreground">Students</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <GraduationCap className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.materialsCount}</div>
                    <div className="text-sm text-muted-foreground">Materials</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.assignmentsCount}</div>
                    <div className="text-sm text-muted-foreground">Assignments</div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4 text-center">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.subjectsCount}</div>
                    <div className="text-sm text-muted-foreground">Enrolled Subjects</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.assignmentsCount}</div>
                    <div className="text-sm text-muted-foreground">Submissions</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Edit Profile Form */}
          {editing && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setEditing(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;