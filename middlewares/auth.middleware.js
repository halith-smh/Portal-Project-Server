const jwt = require("jsonwebtoken");

const verifyAuth = async (req, res, next) => {
    const { JWT_SECRET_CUSTOMER } = process.env;
    const token = req.cookies.authToken_customer;

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET_CUSTOMER);
        req.customerId = decoded.customerId;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(403).send({ message: 'Forbidden' });
    }
}

const verifyAuth_vendor = async (req, res, next) => {
    const { JWT_SECRET_VENDOR } = process.env;
    const token = req.cookies.authToken_vendor;

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET_VENDOR);
        req.vendorId = decoded.vendorId;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(403).send({ message: 'Forbidden' });
    }
}


const verifyAuth_employee = async (req, res, next) => {
    const { JWT_SECRET_EMPLOYEE } = process.env;
    const token = req.cookies.authToken_employee;

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET_EMPLOYEE);
        req.employeeId = decoded.employeeId;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(403).send({ message: 'Forbidden' });
    }
}


const verifyAuth_maintenance = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: "Unauthorized - No token provided" 
            });
        }

        // Extract token from Bearer token
        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET_MAINTENANCE);
        req.employeeId = decoded.employeeId;
        next();
    } catch (error) {
        return res.status(401).json({ 
            message: "Unauthorized - Invalid token" 
        });
    }
};

module.exports = {
    verifyAuth,
    verifyAuth_vendor,
    verifyAuth_employee,
    verifyAuth_maintenance
};