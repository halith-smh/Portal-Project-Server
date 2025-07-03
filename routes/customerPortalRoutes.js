const express = require('express');
const { login, logout, profile, inquiryData, salesOrderData, deliveriesrData, invoicesData, paymentsAgingData, creditDebitData, invoiceDownload, salesOverviewData } = require('../controllers/customerPortal.controller.js');
const { verifyAuth } = require('../middlewares/auth.middleware.js');

const customerPortalRoutes = express.Router();

customerPortalRoutes.get('/', (req, res) => {
  res.send({status: 200, message: 'Customer Portal API'});
});

// Authentication
customerPortalRoutes.post('/auth/login', login);
customerPortalRoutes.post('/auth/logout', logout);
customerPortalRoutes.get('/auth/isLoggedIn', verifyAuth, (req, res) => {
  res.status(200).send({ isLoggedIn: true });
});

// Profile
customerPortalRoutes.get("/profile", verifyAuth, profile);

// Dashboard
customerPortalRoutes.get("/dashboard/inquiry-data", verifyAuth,inquiryData);
customerPortalRoutes.get("/dashboard/sales-data", verifyAuth, salesOrderData);
customerPortalRoutes.get("/dashboard/deliveries-data", verifyAuth, deliveriesrData);

// Financial
customerPortalRoutes.get("/financials/invoices-data", verifyAuth, invoicesData);
customerPortalRoutes.get("/financials/invoices-data/:vebln", verifyAuth, invoiceDownload);
customerPortalRoutes.get("/financials/payments-aging-data", verifyAuth, paymentsAgingData);
customerPortalRoutes.get("/financials/credit-debit-data", verifyAuth, creditDebitData);
customerPortalRoutes.get("/financials/sales-overview-data", verifyAuth, salesOverviewData);



module.exports = customerPortalRoutes;

