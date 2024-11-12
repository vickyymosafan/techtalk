'use client'

import { useEffect, useState, useCallback } from 'react'
import { Editor } from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

// Add language detection and mapping
const getLanguageFromCode = (code: string): string => {
  // Simple detection based on file extensions or content patterns
  if (code.includes('<?php')) return 'php'
  if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'html'
  if (code.includes('import React')) return 'typescript'
  if (code.includes('def ') || code.includes('print(')) return 'python'
  if (code.includes('function') || code.includes('=>')) return 'javascript'
  if (code.includes('.css') || code.includes('{')) return 'css'
  return 'plaintext'
}

export default function CodePreviewPage() {
  const [code, setCode] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedCode, setEditedCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const { theme } = useTheme()

  // Add supported languages
  const supportedLanguages = [
    { id: 'plaintext', name: 'Plain Text' },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'html', name: 'HTML' },
    { id: 'css', name: 'CSS' },
    { id: 'php', name: 'PHP' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'csharp', name: 'C#' },
    { id: 'cpp', name: 'C++' },
    { id: 'ruby', name: 'Ruby' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' },
    { id: 'sql', name: 'SQL' },
    { id: 'markdown', name: 'Markdown' },
    { id: 'json', name: 'JSON' },
    { id: 'yaml', name: 'YAML' },
    { id: 'shell', name: 'Shell' },
  ]

  useEffect(() => {
    // Update language when code changes
    const detectedLanguage = getLanguageFromCode(code)
    // Verify if detected language is in supported languages before setting
    const isSupported = supportedLanguages.some(lang => lang.id === detectedLanguage)
    if (isSupported) {
      setLanguage(detectedLanguage)
    }
  }, [code])

  useEffect(() => {
    // Temporary example code
    const initialCode = `function example() {
  console.log("Hello, World!");
}`
    setCode(initialCode)
    setEditedCode(initialCode)
  }, [])

  const handleCodeChange = useCallback((value: string | undefined) => {
    setEditedCode(value || '')
  }, [])

  const handleSaveCode = useCallback(() => {
    setCode(editedCode)
    setIsEditing(false)
  }, [editedCode])

  return (
    <div className="h-screen bg-background">
      <Tabs defaultValue="code" className="w-full h-full">
        <div className="border-b px-4">
          <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
            <TabsList className="w-full max-w-md">
              <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
            </TabsList>
            
            {/* Add language selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="ml-4 px-2 py-1 rounded border bg-background text-foreground"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <TabsContent value="code" className="h-[calc(100vh-3rem)]">
          <div className="relative h-full">
            <Editor
              height="100%"
              language={language} // Use selected language
              theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
              value={isEditing ? editedCode : code}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                readOnly: !isEditing,
                wordWrap: 'on', // Add word wrap
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                formatOnPaste: true,
                formatOnType: true,
                automaticLayout: true,
              }}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true)
                    setEditedCode(code)
                  }}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      setEditedCode(code)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveCode}
                  >
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="h-[calc(100vh-3rem)] p-4">
          <div className="h-full border rounded p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Output:</h3>
              <span className="text-sm text-muted-foreground">
                Language: {supportedLanguages.find(lang => lang.id === language)?.name}
              </span>
            </div>
            <pre className="whitespace-pre-wrap break-words">
              <code className={`language-${language}`}>
                {code}
              </code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 