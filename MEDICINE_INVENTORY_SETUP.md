# Medicine Inventory & Sales Feature Setup

This guide explains the new medicine inventory and sales feature that has been added to your Dental Management System.

## Overview

The system now supports:
- **Medicine Inventory Management**: Track medicine stock, pricing, and categories
- **Medicine Sales**: Sell medicines to patients along with treatments
- **Stock Alerts**: Visual indicators for low stock levels
- **Integrated Billing**: Medicine costs are automatically added to patient bills

## Setup Steps

### 1. Create Database Tables

Run the SQL script in `database/medicines_table.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/medicines_table.sql`
4. Execute the script

This will create:
- `medicines` table for inventory management
- `medicine_sales` table for tracking sales
- Indexes for performance
- Automatic timestamp updates
- Row Level Security (RLS) policies

## Features

### Inventory Management

**Access**: Click on "Inventory" in the sidebar

**Capabilities**:
- Add new medicines with details (name, description, unit, price, stock, min stock, category)
- Edit existing medicines
- Delete medicines
- View stock levels with visual indicators:
  - 🟢 Green: Good stock
  - 🟡 Yellow: Low stock (below 1.5x minimum)
  - 🔴 Red: Critical stock (at or below minimum) or out of stock

**Medicine Units**: pack, bottle, box, unit, tablet

### Medicine Sales with Treatments

**How it works**:
1. When recording a treatment for a patient, after selecting the treatment type, a medicine selection modal appears
2. Select medicines and quantities from available stock
3. Medicines are automatically:
   - Deducted from inventory
   - Added to patient's bill
   - Linked to the treatment record

**Example Flow**:
1. Patient gets Root Canal treatment ($200)
2. Doctor also prescribes Pain Killer (1 pack @ $15)
3. System records:
   - Treatment: Root Canal - $200
   - Medicine: Pain Killer (1 pack) - $15
   - Total Bill: $215
   - Stock updated: Pain Killer reduced by 1 pack

### Stock Management

- **Current Stock**: Real-time inventory count
- **Minimum Stock**: Set alert threshold for low stock warnings
- **Automatic Deduction**: Stock decreases when medicines are sold
- **Stock Validation**: Cannot sell more than available stock

## Database Schema

### Medicines Table
```sql
medicines
├── id (UUID, Primary Key)
├── name (VARCHAR, Not Null)
├── description (TEXT)
├── unit (VARCHAR, Default: 'pack')
├── price (DECIMAL, Not Null)
├── stock (INTEGER, Not Null)
├── min_stock (INTEGER)
├── category (VARCHAR)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### Medicine Sales Table
```sql
medicine_sales
├── id (UUID, Primary Key)
├── patient_id (UUID, Foreign Key → patients)
├── medicine_id (UUID, Foreign Key → medicines)
├── quantity (INTEGER, Not Null)
├── unit_price (DECIMAL, Not Null)
├── total_price (DECIMAL, Not Null)
├── date (DATE, Not Null)
├── treatment_id (UUID, Optional)
└── created_at (TIMESTAMP)
```

## Usage Guide

### Adding a New Medicine

1. Navigate to **Inventory** tab
2. Click **"Add Medicine"** button
3. Fill in the form:
   - **Medicine Name**: e.g., "Pain Killer", "Antibiotics"
   - **Description**: Optional details
   - **Unit**: Select from dropdown (pack, bottle, box, unit, tablet)
   - **Category**: Optional (e.g., "Pain Relief", "Antibiotics")
   - **Price**: Price per unit
   - **Stock**: Initial stock quantity
   - **Min Stock**: Alert threshold (optional)
4. Click **"Create Medicine"**

### Selling Medicines with Treatment

1. Select a patient and go to **Clinical Focus** view
2. Select teeth (if applicable) and choose a treatment
3. After selecting treatment, **Medicine Selection Modal** appears
4. Browse available medicines (only in-stock items shown)
5. Use +/- buttons or type quantity
6. Review total medicine cost
7. Click **"Add to Treatment"**
8. Treatment and medicines are recorded together
9. Patient balance is updated automatically

### Editing Medicine

1. Go to **Inventory** tab
2. Click edit icon (pencil) next to medicine
3. Update fields as needed
4. Click **"Update Medicine"**

### Stock Alerts

- Medicines with stock at or below minimum show **yellow/red indicators**
- Out of stock medicines won't appear in sales modal
- Check inventory regularly to maintain stock levels

## Best Practices

1. **Set Minimum Stock Levels**: Helps prevent running out of popular medicines
2. **Use Categories**: Organize medicines for easier management
3. **Regular Stock Updates**: Update stock when receiving new shipments
4. **Accurate Pricing**: Keep prices updated for correct billing
5. **Descriptive Names**: Use clear medicine names for easy identification

## Integration with Existing Features

- **Patient Billing**: Medicine costs automatically added to patient balance
- **Treatment Records**: Medicines linked to treatments in clinical history
- **Receipts**: Medicine sales included in patient receipts
- **Financial Tracking**: All medicine sales tracked in system

## Troubleshooting

**Issue: "Insufficient stock" error**
- Solution: Check current stock in Inventory tab and reduce quantity or restock

**Issue: Medicine not appearing in selection modal**
- Solution: Medicine must have stock > 0 to appear in sales modal

**Issue: Stock not updating after sale**
- Solution: Refresh the inventory view or check browser console for errors

**Issue: Cannot delete medicine**
- Solution: Check if medicine has sales records. You may need to delete sales first or handle cascading deletes.

## Next Steps

After setup:
1. Add your clinic's medicines to inventory
2. Set appropriate stock levels and minimum thresholds
3. Test medicine sales with a sample treatment
4. Train staff on medicine selection during treatments
5. Set up regular inventory review schedule

