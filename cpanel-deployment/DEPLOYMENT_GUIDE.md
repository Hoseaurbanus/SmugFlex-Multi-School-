# cPanel Deployment Guide
# Graceland Royal Academy School Management System

## 🚀 Quick Deployment Steps

### 1. Upload Files
- Upload all files from the `cpanel-deployment` folder to your cPanel public_html directory
- Maintain the folder structure:
  ```
  public_html/
  ├── index.html
  ├── assets/
  ├── api/
  ├── .htaccess
  └── public/
      └── assets/
  ```

### 2. Database Setup
1. Create a MySQL database in cPanel > MySQL Databases
2. Create a database user and assign privileges
3. Import the database SQL file from `database/mdpjhtua_graceland_academy (3).sql`

### 3. Configure API
Edit `api/config/database.php` with your database credentials:
```php
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_database_user';
$password = 'your_database_password';
```

### 4. Set Permissions
- Ensure `api/uploads/` folder is writable (755 permissions)
- Set `api/.env` file permissions to 644 (if exists)

### 5. PHP Configuration
In cPanel > Select PHP Version > PHP Options:
- Set PHP version to 8.0 or higher
- memory_limit: 256M
- max_execution_time: 300
- upload_max_filesize: 10M
- post_max_size: 10M

### 6. Test the System
1. Visit your domain
2. Test login with existing credentials
3. Verify all features are working

## 🔧 Configuration Files

### .htaccess
- Handles URL rewriting for SPA routing
- Configures security headers
- Enables compression and caching
- Sets PHP configuration

### API Structure
- `api/auth/` - Authentication endpoints
- `api/controllers/` - Business logic
- `api/config/` - Database configuration
- `api/database/` - Database queries

## 📋 Important Notes

1. **HTTPS**: Configure SSL certificate in cPanel for security
2. **Backups**: Regularly backup database and files
3. **Updates**: Keep PHP version updated
4. **Security**: Monitor error logs for suspicious activity

## 🛠 Troubleshooting

### 500 Internal Server Error
- Check PHP error logs in cPanel > Errors
- Verify .htaccess syntax
- Ensure file permissions are correct

### Database Connection Issues
- Verify database credentials in `api/config/database.php`
- Check database user privileges
- Ensure database server is running

### File Upload Issues
- Check folder permissions for `api/uploads/`
- Verify PHP upload limits
- Ensure sufficient disk space

## 📞 Support

For technical support:
1. Check cPanel error logs
2. Verify all configuration files
3. Test database connectivity
4. Review PHP settings

## 🎯 Features Included

- ✅ Complete School Management System
- ✅ Admin, Teacher, Student, Parent Dashboards
- ✅ Score Entry and Results Management
- ✅ Attendance Tracking
- ✅ Class Teacher Assignments (Fixed)
- ✅ Subject Management
- ✅ User Authentication
- ✅ File Upload System
- ✅ Responsive Design
- ✅ Security Features

## 🔄 Latest Fixes

- Fixed class teacher recognition issues
- Resolved dashboard display problems
- Enhanced security configurations
- Optimized for cPanel hosting
- Pure PHP backend architecture
