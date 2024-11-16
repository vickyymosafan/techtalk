 'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  username: z.string().min(1, {
    message: "Username is required.",
  }),
  password: z.string().min(4, {
    message: "Password must be at least 4 characters long.",
  }),
})

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    try {
      const success = await login(data.username, data.password)
      if (success) {
        toast.success('Login successful!')
        router.push('/dashboard')
      } else {
        toast.error('Invalid credentials')
      }
    } catch (error) {
      toast.error('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px] mx-auto px-2 sm:px-0"
      >
        <Card className="shadow-2xl bg-white/10 backdrop-blur-md border-gray-800">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <img 
                    src="/images/logos/techtalk-white.png"
                    alt="Techtalk Logo" 
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/images/logos/fallback-logo.png'
                      e.currentTarget.onerror = null
                    }}
                  />
                </div>
              </motion.div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-white">Techtalk</CardTitle>
            <CardDescription className="text-center text-gray-400">Login to your account</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-200">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...register("username")}
                  className={`h-10 text-sm bg-gray-800 border-gray-700 text-white placeholder-gray-400 ${errors.username && "border-red-500"}`}
                />
                {errors.username && (
                  <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password")}
                  className={`h-10 text-sm bg-gray-800 border-gray-700 text-white placeholder-gray-400 ${errors.password && "border-red-500"}`}
                />
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:space-x-2">
              <Button variant="outline" className="w-full bg-white hover:bg-gray-100 text-black text-sm sm:text-base" onClick={() => toast.info('Google login not implemented')}>
                <img 
                  src="https://th.bing.com/th/id/R.7e557f1c0864829c54c300d15bee69f4?rik=fjZN1AYH30vXIw&riu=http%3a%2f%2fpngimg.com%2fuploads%2fgoogle%2fgoogle_PNG19635.png&ehk=ZmsumEtoeJQhKoUzQTZO2TEbYPBu0%2b7EFdjmJ3qljls%3d&risl=&pid=ImgRaw&r=0"
                  alt="Google Logo"
                  className="w-5 h-5 mr-2"
                />
                <span className="font-medium text-black">Google</span>
              </Button>
              <Button variant="outline" className="w-full bg-white hover:bg-gray-100 text-black text-sm sm:text-base" onClick={() => toast.info('GitHub login not implemented')}>
                <img 
                  src="https://pngimg.com/uploads/github/github_PNG40.png"
                  alt="GitHub Logo"
                  className="w-5 h-5 mr-2"
                />
                <span className="font-medium text-black">GitHub</span>
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-center w-full text-gray-400">
              <a href="#" className="hover:text-primary underline underline-offset-4" onClick={(e) => { e.preventDefault(); toast.info('Forgot password not implemented') }}>Forgot password?</a>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}