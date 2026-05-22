# 📱 Employee Attendance Management System

A modern, serverless attendance management system built with Next.js and Supabase. This application helps organizations track employee attendance, manage leaves, calculate salaries, and generate reports - all without needing a backend server.

## ✨ Key Features

### For Employees
- ✅ **Smart Check-in/Check-out** - Mark attendance with selfie capture and GPS validation
- 📅 **Leave Management** - Apply for full-day, half-day, or short leaves
- 📊 **Attendance History** - View your complete attendance records
- 💰 **Salary Information** - Check monthly salary calculations and breakdowns
- 🏖️ **Leave Balance** - Track available leave days in real-time

### For Administrators
- 👥 **Employee Management** - Add, edit, and manage employee profiles
- ✅ **Leave Approvals** - Review and approve/reject leave requests
- 📈 **Dashboard Analytics** - View attendance statistics and trends
- 💵 **Salary Processing** - Calculate and manage monthly salaries
- 📊 **Export Reports** - Download attendance, leave, and salary reports (CSV/Excel)
- 🏢 **Office Configuration** - Set office locations and GPS boundaries
- 🎯 **Holiday Management** - Configure company holidays

### Business Rules
- **Attendance Timing**:
  - 9:00-9:05 AM → Present (Full day)
  - 9:05-9:30 AM → Late (4 allowed per month, then half day)
  - After 9:30 AM → Half Day
- **Leave Credits**: 1.5 days/month (regular employees), 1 day/month (interns)
- **Short Leave**: Maximum 2 hours, up to 2 per month
- **No-Leave Bonus**: 2 days salary for months with zero leaves
- **Salary Formula**: (Monthly Salary ÷ Working Days) × Attendance Value

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18 or higher
- A Supabase account (free tier works fine)
- Modern web browser

### Step 1: Clone and Install

```bash
cd Attendence
npm install
```

### Step 2: Setup Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the `DATABASE_SETUP.sql` file to create all tables
4. Run the `supabase/migrations/001_database_functions.sql` file to create database functions

### Step 3: Configure Storage

1. In Supabase Dashboard, go to **Storage**
2. Create a new bucket named `selfies`
3. Make it **Public** (for employee selfie uploads)

### Step 4: Environment Setup

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Get these values from: Supabase Dashboard → Settings → API

**Note**: The service role key is used for admin operations like creating users.

### Step 5: Create Admin Account

Run this SQL in Supabase SQL Editor:

```sql
-- Create admin user in Supabase Auth
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@company.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"System Administrator"}',
  'authenticated',
  'authenticated'
);

-- Update profile to admin role
UPDATE users 
SET role = 'admin', name = 'System Administrator'
WHERE email = 'admin@company.com';
```

### Step 6: Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Default Login:**
- Email: `admin@company.com`
- Password: `admin123`

⚠️ **Important**: Change the admin password after first login!

## 📁 Project Structure

```
Attendence/
├── src/
│   ├── app/                    # Application pages
│   │   ├── (admin)/           # Admin dashboard & features
│   │   ├── (employee)/        # Employee dashboard & features
│   │   ├── (auth)/            # Login page
│   │   └── api/               # API routes
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Utilities and services
│   │   └── supabase/         # Database service functions
│   └── hooks/                # Custom React hooks
├── supabase/
│   └── migrations/           # Database functions
├── public/                   # Static assets
├── DATABASE_SETUP.sql        # Database schema
├── .env.local               # Environment variables (create this)
└── package.json             # Dependencies
```

## 🎯 How to Use

### For Administrators

1. **Add Employees**
   - Login as admin
   - Navigate to "Create User"
   - Fill in employee details (name, email, salary, etc.)
   - System generates credentials automatically

2. **Configure Office Location**
   - Go to Settings
   - Add office GPS coordinates
   - Set validation radius (e.g., 100 meters)

3. **Manage Holidays**
   - Go to Holidays section
   - Add company holidays for the year
   - System automatically excludes these from attendance

