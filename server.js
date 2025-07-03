const express = require("express");
const dotenv = require("dotenv");
const cors = require('cors');
const cookieParser = require('cookie-parser');

const customerPortalRoutes = require("./routes/customerPortalRoutes");
const vendorPortalRoutes = require("./routes/vendorPortalRoutes");
const employeePortalRoutes = require("./routes/employeePortalRoutes");
const maintenancePortalRoutes = require("./routes/maintenancePortalRoutes");

dotenv.config();
const app = express();

const PORT = 4000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors(
  {
    // origin: "http://localhost:4200",
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }
));

// log
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
}
);

app.get("/", (req, res) => {
  res.send({stats: 200, message: 'Portal API is running successfully!'});  
});

app.use("/api/customer-portal", customerPortalRoutes);
app.use("/api/vendor-portal", vendorPortalRoutes);
app.use("/api/employee-portal", employeePortalRoutes);
app.use('/api/maintenance-portal', maintenancePortalRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
