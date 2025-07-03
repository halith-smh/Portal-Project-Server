const express = require('express');
const { login, logout, profile, leaveData, payrollData, payslipData, emailPayslip } = require('../controllers/employeePortal.controller');
const { verifyAuth_employee } = require('../middlewares/auth.middleware');


const employeePortalRoutes = express.Router();

// Login route
employeePortalRoutes.post('/auth/login', login);
employeePortalRoutes.post('/auth/logout', verifyAuth_employee, logout);
employeePortalRoutes.get('/auth/isLoggedIn', verifyAuth_employee,(req, res) => {
  res.status(200).send({ isLoggedIn: true });
});

employeePortalRoutes.get('/dashboard/profile', verifyAuth_employee, profile);
employeePortalRoutes.get('/leave', verifyAuth_employee, leaveData);
employeePortalRoutes.get('/payroll', verifyAuth_employee, payrollData);
employeePortalRoutes.get('/payslip', verifyAuth_employee, payslipData);
employeePortalRoutes.post('/email-payslip', verifyAuth_employee, emailPayslip);

module.exports = employeePortalRoutes;