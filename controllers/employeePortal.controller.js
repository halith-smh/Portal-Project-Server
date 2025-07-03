const axios = require('axios');
const xml2js = require('xml2js');
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");


const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mohamedhalith.smh@gmail.com',
            pass: 'ffrb cbqh uzyg utvr'
        }
    });
};

const login = async (req, res) => {
    const { employeeId, password } = req.body;
    const { JWT_SECRET_EMPLOYEE } = process.env;

    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            message: "Employee ID and password are required"
        });
    }

    // Construct SOAP XML payload
    const soapEnvelope = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
            <soap:Header/>
            <soap:Body>
                <urn:ZhrEmployeeLoginFm>
                    <EmployeeId>${employeeId}</EmployeeId>
                    <Password>${password}</Password>
                </urn:ZhrEmployeeLoginFm>
            </soap:Body>
        </soap:Envelope>
    `;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zhr_employee_login_sd?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'application/soap+xml;charset=UTF-8',
                },
                auth: {
                    username: process.env.SAP_USERNAME,
                    password: process.env.SAP_PASSWORD,
                },
            }
        );

        // Parse SOAP XML response
        xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to parse SOAP response' });
            }

            const responseBody = result['env:Envelope']?.['env:Body']?.['n0:ZhrEmployeeLoginFmResponse'];

            if (responseBody?.Message && responseBody?.Status) {
                if (responseBody.Status === '1') {
                    // Generate JWT token
                    const token = jwt.sign({ employeeId }, JWT_SECRET_EMPLOYEE, { expiresIn: '3d' });

                    // Set cookie
                    res.cookie('authToken_employee', token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'Strict',
                        maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
                    });

                    return res.status(200).json({
                        isAuthenticated: true,
                        message: responseBody.Message
                    });
                } else {
                    return res.status(401).json({
                        isAuthenticated: false,
                        message: responseBody.Message
                    });
                }
            } else {
                return res.status(400).json({ error: 'Invalid response structure from SAP server' });
            }
        });
    } catch (error) {
        console.error('SOAP Error:', error.message);
        return res.status(500).json({ error: 'SOAP Request failed', details: error.message });
    }
};
const logout = async (req, res) => {
    res.clearCookie('authToken_employee', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });
    res.status(200).json({
        message: 'Logged out successfully'
    });
};


const profile = async (req, res) => {
    const employeeId = req.employeeId;

    if (!employeeId) {
        return res.status(400).json({
            success: false,
            message: "Employee ID is required"
        });
    }

    const soapEnvelope = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
            <soap:Header/>
            <soap:Body>
                <urn:ZhrEmployeeProfileFm>
                    <EmployeeId>${employeeId}</EmployeeId>
                </urn:ZhrEmployeeProfileFm>
            </soap:Body>
        </soap:Envelope>
    `;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zhr_employee_profile_sd?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'application/soap+xml;charset=UTF-8',
                },
                auth: {
                    username: process.env.SAP_USERNAME,
                    password: process.env.SAP_PASSWORD,
                },
            }
        );

        // Parse SOAP XML response
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const profileData = result['env:Envelope']?.['env:Body']?.['n0:ZhrEmployeeProfileFmResponse']?.ProfileData;

        if (profileData) {
            return res.status(200).json({
                profileData
            });
        } else {
            return res.status(404).json({
                message: 'Profile data not found'
            });
        }
    } catch (error) {
        console.error('Profile Error:', error.message);
        return res.status(500).json({
            message: 'Error fetching employee profile',
            error: error.response?.data || error.message
        });
    }
};
const leaveData = async (req, res) => {
    const employeeId = req.employeeId;

    if (!employeeId) {
        return res.status(400).json({
            success: false,
            message: "Employee ID is required"
        });
    }

    const soapEnvelope = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
            <soap:Header/>
            <soap:Body>
                <urn:ZhrEmployeeLeaveFm>
                    <EmployeeId>${employeeId}</EmployeeId>
                </urn:ZhrEmployeeLeaveFm>
            </soap:Body>
        </soap:Envelope>
    `;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zhr_employee_leave_sd?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'application/soap+xml;charset=UTF-8',
                },
                auth: {
                    username: process.env.SAP_USERNAME,
                    password: process.env.SAP_PASSWORD,
                },
            }
        );

        // Parse SOAP XML response
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const leaveResponse = result['env:Envelope']?.['env:Body']?.['n0:ZhrEmployeeLeaveFmResponse'];

        if (leaveResponse) {
            const formattedResponse = {
                totalDays: leaveResponse.Days,
                totalHours: leaveResponse.Hours,
                leaveTaken: leaveResponse.LeaveTaken,
                totalQuota: leaveResponse.TotalQuota,
                leaveHistory: Array.isArray(leaveResponse.LeaveData?.item)
                    ? leaveResponse.LeaveData.item
                    : [leaveResponse.LeaveData?.item],
                quotaDetails: Array.isArray(leaveResponse.Quotas?.item)
                    ? leaveResponse.Quotas.item
                    : [leaveResponse.Quotas?.item]
            };

            return res.status(200).json({
                leaveData: formattedResponse
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Leave data not found'
            });
        }
    } catch (error) {
        console.error('Leave Data Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error fetching leave data',
            error: error.response?.data || error.message
        });
    }
};
const payrollData = async (req, res) => {
    const employeeId = req.employeeId;

    if (!employeeId) {
        return res.status(400).json({
            success: false,
            message: "Employee ID is required"
        });
    }

    const soapEnvelope = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
            <soap:Header/>
            <soap:Body>
                <urn:ZhrEmployeePayRollFm>
                    <EmployeeId>${employeeId}</EmployeeId>
                </urn:ZhrEmployeePayRollFm>
            </soap:Body>
        </soap:Envelope>
    `;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zhr_employee_pay_roll_sd?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'application/soap+xml;charset=UTF-8',
                },
                auth: {
                    username: process.env.SAP_USERNAME,
                    password: process.env.SAP_PASSWORD,
                },
            }
        );

        // Parse SOAP XML response
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const payrollInfo = result['env:Envelope']?.['env:Body']?.['n0:ZhrEmployeePayRollFmResponse']?.PayrollData;

        if (payrollInfo) {
            const formattedPayroll = {
                employeeId: payrollInfo.Pernr,
                costCenter: payrollInfo.Costcenter,
                paymentDetails: {
                    type: payrollInfo.Paytype,
                    area: payrollInfo.Payarea,
                    group: payrollInfo.Paygroup,
                    level: payrollInfo.Paylevel,
                    wageType: payrollInfo.Wagetype
                },
                salary: {
                    monthly: parseFloat(payrollInfo.Salary),
                    annual: parseFloat(payrollInfo.Annual),
                    currency: payrollInfo.Curr
                },
                workDetails: {
                    capacityPercentage: parseFloat(payrollInfo.Capacity),
                    workingHours: parseFloat(payrollInfo.Workhrs)
                },
                bankDetails: {
                    bankName: payrollInfo.BankName,
                    bankKey: payrollInfo.BankKey,
                    accountNumber: payrollInfo.AccNo
                }
            };

            return res.status(200).json({
                success: true,
                payrollData: formattedPayroll
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Payroll data not found'
            });
        }
    } catch (error) {
        console.error('Payroll Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error fetching payroll data',
            error: error.response?.data || error.message
        });
    }
};
const payslipData = async (req, res) => {
    const employeeId = req.employeeId;

    if (!employeeId) {
        return res.status(400).json({
            success: false,
            message: "Employee ID is required"
        });
    }

    const soapEnvelope = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
            <soap:Header/>
            <soap:Body>
                <urn:ZhrEmployeePaySlipFm>
                    <EmployeeId>${employeeId}</EmployeeId>
                </urn:ZhrEmployeePaySlipFm>
            </soap:Body>
        </soap:Envelope>
    `;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zhr_employee_pay_slip_sd?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'application/soap+xml;charset=UTF-8',
                },
                auth: {
                    username: process.env.SAP_USERNAME,
                    password: process.env.SAP_PASSWORD,
                },
            }
        );

        // Parse SOAP XML response
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const payslipPdf = result['env:Envelope']?.['env:Body']?.['n0:ZhrEmployeePaySlipFmResponse']?.PayslipPdf;

        if (payslipPdf) {
            // Convert base64 to buffer
            const pdfBuffer = Buffer.from(payslipPdf, 'base64');

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=payslip.pdf');

            // Send the PDF
            return res.send(pdfBuffer);
        } else {
            return res.status(404).json({
                success: false,
                message: 'Payslip not found'
            });
        }
    } catch (error) {
        console.error('Payslip Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error fetching payslip',
            error: error.response?.data || error.message
        });
    }
};



const emailPayslip = async (req, res) => {
    const employeeId = req.employeeId; // from JWT middleware
    const { email } = req.body;

    console.log(employeeId, email);
    

    if (!employeeId) {
        return res.status(400).json({
            success: false,
            message: "Employee ID is required"
        });
    }

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email address is required"
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format"
        });
    }

    const soapEnvelope = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                      xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
            <soap:Header/>
            <soap:Body>
                <urn:ZhrEmployeePaySlipFm>
                    <EmployeeId>${employeeId}</EmployeeId>
                </urn:ZhrEmployeePaySlipFm>
            </soap:Body>
        </soap:Envelope>
    `;

    try {
        // First, get the payslip data from SAP
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zhr_employee_pay_slip_sd?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'application/soap+xml;charset=UTF-8',
                },
                auth: {
                    username: process.env.SAP_USERNAME,
                    password: process.env.SAP_PASSWORD,
                },
            }
        );

        // Parse SOAP XML response
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const payslipPdf = result['env:Envelope']?.['env:Body']?.['n0:ZhrEmployeePaySlipFmResponse']?.PayslipPdf;

        if (!payslipPdf) {
            return res.status(404).json({
                success: false,
                message: 'Payslip not found'
            });
        }

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(payslipPdf, 'base64');

        // Create email transporter
        const transporter = createTransporter();

        // Email options
        const currentDate = new Date().toLocaleDateString();
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: `Payslip - ${currentDate}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Payslip</h2>
                    <p>Hi here,</p>
                    <p>Please find your payslip attached for your records.</p>
                    <p>If you have any questions regarding your payslip, please contact the HR department.</p>
                    <br>
                    <p>Best regards,<br>
                    HR Department</p>
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #666;">
                        This is an automated email. Please do not reply to this message.
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename: `payslip_${employeeId}_${currentDate.replace(/\//g, '-')}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: `Payslip sent successfully to ${email}`
        });

    } catch (error) {
        console.error('Email Payslip Error:', error.message);

        if (error.code === 'EAUTH' || error.code === 'ECONNECTION') {
            return res.status(500).json({
                success: false,
                message: 'Email service configuration error. Please contact support.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error sending payslip email',
            error: error.message
        });
    }
};

module.exports = {
    login,
    logout,
    profile,
    leaveData,
    payrollData,
    payslipData,
    emailPayslip
};