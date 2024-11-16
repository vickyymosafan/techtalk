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
    <main className="flex items-center justify-center min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <motion.section
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px] mx-auto px-2 sm:px-0"
      >
        <Card className="shadow-2xl bg-white/10 backdrop-blur-md border-gray-800">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <CardTitle className="text-2xl font-bold text-center text-white">TECHTALK</CardTitle>
            <CardDescription className="text-center text-gray-400">Login to your account</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <fieldset className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-200">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...register("username")}
                  className={`h-10 text-sm bg-gray-800 border-gray-700 text-white placeholder-gray-400 ${errors.username && "border-red-500"}`}
                />
                {errors.username && (
                  <small className="text-red-400 text-xs mt-1">{errors.username.message}</small>
                )}
              </fieldset>
              <fieldset className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password")}
                  className={`h-10 text-sm bg-gray-800 border-gray-700 text-white placeholder-gray-400 ${errors.password && "border-red-500"}`}
                />
                {errors.password && (
                  <small className="text-red-400 text-xs mt-1">{errors.password.message}</small>
                )}
              </fieldset>
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
          </CardContent>
        </Card>
      </motion.section>
    </main>
  )
}