4. **Approve Leaves**
   - Check pending leave requests on dashboard
   - Review and approve/reject with one click

5. **Generate Reports**
   - Go to Reports section
   - Select date range
   - Export as CSV or Excel

### For Employees

1. **Mark Attendance**
   - Login to your account
   - Click "Mark Attendance"
   - Allow camera and GPS permissions
   - Take selfie and submit
   - System validates location and time automatically

2. **Apply for Leave**
   - Go to Leaves section
   - Select leave type (full day/half day/short leave)
   - Choose dates and provide reason
   - Submit for approval

3. **Check Salary**
   - Go to Salary section
   - View monthly salary breakdown
   - See attendance value and deductions

## 🔐 Security Features

- **Supabase Authentication** - Industry-standard auth with bcrypt password hashing
- **Automatic Token Refresh** - Sessions managed automatically by Supabase
- **Role-Based Access** - Separate admin and employee permissions
- **GPS Validation** - Ensures attendance from office location
- **Selfie Verification** - Photo proof for each attendance
- **Secure Storage** - All data encrypted in Supabase

## 🚢 Deployment to Production

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click Deploy

Your app will be live in minutes!

### Alternative: Deploy to Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Add environment variables
4. Deploy

## 📊 Database Schema

The system uses 7 main tables:

- **users** - Employee profiles and credentials
- **attendance** - Daily attendance records with check-in/out times
- **leaves** - Leave applications and approvals
- **salary** - Monthly salary calculations
- **company_holidays** - Public holidays
- **office_locations** - Office GPS coordinates
- **audit_logs** - System activity logs

All business logic runs as PostgreSQL functions for better performance and security.

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
**Solution**: Create `.env.local` file with your Supabase credentials and restart the dev server.

### "Function not found" error
**Solution**: Make sure you ran the `001_database_functions.sql` file in Supabase SQL Editor.

### GPS validation failing
**Solution**: 
- Ensure office location is configured in Settings
- Check browser has location permissions
- Verify GPS coordinates are correct

### Selfie upload not working
**Solution**: 
- Verify `selfies` bucket exists in Supabase Storage
- Make sure bucket is set to Public
- Check browser camera permissions

### Cannot login
**Solution**:
- Verify admin user exists in database
- Check email and password are correct
- Clear browser cache and try again

## 📈 System Requirements

### Server Requirements
- **None!** This is a serverless application
- Supabase handles all backend operations
- No server maintenance needed

### Client Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Camera access for selfie capture
- GPS/Location services enabled
- Internet connection

## 🔄 Backup and Maintenance

### Database Backup
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Enable automatic daily backups
4. Download manual backup when needed

### Regular Maintenance
- Review and archive old attendance records quarterly
- Update company holidays annually
- Review employee leave balances monthly
- Export reports for accounting purposes

## 📞 Support

For technical issues:
1. Check the Troubleshooting section above
2. Review [Supabase Documentation](https://supabase.com/docs)
3. Check [Next.js Documentation](https://nextjs.org/docs)

## 📄 License

Private - Internal Use Only

## 🎯 Future Enhancements

Planned features for future releases:
- 📱 Mobile app (iOS & Android)
- 🔔 Real-time notifications
- 📧 Email reports
- 🤖 Automated reminders
- 📊 Advanced analytics dashboard
- 🔐 Biometric authentication
- 🌍 Multi-office support

## 💡 Tips for Best Results

1. **For Accurate Attendance**: Ensure employees mark attendance within office premises
2. **For Leave Management**: Process leave requests promptly to maintain employee satisfaction
3. **For Salary Accuracy**: Calculate salaries after month-end when all attendance is finalized
4. **For Reports**: Export reports regularly for backup and accounting purposes
5. **For Security**: Change default admin password immediately after setup

---

**Built with ❤️ using Next.js 14 and Supabase**

*Version 2.0.0 - Serverless Architecture*
