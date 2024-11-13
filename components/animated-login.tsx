'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner' // Make sure to install this package

const formSchema = z.object({
  username: z.string().min(1, {
    message: "Username is required.",
  }),
  password: z.string().min(4, {
    message: "Password must be at least 4 characters long.",
  }),
})

export function AnimatedLoginComponent() {
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
    <div className="flex items-center justify-center min-h-[100dvh] bg-gradient-to-r from-black via-gray-800 to-white p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[350px]"
      >
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Techtalk</CardTitle>
            <CardDescription className="text-center">Login to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-base">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...register("username")}
                  className={`h-11 text-base ${errors.username && "border-red-500"}`}
                />
                {errors.username && (
                  <p className="text-red-500 text-sm">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  className={`h-11 text-base ${errors.password && "border-red-500"}`}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}