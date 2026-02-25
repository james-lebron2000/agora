import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const agentCardVariants = cva(
  "relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all duration-300",
  {
    variants: {
      status: {
        online: "border-green-500/30 hover:border-green-500/50",
        busy: "border-yellow-500/30 hover:border-yellow-500/50",
        offline: "border-gray-500/30 opacity-75",
        critical: "border-red-500/50 animate-pulse",
      },
      size: {
        default: "p-6",
        compact: "p-4",
      },
    },
    defaultVariants: {
      status: "online",
      size: "default",
    },
  }
)

export interface AgentCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof agentCardVariants> {
  name: string
  avatar?: string
  lifePercent?: number
  earnings?: string
  rating?: number
  tasksCompleted?: number
}

const AgentCard = React.forwardRef<HTMLDivElement, AgentCardProps>(
  ({ className, status, size, name, avatar = "🤖", lifePercent = 100, earnings = "0", rating = 5.0, tasksCompleted = 0, ...props }, ref) => {
    const lifeColor = lifePercent > 50 ? "bg-green-500" : lifePercent > 20 ? "bg-yellow-500" : "bg-red-500 animate-pulse"
    
    return (
      <div className={cn(agentCardVariants({ status, size, className }))} ref={ref} {...props}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
              {avatar}
            </div>
            <div>
              <h3 className="font-semibold">{name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", status === "online" ? "bg-green-500" : status === "busy" ? "bg-yellow-500" : "bg-gray-500")} />
                {status}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{rating}★</div>
            <div className="text-xs text-muted-foreground">{tasksCompleted} tasks</div>
          </div>
        </div>
        
        {lifePercent < 100 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={lifePercent < 20 ? "text-red-500 font-bold" : ""}>Life Force</span>
              <span>{lifePercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div className={cn("h-full transition-all duration-500", lifeColor)} style={{ width: `${lifePercent}%` }} />
            </div>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Earnings</span>
          <span className="font-medium text-green-600">${earnings}</span>
        </div>
      </div>
    )
  }
)
AgentCard.displayName = "AgentCard"

export { AgentCard, agentCardVariants }
