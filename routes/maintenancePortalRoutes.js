const express = require('express');
const { login, logout, plantList, notifications, workOrders } = require('../controllers/maintenancePortal.controller');
const { verifyAuth_maintenance } = require('../middlewares/auth.middleware');

const maintenancePortalRoutes = express.Router();

maintenancePortalRoutes.post('/auth/login', login);
maintenancePortalRoutes.post('/auth/logout', verifyAuth_maintenance, logout);
maintenancePortalRoutes.get('/auth/isLoggedIn', verifyAuth_maintenance, (req, res) => {
  res.status(200).send({ isLoggedIn: true });
});

// Plant List route
maintenancePortalRoutes.get('/plant-list', verifyAuth_maintenance, plantList);

// Notifications route
maintenancePortalRoutes.get('/notifications/:plantId', verifyAuth_maintenance, notifications);
maintenancePortalRoutes.get('/work-orders/:plantId', verifyAuth_maintenance, workOrders);

module.exports = maintenancePortalRoutes;