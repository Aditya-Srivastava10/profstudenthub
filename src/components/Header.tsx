import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, BookOpen, FileText, Users, ClipboardList } from 'lucide-react'

const Header = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
  }

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() || 'U'
  }

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    return user?.email || 'User'
  }

  const getRoleBadgeVariant = (role: string) => {
    return role === 'professor' ? 'default' : 'secondary'
  }

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-card-foreground cursor-pointer" onClick={() => navigate('/')}>
            Academic Portal
          </h1>
          
          {user && (
            <nav className="hidden md:flex items-center space-x-4">
              <Button
                variant={location.pathname === '/' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant={location.pathname === '/subjects' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/subjects')}
                className="flex items-center space-x-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Subjects</span>
              </Button>
              <Button
                variant={location.pathname === '/materials' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/materials')}
                className="flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Materials</span>
              </Button>
              {profile?.role === 'professor' && (
                <Button
                  variant={location.pathname === '/students' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/students')}
                  className="flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Students</span>
                </Button>
              )}
              <Button
                variant={location.pathname === '/assignments' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/assignments')}
                className="flex items-center space-x-2"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Assignments</span>
              </Button>
            </nav>
          )}
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Welcome,</span>
              <span className="text-sm font-medium text-card-foreground">{getDisplayName()}</span>
              {profile?.role && (
                <Badge variant={getRoleBadgeVariant(profile.role)}>
                  {profile.role}
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ''} alt={getDisplayName()} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    {profile?.role && (
                      <Badge variant={getRoleBadgeVariant(profile.role)} className="w-fit mt-1">
                        {profile.role}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header