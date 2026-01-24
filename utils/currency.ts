export type Currency = 'USD' | 'MMK';

export const formatCurrency = (amount: number, currency: Currency = 'USD'): string => {
  if (currency === 'MMK') {
    // MMK typically doesn't use decimals, round to nearest whole number
    return `Ks${Math.round(amount).toLocaleString('en-US')}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getCurrencySymbol = (currency: Currency): string => {
  return currency === 'MMK' ? 'Ks' : '$';
};

