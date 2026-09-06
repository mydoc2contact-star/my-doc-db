import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export function BackButton({
  fallback = '/',
  className,
}: {
  fallback?: string
  className?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={() => {
        if (location.key !== 'default') navigate(-1)
        else navigate(fallback)
      }}
      leftIcon={<ArrowRight className="h-4 w-4" />}
    >
      رجوع
    </Button>
  )
}
