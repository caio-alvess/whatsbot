import { cn } from 'cn'

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('loader', className)}></span>
}
