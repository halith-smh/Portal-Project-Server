const express = require('express');
const { login, profile, rfq, po, gr, pay_aging, memo_cd, invoice, logout, invoicePdF } = require('../controllers/vendorPortal.controller');
const { verifyAuth_vendor } = require('../middlewares/auth.middleware');

const vendorPortalRoutes = express.Router();

vendorPortalRoutes.post('/auth/login', login);
vendorPortalRoutes.post('/auth/logout', verifyAuth_vendor,logout);
vendorPortalRoutes.get('/auth/isLoggedIn', verifyAuth_vendor,(req, res) => {
  res.status(200).send({ isLoggedIn: true });
});
vendorPortalRoutes.get('/profile', verifyAuth_vendor, profile);


// Dashboard routes with authentication
vendorPortalRoutes.get('/dashboard/rfq', verifyAuth_vendor, rfq);
vendorPortalRoutes.get('/dashboard/po', verifyAuth_vendor, po);
vendorPortalRoutes.get('/dashboard/gr', verifyAuth_vendor, gr);

// Financial routes with authentication
vendorPortalRoutes.get('/financials/invoice', verifyAuth_vendor, invoice);
vendorPortalRoutes.get('/financials/invoice-pdf/:belnr', verifyAuth_vendor, invoicePdF);
vendorPortalRoutes.get('/financials/aging_pm', verifyAuth_vendor, pay_aging);
vendorPortalRoutes.get('/financials/memo_cd', verifyAuth_vendor, memo_cd);


module.exports = vendorPortalRoutes;