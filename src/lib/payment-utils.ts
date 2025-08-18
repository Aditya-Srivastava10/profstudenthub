export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100); // Convert from paisa to rupees
}

export function getStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'default'; // Green-ish
    case 'pending':
      return 'secondary'; // Yellow-ish
    case 'overdue':
    case 'failed':
      return 'destructive'; // Red
    default:
      return 'outline';
  }
}

export function calculateLateFee(amount: number, dueDate: string, lateFeePercentage: number): number {
  const due = new Date(dueDate);
  const today = new Date();
  
  if (today <= due) return 0;
  
  return Math.floor(amount * (lateFeePercentage / 100));
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}