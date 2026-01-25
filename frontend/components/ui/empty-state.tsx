import { ReactNode } from "react"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import {
  Database,
  Users,
  AlertTriangle,
  Search,
  FileX,
  TrendingDown,
  Inbox,
} from "lucide-react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon && (
          <div className="mb-4 text-muted-foreground">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {description}
          </p>
        )}
        {action}
      </CardContent>
    </Card>
  )
}

// Preset empty states for common scenarios
export function NoDataEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={<Database className="h-12 w-12" />}
      title="No data available"
      description="There's no data to display yet. Check back later or try adjusting your filters."
    />
  );
}

export function NoCustomersEmptyState({
  onAction,
  className,
}: {
  onAction?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={<Users className="h-12 w-12" />}
      title="No customers found"
      description="You don't have any customers yet. Add your first customer to start tracking their lifecycle."
      action={
        onAction ? (
          <Button onClick={onAction} variant="default">
            Add Customer
          </Button>
        ) : undefined
      }
    />
  );
}

export function NoResultsEmptyState({
  onReset,
  className,
}: {
  onReset?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={<Search className="h-12 w-12" />}
      title="No results found"
      description="We couldn't find any results matching your search. Try adjusting your filters or search terms."
      action={
        onReset ? (
          <Button onClick={onReset} variant="outline">
            Clear Filters
          </Button>
        ) : undefined
      }
    />
  );
}

export function NoAtRiskCustomersEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={<AlertTriangle className="h-12 w-12" />}
      title="No customers at risk"
      description="Great news! All your customers have healthy engagement scores. Keep up the good work!"
    />
  );
}

export function ErrorEmptyState({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={<FileX className="h-12 w-12" />}
      title="Failed to load data"
      description="We encountered an error while loading the data. Please try again."
      action={
        onRetry ? (
          <Button onClick={onRetry} variant="default">
            Retry
          </Button>
        ) : undefined
      }
    />
  );
}

export function NoRevenueEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={<TrendingDown className="h-12 w-12" />}
      title="No revenue data"
      description="Start adding customers and tracking subscriptions to see revenue analytics."
    />
  );
}

export function InboxEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={<Inbox className="h-12 w-12" />}
      title="All caught up!"
      description="You have no pending actions or notifications at this time."
    />
  );
}
