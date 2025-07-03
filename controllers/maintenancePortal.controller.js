const axios = require('axios');
const https = require('https');
const jwt = require("jsonwebtoken");

const agent = new https.Agent({ rejectUnauthorized: false });
const AUTH_HEADER = `Basic SzkwMTQ5NjpIYWxpdGhAMjAwNA==`;

const login = async (req, res) => {
    const { employeeId, password } = req.body;
    const { JWT_SECRET_MAINTENANCE } = process.env;

    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            message: "Maintenance ID and password are required"
        });
    }

    try {
        // Get CSRF token
        const { headers } = await axios.get("https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZPM_MAINTENANCE_PORTAL_LOGIN_SRV", {
            headers: {
                'Authorization': AUTH_HEADER,
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            },
            httpsAgent: agent
        });

        const csrfToken = headers['x-csrf-token'];
        if (!csrfToken) {
            return res.status(500).json({
                success: false,
                message: 'CSRF token not received'
            });
        }

        // Login request
        const { data } = await axios.post(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZPM_MAINTENANCE_PORTAL_LOGIN_SRV/ZPM_MAINTENANCE_LOGIN_ETSet`, {
            EMPLOYEE_ID: employeeId,
            PASSWORD: password
        }, {
            headers: {
                'Authorization': AUTH_HEADER,
                'X-CSRF-Token': csrfToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cookie': headers['set-cookie']?.join('; ') || ''
            },
            httpsAgent: agent
        });

        const result = data?.d;

        if (result?.STATUS == 1) {
            //     const token = jwt.sign({ employeeId }, JWT_SECRET_MAINTENANCE, { expiresIn: '3d' });

            //     res.cookie('authToken_maintenance', token, {
            //         httpOnly: true,
            //         secure: true,
            //         sameSite: 'Strict',
            //         maxAge: 3 * 24 * 60 * 60 * 1000 // 3days
            //     });

            //     return res.status(200).send({
            //         isAuthenticated: result?.STATUS,
            //         message: result?.MESSAGE
            //     });
            // } else {
            //     return res.status(401).send({
            //         isAuthenticated: result?.STATUS,
            //         message: result?.MESSAGE || 'Login failed'
            //     });


            const token = jwt.sign(
                { employeeId },
                JWT_SECRET_MAINTENANCE,
                { expiresIn: '3d' }
            );

            // For mobile apps, return token in response body instead of cookies
            return res.status(200).json({
                isAuthenticated: result?.STATUS,
                message: result?.MESSAGE || 'Login successful',
                token: token, // Send token in response for mobile storage
                user: {
                    employeeId: employeeId,
                }
            });
        } else {
            return res.status(401).json({
                isAuthenticated: result?.STATUS || 0,
                message: result?.MESSAGE || 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Login Error:', error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Maintenance login failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};

const logout = async (req, res) => {
    res.clearCookie('authToken_maintenance', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });
    res.status(200).send({
        isAuthenticated: 0,
        message: 'Logged out successfully'
    });
};


const plantList = async (req, res) => {
    const employeeId = req.employeeId;

    if (!employeeId) {
        return res.status(400).json({
            success: false,
            message: "Employee ID is required"
        });
    }

    try {
        const { data } = await axios.get(
            `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZPM_MAINTENANCE_PORTAL_PLANT_L_SRV/ZPM_MAINTENANCE_PLANT_LIST_ET001Set?$filter=EMPLOYEE_ID eq '${employeeId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Remove __metadata from each result and transform data
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => ({
                plantId: item.Werks,
                name: item.Name1,
                city: item.Ort01,
                postalCode: item.Pstlz,
                street: item.Stras,
                country: item.Land1,
                factoryCalendar: item.Fabkl,
                calendarCode: item.FabklCode,
                employeeId: item.EMPLOYEE_ID
            }));
        }

        return res.status(200).json({
            plantList: finalData?.results || []
        });

    } catch (error) {
        console.error('Plant List Error:', error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to retrieve plant list',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};
const notifications = async (req, res) => {
    const { plantId } = req.params;

    if (!plantId) {
        return res.status(400).json({
            success: false,
            message: "Plant ID is required"
        });
    }

    try {
        const { data } = await axios.get(
            `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZPM_MAINTENANCE_PORTAL_NOTIFY_SRV/ZPM_MAINTENANCE_NOTIFY_ETSet?$filter=IWERK eq '${plantId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Transform the data
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => ({
                notificationNumber: item.Qmnum,
                plantId: item.IWERK,
                orderNumber: item.Iloan,
                equipmentNumber: item.Equnr,
                plannerGroup: item.Ingrp,
                duration: item.Auztv,
                processType: item.Artpr,
                description: item.Qmtxt,
                priority: item.Priok || 'N/A',
                workCenter: item.Arbplwerk,
                startDate: item.Ausvn,
                notificationType: item.Qmart
            }));
        }

        return res.status(200).json({
            notifications: finalData?.results || []
        });

    } catch (error) {
        console.error('Notifications Error:', error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to retrieve notifications',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};
const workOrders = async (req, res) => {
    const { plantId } = req.params;

    if (!plantId) {
        return res.status(400).json({
            success: false,
            message: "Plant ID is required"
        });
    }

    try {
        const { data } = await axios.get(
            `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZPM_MAINTENANCE_PORTAL_WORK_OD_SRV/ZPM_MAINTENANCE_WORK_ORDER_ETSet?$filter=WERKS eq '${plantId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Transform the data
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => ({
                orderNumber: item.Aufnr,
                orderType: item.Auart,
                description: item.Ktext,
                orderCategory: item.Autyp,
                companyCode: item.Bukrs,
                mainWorkCenter: item.Sowrk,
                plantId: item.WERKS,
                application: item.Kappl,
                costing: item.Kalsm,
                maintenanceActivityType: item.Vaplz,
                costCenter: item.Kostl || 'N/A',
                orderTypeText: item.Auart === 'PM01' ? 'Preventive Maintenance' : 
                             item.Auart === 'PM02' ? 'Breakdown Maintenance' : 'Other'
            }));
        }

        return res.status(200).json({
            workOrders: finalData?.results || [],
            count: finalData?.results?.length || 0
        });

    } catch (error) {
        console.error('Work Orders Error:', error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to retrieve work orders',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};

// Update the exports
module.exports = {
    login,
    logout,
    plantList,
    notifications,
    workOrders
};