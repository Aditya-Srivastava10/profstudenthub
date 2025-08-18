export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const calculateLateFee = (amount: number, dueDate: string, lateFeePercentage: number): number => {
  const today = new Date();
  const due = new Date(dueDate);
  
  if (today > due) {
    return Math.floor(amount * (lateFeePercentage / 100));
  }
  
  return 0;
};

export const getTotalAmountWithLateFee = (amount: number, dueDate: string, lateFeePercentage: number): number => {
  return amount + calculateLateFee(amount, dueDate, lateFeePercentage);
};