const axios = require('axios');
const https = require('https');
const jwt = require("jsonwebtoken");

const agent = new https.Agent({ rejectUnauthorized: false });
const AUTH_HEADER = `Basic SzkwMTQ5NjpIYWxpdGhAMjAwNA==`;

const login = async (req, res) => {
    const { vendorId, password } = req.body;
    const { JWT_SECRET_VENDOR } = process.env;

    if (!vendorId || !password) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID and password are required"
        });
    }

    try {
        // Get CSRF token
        const { headers } = await axios.get("https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_LOGIN_SRV", {
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
        const { data } = await axios.post(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_LOGIN_SRV/ZMM_VENDOR_LOGIN_ESet`, {
            VENDOR_ID: vendorId,
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
            const token = jwt.sign({ vendorId }, JWT_SECRET_VENDOR, { expiresIn: '3d' });

            res.cookie('authToken_vendor', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'Strict',
                maxAge: 3 * 24 * 60 * 60 * 1000 // 3days
            });

            return res.status(200).send({
                isAuthenticated: result?.STATUS,
                message: result?.MESSAGE
            });
        } else {
            return res.status(401).send({
                isAuthenticated: result?.STATUS,
                message: result?.MESSAGE || 'Login failed'
            });
        }
    } catch (error) {
        console.error('Login Error:', error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Vendor login failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};
const logout = async (req, res) => {
    res.clearCookie('authToken_vendor', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });
    res.status(200).send({
        isAuthenticated: 0,
        message: 'Logged out successfully'
    });
};
const profile = async (req, res) => {
    const vendorId = req.vendorId;
    console.log(vendorId);


    if (!vendorId) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID is required"
        });
    }

    try {
        // Profile request
        const { data } = await axios.get(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_PROFILE_SRV/ZMM_VENDOR_PROFILE_ESet('${vendorId}')`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const profile = data?.d;
        if (profile && profile.__metadata) {
            delete profile.__metadata;
        }

        return res.status(200).json({
            profileData: profile
        });

    } catch (error) {
        console.error('Profile Error:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Vendor profile retrieval failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};

// Dasboard
const rfq = async (req, res) => {
    const vendorId = req.vendorId;

    if (!vendorId) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID is required"
        });
    }

    try {
        const { data } = await axios.get(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_RFQ_SRV/ZMM_VENDOR_RFQ_ESet?$filter=Lifnr eq '${vendorId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Remove __metadata from each result
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => {
                const { __metadata, ...rest } = item;
                return rest;
            });
        }

        return res.status(200).json({
            rfqData: finalData?.results
        });

    } catch (error) {
        console.error('RFQ Error:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Vendor RFQ retrieval failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};
const po = async (req, res) => {
    const vendorId = req.vendorId;

    if (!vendorId) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID is required"
        });
    }

    try {
        const { data } = await axios.get(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_PO_SRV_02/ZMM_VENDOR_PO_ESet?$filter=Lifnr eq '${vendorId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Remove __metadata from each result
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => {
                const { __metadata, ...rest } = item;
                return rest;
            });
        }

        return res.status(200).json({
            poData: finalData?.results
        });

    } catch (error) {
        console.error('PO Error:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Vendor PO retrieval failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};
const gr = async (req, res) => {
    const vendorId = req.vendorId;

    if (!vendorId) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID is required"
        });
    }

    try {
        const { data } = await axios.get(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_GR_SRV/ZMM_VENDOR_GR_ESet?$filter=Lifnr eq '${vendorId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Remove __metadata from each result
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => {
                const { __metadata, ...rest } = item;
                return rest;
            });
        }

        return res.status(200).json({
            grData: finalData?.results
        });

    } catch (error) {
        console.error('GR Error:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Vendor GR retrieval failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};

// Financial Sheet
const invoice = async (req, res) => {
    const vendorId  = req.vendorId;

    
    if (!vendorId) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID is not found"
        });
    }

    try {
        const { data } = await axios.get(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_INVOICE_SRV/ZMM_VENDOR_INVOICE_ESet?$filter=Lifnr eq '${vendorId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Remove __metadata from each result
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => {
                const { __metadata, ...rest } = item;
                return rest;
            });
        }

        return res.status(200).json({
            invoiceData: finalData?.results
        });

    } catch (error) {
        console.error('Invoice Error:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Vendor Invoice retrieval failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};
const invoicePdF = async (req, res) => {
    const vendorId  = req.vendorId;
    const { belnr } = req.params;

    if (!vendorId || !belnr) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID and BELNR are required"
        });
    }
    
    try {
        const response = await axios.get(
            `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_INVOICE_PDF_SRV/ZMM_VENDOR_INVOICE_PDF_ESet(BELNR='${belnr}',LIFNR='${vendorId}')/$value`,
            {
                responseType: 'arraybuffer',
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Accept': 'application/pdf'
                },
                httpsAgent: agent,
            }
        );

        // Set PDF response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice_${belnr}.pdf"`);
        
        // Send the PDF data
        return res.send(response.data);

    } catch (error) {
        console.error('Invoice PDF Error:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to retrieve invoice PDF',
            error: error.response?.data 
                ? Buffer.from(error.response.data).toString()
                : error.message
        });
    }
};
const pay_aging = async (req, res) => {
     const vendorId  = req.vendorId;

    if (!vendorId) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID is required"
        });
    }

    try {
        const { data } = await axios.get(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_PAY_AGING_SRV/ZMM_VENDOR_AGING_PM_ESet?$filter=Lifnr eq '${vendorId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Remove __metadata from each result
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => {
                const { __metadata, ...rest } = item;
                return rest;
            });
        }

        return res.status(200).json({
            payAgingData: finalData?.results
        });

    } catch (error) {
        console.error('Payments/Aging Error:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Vendor Payments/Aging retrieval failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};
const memo_cd = async (req, res) => {
    const vendorId  = req.vendorId;

    if (!vendorId) {
        return res.status(400).json({
            success: false,
            message: "Vendor ID is required"
        });
    }

    try {
        const { data } = await axios.get(`https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZMM_VENDOR_PORTAL_MEMO_CD_SRV/ZMM_VENDOR_MEMO_CD_ESet?$filter=Lifnr eq '${vendorId}'`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'Content-Type': 'application/json',
                },
                httpsAgent: agent,
            }
        );

        const finalData = data?.d;

        // Remove __metadata from each result
        if (finalData && Array.isArray(finalData.results)) {
            finalData.results = finalData.results.map(item => {
                const { __metadata, ...rest } = item;
                return rest;
            });
        }

        return res.status(200).json({
            memoCdData: finalData?.results
        });

    } catch (error) {
        console.error('CREDIT/ DEBIT Memo Error:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Vendor CREDIT/ DEBIT Memo retrieval failed',
            error: error.response?.data?.error?.message?.value || error.message
        });
    }
};



module.exports = { login, profile, rfq, po, gr, pay_aging, memo_cd, invoice, invoicePdF, logout };